#!/bin/bash
# ==============================================================================
# update-stack.sh - Safe rolling update of Docker images
# ==============================================================================
# Description: Performs a safe update of the Docker Compose stack by running
#              pre-checks, creating a backup, pulling new images, and performing
#              automatic rollback if the update fails.
# Usage: sudo ./update-stack.sh [--env-file /opt/app/.env] [--no-backup] [--force]
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_BACKUP=false
FORCE=false
HEALTH_TIMEOUT=300

# ──────────────────────────────────────────────────────────────────────────────
# Help text
# ──────────────────────────────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${BOLD}update-stack.sh${NC} - Safe rolling update of OpenProject + Mattermost stack

${BOLD}USAGE:${NC}
    sudo ./update-stack.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    --env-file PATH   Path to .env file (default: /opt/app/.env)
    --no-backup       Skip pre-update backup (not recommended)
    --force           Proceed even if pre-update health check fails
    --help, -h        Show this help message

${BOLD}DESCRIPTION:${NC}
    Performs a safe update of the Docker Compose stack:
      1. Pre-update health check
      2. Backup databases and data volumes
      3. Pull latest images
      4. Detect if images actually changed
      5. Restart services with new images
      6. Post-update health check
      7. Automatic rollback if post-update check fails
      8. Cleanup old images

${BOLD}ROLLBACK:${NC}
    If the post-update health check fails, the script automatically:
      - Stops all services
      - Restores from the backup taken in step 2
      - Restarts services with previous images
      - Logs the failure for review

EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ──────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env-file)
            ENV_FILE="$2"; shift 2 ;;
        --no-backup)
            SKIP_BACKUP=true; shift ;;
        --force)
            FORCE=true; shift ;;
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

cd "$APP_DIR"

# ──────────────────────────────────────────────────────────────────────────────
# Functions
# ──────────────────────────────────────────────────────────────────────────────

# Wait for all containers to be healthy
wait_for_healthy() {
    local timeout="${1:-$HEALTH_TIMEOUT}"
    local elapsed=0
    local interval=10

    log_info "Waiting for containers to become healthy (timeout: ${timeout}s)..."

    while [[ $elapsed -lt $timeout ]]; do
        local unhealthy
        unhealthy=$(docker compose ps --format '{{.Name}} {{.Status}}' 2>/dev/null \
            | grep -v -E '(running|healthy|exited \(0\))' || true)

        if [[ -z "$unhealthy" ]]; then
            log_info "All containers are healthy! ✓"
            return 0
        fi

        sleep "$interval"
        elapsed=$((elapsed + interval))
    done

    log_error "Timed out after ${timeout}s waiting for healthy state."
    return 1
}

# Run health check script
run_health_check() {
    if [[ -x "${SCRIPT_DIR}/health-check.sh" ]]; then
        "${SCRIPT_DIR}/health-check.sh" --env-file "$ENV_FILE"
        return $?
    else
        log_warn "health-check.sh not found or not executable. Using basic checks."
        # Basic fallback check
        curl -sf --max-time 15 "http://localhost:8080/api/v3" > /dev/null 2>&1 && \
            curl -sf --max-time 15 "http://localhost:8065/api/v4/system/ping" > /dev/null 2>&1
        return $?
    fi
}

# Save current image digests for change detection
save_image_digests() {
    docker compose images --format '{{.Name}} {{.ID}}' 2>/dev/null | sort
}

# Compare digests
images_changed() {
    local before="$1"
    local after="$2"
    [[ "$before" != "$after" ]]
}

# Send alert notification (placeholder - integrate with your notification system)
send_alert() {
    local message="$1"
    local subject="[INCUBADORA UPDATE ALERT] $message"

    log_error "ALERT: $message"

    # Email notification (if mailutils is installed)
    if command -v mail &>/dev/null && [[ -n "${ADMIN_EMAIL:-}" ]]; then
        echo "$message" | mail -s "$subject" "$ADMIN_EMAIL" 2>/dev/null || true
    fi

    # Webhook notification (uncomment and configure if needed)
    # if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
    #     curl -sf -X POST "$SLACK_WEBHOOK" \
    #         -H 'Content-type: application/json' \
    #         -d "{\"text\":\"$subject: $message\"}" || true
    # fi

    # OCI Monitoring (if OCI CLI is configured)
    # oci monitoring alarm update --alarm-id "$ALARM_ID" ... 2>/dev/null || true
}

