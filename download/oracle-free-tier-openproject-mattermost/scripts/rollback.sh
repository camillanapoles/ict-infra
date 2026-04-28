#!/bin/bash
# ==============================================================================
# rollback.sh - Rollback to previous version of the stack
# ==============================================================================
# Description: Rolls back the Docker Compose stack to a previous known-good
#              state. Finds the latest backup, restores databases and volumes,
#              pulls the previous image tags from backup metadata, and verifies
#              health before completing.
# Usage: sudo ./rollback.sh [--env-file /opt/app/.env] [--backup PATH] [--yes]
# ==============================================================================
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Color-coded logging functions
# ──────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" >&2; }
log_step()  { echo -e "${BLUE}${BOLD}[STEP]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $*"; }

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────
APP_DIR="/opt/app"
ENV_FILE="${APP_DIR}/.env"
BACKUP_DIR="/opt/backups"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECIFIC_BACKUP=""
CONFIRMED=false
HEALTH_TIMEOUT=300

# ──────────────────────────────────────────────────────────────────────────────
# Help text
# ──────────────────────────────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${BOLD}rollback.sh${NC} - Rollback to previous known-good version

${BOLD}USAGE:${NC}
    sudo ./rollback.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    --backup PATH   Specific backup directory to restore from
                    (default: most recent backup)
    --env-file PATH Path to .env file (default: /opt/app/.env)
    --yes, -y       Skip confirmation prompt
    --help, -h      Show this help message

${BOLD}DESCRIPTION:${NC}
    Rolls back the entire stack to a previous known-good state:

    1. Finds the most recent backup (or uses --backup)
    2. Reads backup metadata for previous image tags
    3. Stops all running services
    4. Restores PostgreSQL databases from backup
    5. Restores Docker data volumes from backup
    6. Optionally pins images to previous tags from metadata
    7. Restarts services with restored data/images
    8. Verifies health of all services
    9. Sends notification of rollback completion

${BOLD}WHEN TO USE:${NC}
    - After a failed update (update-stack.sh should auto-rollback)
    - After manual configuration changes that broke services
    - After data corruption that needs recovery
    - As a safety measure before trying risky changes

${BOLD}IMPORTANT:${NC}
    This is a DESTRUCTIVE operation. All current data will be replaced
    with data from the backup point. Ensure you have a recent backup
    of the CURRENT state before rolling back.

${BOLD}EXAMPLES:${NC}
    # Rollback to most recent backup
    sudo ./rollback.sh

    # Rollback to specific backup
    sudo ./rollback.sh --backup /opt/backups/2025-01-15/120000

EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ──────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --backup)
            SPECIFIC_BACKUP="$2"; shift 2 ;;
        --env-file)
            ENV_FILE="$2"; shift 2 ;;
        --yes|-y)
            CONFIRMED=true; shift ;;
        --help|-h)
            show_help; exit 0 ;;
        *)
            log_error "Unknown argument: $1"
            show_help; exit 1 ;;
    esac
done

# Source environment
if [[ -f "$ENV_FILE" ]]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# ──────────────────────────────────────────────────────────────────────────────
# Functions
# ──────────────────────────────────────────────────────────────────────────────

# Find the most recent backup directory
find_latest_backup() {
    log_info "Searching for available backups in $BACKUP_DIR..."

    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_error "Backup directory not found: $BACKUP_DIR"
        return 1
    fi

    local latest=""

    # Search date folders in reverse chronological order
    for date_dir in $(ls -1d "$BACKUP_DIR"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | sort -r); do
        # Find the most recent timestamp within each date
        for ts_dir in $(ls -1d "$date_dir"/*/ 2>/dev/null | sort -r); do
            # Verify it has backup content
            if ls "$ts_dir"/*.sql.gz "$ts_dir"/*.tar.gz >/dev/null 2>&1; then
                latest="$ts_dir"
                break 2
            fi
        done
    done

    if [[ -z "$latest" ]]; then
        log_error "No valid backups found in $BACKUP_DIR"
        return 1
    fi

    echo "$latest"
}

# List recent backups for selection
list_recent_backups() {
    echo -e "${BOLD}Available backups (most recent first):${NC}"
    echo ""

    local count=0
    for date_dir in $(ls -1d "$BACKUP_DIR"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | sort -r); do
        for ts_dir in $(ls -1d "$date_dir"/*/ 2>/dev/null | sort -r); do
            count=$((count + 1))
            local size
            size=$(du -sh "$ts_dir" 2>/dev/null | cut -f1)

            # Extract metadata if available
            local meta_info=""
            local meta_file="$ts_dir/backup_metadata.json"
            if [[ -f "$meta_file" ]]; then
                local images
                images=$(jq -r '.docker_images // [] | join(", ")' "$meta_file" 2>/dev/null | head -c 60)
                [[ -n "$images" ]] && meta_info=" │ ${images}..."
            fi

            echo -e "  ${CYAN}[$count]${NC} $ts_dir  ($size)${meta_info}"

            # Show top 10 only
            if [[ $count -ge 10 ]]; then
                echo -e "  ${YELLOW}... and more backups in $BACKUP_DIR${NC}"
                break 2
            fi
        done
    done

    echo ""
}