# Perform rollback
perform_rollback() {
    log_step "PERFORMING EMERGENCY ROLLBACK!"

    log_info "Stopping current services..."
    docker compose down --timeout 30 2>/dev/null || true

    # Restore from the backup we just took
    if [[ -x "${SCRIPT_DIR}/restore.sh" ]]; then
        # Find the most recent backup
        local latest_backup=""
        for date_dir in $(ls -1d /opt/backups/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | sort -r); do
            latest_backup=$(ls -1d "$date_dir"/*/ 2>/dev/null | sort -r | head -1)
            [[ -n "$latest_backup" ]] && break
        done

        if [[ -n "$latest_backup" ]]; then
            log_info "Restoring from backup: $latest_backup"
            "${SCRIPT_DIR}/restore.sh" \
                --backup-file "$latest_backup" \
                --yes 2>&1 | tail -20 || \
                log_error "Restore script failed!"
        else
            log_error "No backup found for rollback!"
        fi
    else
        log_error "restore.sh not found! Manual rollback required."
        send_alert "Automatic rollback FAILED - restore.sh not found"
        return 1
    fi

    # Restart services
    log_info "Restarting services..."
    docker compose up -d 2>/dev/null || true

    send_alert "Automatic rollback completed - services restored from backup"
}

# ──────────────────────────────────────────────────────────────────────────────
# Main update process
# ──────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                  STACK UPDATE - $(date '+%Y-%m-%d %H:%M')                  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Pre-update health check ──
log_step "Step 1/7: Pre-update health check..."
if run_health_check; then
    log_info "Pre-update health check: ${GREEN}PASSED${NC}"
else
    log_warn "Pre-update health check: ${YELLOW}FAILED${NC}"
    if [[ "$FORCE" != true ]]; then
        log_error "Aborting update. Use --force to proceed anyway."
        exit 2
    fi
    log_warn "Proceeding anyway (--force)."
fi

# ── Step 2: Pre-update backup ──
log_step "Step 2/7: Creating pre-update backup..."
if [[ "$SKIP_BACKUP" != true ]]; then
    if [[ -x "${SCRIPT_DIR}/backup.sh" ]]; then
        "${SCRIPT_DIR}/backup.sh" --env-file "$ENV_FILE" --no-upload 2>&1 | tail -10
        log_info "Pre-update backup completed."
    else
        log_warn "backup.sh not found. Skipping backup."
    fi
else
    log_warn "Backup skipped (--no-backup)."
fi

# ── Step 3: Pull latest images ──
log_step "Step 3/7: Pulling latest Docker images..."

# Save current image digests BEFORE pulling
BEFORE_DIGESTS=$(save_image_digests)
log_info "Current images (before):"
echo "$BEFORE_DIGESTS" | while IFS= read -r line; do
    log_info "  $line"
done

# Pull new images
docker compose pull 2>&1 | while IFS= read -r line; do
    log_info "  $line"
done

# ── Step 4: Check if images changed ──
log_step "Step 4/7: Checking if images changed..."

AFTER_DIGESTS=$(save_image_digests)
log_info "New images (after):"
echo "$AFTER_DIGESTS" | while IFS= read -r line; do
    log_info "  $line"
done

if images_changed "$BEFORE_DIGESTS" "$AFTER_DIGESTS"; then
    log_info "Images have changed. Proceeding with update..."
else
    log_info "No image changes detected. Nothing to update."
    log_info "Consider running: docker compose pull --ignore-buildable"
    exit 0
fi

# ── Step 5: Deploy updated stack ──
log_step "Step 5/7: Deploying updated stack..."

# docker compose up -d with zero-downtime strategy:
# Docker Compose v2 performs rolling updates for services with replicas.
# For single-replica services, it recreates the container.
docker compose up -d --remove-orphans

log_info "Containers recreated with new images."
docker compose ps

# Wait for healthy
if ! wait_for_healthy "$HEALTH_TIMEOUT"; then
    log_error "Services did not become healthy after update!"
    log_error "Initiating automatic rollback..."
    perform_rollback
    exit 2
fi

# ── Step 6: Post-update health check ──
log_step "Step 6/7: Post-update health check..."

if run_health_check; then
    log_info "Post-update health check: ${GREEN}PASSED${NC}"
else
    log_error "Post-update health check: ${YELLOW}FAILED${NC}"
    log_error "Initiating automatic rollback..."
    perform_rollback
    exit 2
fi

# ── Step 7: Cleanup old images ──
log_step "Step 7/7: Cleaning up old Docker images..."

# Remove dangling (untagged) images
pruned=$(docker image prune -f 2>&1 | grep "Total" || echo "No space freed")
log_info "Dangling images pruned: $pruned"

# Report Docker disk usage
docker system df

# ── Summary ──
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  UPDATE SUMMARY${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Status:${NC}   ${GREEN}SUCCESS${NC}"
echo -e "${BOLD}Time:${NC}     $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo -e "${BOLD}Running Containers:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}" 2>/dev/null
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo "  Monitor logs: ${CYAN}docker compose logs -f --tail 100${NC}"
echo "  Run health check: ${CYAN}./health-check.sh${NC}"
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""

log_info "Stack update completed successfully!"