# Read image tags from backup metadata
read_backup_images() {
    local backup_dir="$1"
    local meta_file="$backup_dir/backup_metadata.json"

    if [[ ! -f "$meta_file" ]]; then
        log_warn "No backup metadata found. Cannot determine previous image tags."
        echo ""
        return
    fi

    jq -r '.docker_images // [] | .[]' "$meta_file" 2>/dev/null || echo ""
}

# Wait for all containers to be healthy
wait_for_healthy() {
    local timeout="${1:-$HEALTH_TIMEOUT}"
    local elapsed=0
    local interval=10

    log_info "Waiting for containers to become healthy (timeout: ${timeout}s)..."

    while [[ $elapsed -lt $timeout ]]; do
        local unhealthy
        unhealthy=$(docker compose -f "${APP_DIR}/docker-compose.yml" ps \
            --format '{{.Name}} {{.Status}}' 2>/dev/null \
            | grep -v -E '(running|healthy|exited \(0\))' || true)

        if [[ -z "$unhealthy" ]]; then
            log_info "All containers are healthy! ✓"
            return 0
        fi

        sleep "$interval"
        elapsed=$((elapsed + interval))
    done

    log_error "Timed out waiting for healthy state."
    return 1
}

# Send rollback notification
send_rollback_notification() {
    local status="$1"
    local message="$2"
    local subject="[ROLLBACK ${status}] OpenProject+Mattermost - $(date '+%Y-%m-%d %H:%M')"

    log_info "Notification: $subject - $message"

    # Email notification
    if command -v mail &>/dev/null && [[ -n "${ADMIN_EMAIL:-}" ]]; then
        echo "$message" | mail -s "$subject" "$ADMIN_EMAIL" 2>/dev/null || true
    fi

    # Webhook notification (uncomment and configure)
    # if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
    #     curl -sf -X POST "$SLACK_WEBHOOK" \
    #         -H 'Content-type: application/json' \
    #         -d "{\"text\":\"$subject\\n$message\"}" || true
    # fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Main rollback process
# ──────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${RED}${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}${BOLD}║                   ROLLBACK - $(date '+%Y-%m-%d %H:%M')                     ║${NC}"
echo -e "${RED}${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Determine backup source ──
log_step "Step 1/7: Finding backup to restore from..."

if [[ -n "$SPECIFIC_BACKUP" ]]; then
    if [[ -d "$SPECIFIC_BACKUP" ]]; then
        ROLLBACK_SOURCE="$SPECIFIC_BACKUP"
        log_info "Using specified backup: $ROLLBACK_SOURCE"
    else
        log_error "Specified backup not found: $SPECIFIC_BACKUP"
        list_recent_backups
        exit 1
    fi
else
    ROLLBACK_SOURCE=$(find_latest_backup)
    if [[ -z "$ROLLBACK_SOURCE" ]]; then
        exit 1
    fi
    log_info "Using most recent backup: $ROLLBACK_SOURCE"
fi

# Show backup details
if [[ -f "${ROLLBACK_SOURCE}/backup_metadata.json" ]]; then
    log_info "Backup metadata:"
    jq '.' "${ROLLBACK_SOURCE}/backup_metadata.json" 2>/dev/null | while IFS= read -r line; do
        log_info "  $line"
    done
fi

log_info "Backup contents:"
ls -lh "$ROLLBACK_SOURCE" 2>/dev/null | awk 'NR>1{print "  " $NF " (" $5 ")"}'

# ── Step 2: Read previous image information ──
log_step "Step 2/7: Reading previous image information..."

PREVIOUS_IMAGES=$(read_backup_images "$ROLLBACK_SOURCE")
if [[ -n "$PREVIOUS_IMAGES" ]]; then
    log_info "Previous images from backup metadata:"
    echo "$PREVIOUS_IMAGES" | while IFS= read -r img; do
        [[ -n "$img" ]] && log_info "  $img"
    done
else
    log_warn "No image information in metadata. Current images will be used."
fi

# ── Step 3: Confirmation ──
log_step "Step 3/7: Confirmation..."

if [[ "$CONFIRMED" != true ]]; then
    echo ""
    echo -e "${RED}${BOLD}WARNING: This will STOP all services and replace ALL data with backup!${NC}"
    echo ""
    echo -e "  Backup source: ${YELLOW}${ROLLBACK_SOURCE}${NC}"
    echo -e "  Current time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo -e "${BOLD}What will happen:${NC}"
    echo "  1. All Docker containers will be stopped"
    echo "  2. PostgreSQL databases will be restored from backup"
    echo "  3. Data volumes will be restored from backup"
    echo "  4. Nginx configs and SSL certs will be restored"
    echo "  5. Services will be restarted"
    echo ""
    echo -e "${RED}${BOLD}All changes made since the backup will be LOST!${NC}"
    echo ""
    read -rp "Type 'ROLLBACK' to confirm: " confirmation

    if [[ "$confirmation" != "ROLLBACK" ]]; then
        log_info "Rollback cancelled by user."
        exit 0
    fi
fi

# ── Step 4: Create emergency backup of current state ──
log_step "Step 4/7: Creating emergency backup of current state..."

EMERGENCY_BACKUP="${BACKUP_DIR}/$(date +%Y-%m-%d)/pre-rollback_$(date +%H%M%S)"
mkdir -p "$EMERGENCY_BACKUP"

if [[ -f "${APP_DIR}/docker-compose.yml" ]]; then
    cp "${APP_DIR}/docker-compose.yml" "$EMERGENCY_BACKUP/"
fi
if [[ -f "$ENV_FILE" ]]; then
    cp "$ENV_FILE" "$EMERGENCY_BACKUP/"
    chmod 600 "$EMERGENCY_BACKUP/.env"
fi

# Quick database backup (just in case)
PG_CONTAINER=$(docker ps --filter "name=postgres" --format '{{.Names}}' | head -1 || echo "")
if [[ -n "$PG_CONTAINER" ]]; then
    local_db="${POSTGRES_DB_OPENPROJECT:-openproject}"
    mm_db="${POSTGRES_DB_MATTERMOST:-mattermost}"
    docker exec "$PG_CONTAINER" pg_dump -U "${POSTGRES_USER:-postgres}" "$local_db" \
        | gzip > "$EMERGENCY_BACKUP/openproject_pre-rollback.sql.gz" 2>/dev/null || true
    docker exec "$PG_CONTAINER" pg_dump -U "${POSTGRES_USER:-postgres}" "$mm_db" \
        | gzip > "$EMERGENCY_BACKUP/mattermost_pre-rollback.sql.gz" 2>/dev/null || true
fi

log_info "Emergency backup created: $EMERGENCY_BACKUP"

# ── Step 5: Stop services ──
log_step "Step 5/7: Stopping all services..."

cd "$APP_DIR"
docker compose down --timeout 30 2>/dev/null || true
log_info "All services stopped."

# ── Step 6: Restore from backup ──
log_step "Step 6/7: Restoring from backup..."

# Use restore.sh for the actual restoration
if [[ -x "${SCRIPT_DIR}/restore.sh" ]]; then
    if "${SCRIPT_DIR}/restore.sh" --backup-file "$ROLLBACK_SOURCE" --yes; then
        log_info "Restore completed successfully."
    else
        log_error "Restore script failed!"
        send_rollback_notification "FAILED" "Restore from $ROLLBACK_SOURCE failed. Emergency backup at $EMERGENCY_BACKUP"
        exit 2
    fi
else
    log_error "restore.sh not found at ${SCRIPT_DIR}/restore.sh"
    log_error "Cannot continue. Manual restoration required."
    send_rollback_notification "FAILED" "restore.sh not found. Manual intervention required."
    exit 2
fi

# ── Step 7: Verify health ──
log_step "Step 7/7: Verifying service health..."

if wait_for_healthy "$HEALTH_TIMEOUT"; then
    log_info "All services are healthy after rollback! ✓"

    # Run comprehensive health check
    if [[ -x "${SCRIPT_DIR}/health-check.sh" ]]; then
        log_info "Running comprehensive health check..."
        "${SCRIPT_DIR}/health-check.sh" --env-file "$ENV_FILE" || \
            log_warn "Health check reported some issues (may need attention)."
    fi

    ROLLBACK_STATUS="SUCCESS"
else
    log_error "Services did not become healthy after rollback!"
    ROLLBACK_STATUS="DEGRADED"
    log_warn "Check logs: docker compose logs"
fi

# ── Send notification ──
send_rollback_notification "$ROLLBACK_STATUS" \
    "Rolled back to $ROLLBACK_SOURCE. Status: $ROLLBACK_STATUS. Emergency backup at: $EMERGENCY_BACKUP"

# ── Summary ──
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ROLLBACK SUMMARY${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Status:${NC}     ${GREEN}${ROLLBACK_STATUS}${NC}"
echo -e "${BOLD}Timestamp:${NC}  $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${BOLD}Rolled back to:${NC}"
echo "  $ROLLBACK_SOURCE"
echo ""
echo -e "${BOLD}Emergency backup of pre-rollback state:${NC}"
echo "  $EMERGENCY_BACKUP"
echo ""
echo -e "${BOLD}Current container status:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}" 2>/dev/null || \
    docker compose ps
echo ""
echo -e "${BOLD}If rollback failed:${NC}"
echo "  1. Check logs: ${CYAN}docker compose logs --tail 100${NC}"
echo "  2. Try restore.sh manually with the emergency backup"
echo "  3. Emergency backup location: $EMERGENCY_BACKUP"
echo ""
echo -e "${BOLD}Post-rollback steps:${NC}"
echo "  1. Verify application functionality"
echo "  2. Check that all data is intact"
echo "  3. Review what caused the need for rollback"
echo "  4. Consider running ${CYAN}./update-stack.sh${NC} when ready"
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""

log_info "Rollback completed with status: $ROLLBACK_STATUS"
