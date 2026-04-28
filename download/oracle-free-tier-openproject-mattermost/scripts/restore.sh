#!/bin/bash
# ==============================================================================
# restore.sh - Restore from backup for OpenProject + Mattermost
# ==============================================================================
# Description: Restores PostgreSQL databases, Docker volumes, configs, and
#              SSL certificates from a specified backup. Supports listing
#              available backups from local storage or OCI Object Storage.
# Usage: sudo ./restore.sh [--backup-date YYYY-MM-DD] [--backup-file PATH]
#                          [--list-available] [--from-oci]
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
BACKUP_DIR="/opt/backups"
APP_DIR="/opt/app"
ENV_FILE="${APP_DIR}/.env"
RESTORE_DIR=""
BACKUP_DATE=""
BACKUP_FILE=""
FROM_OCI=false
LIST_AVAILABLE=false
CONFIRMED=false

# ──────────────────────────────────────────────────────────────────────────────
# Help text
# ──────────────────────────────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${BOLD}restore.sh${NC} - Restore OpenProject + Mattermost from backup

${BOLD}USAGE:${NC}
    sudo ./restore.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    --backup-file PATH    Path to a specific backup file or directory
    --backup-date DATE    Restore from date (format: YYYY-MM-DD)
                          Uses the most recent timestamp for that date
    --from-oci            Download backup from OCI Object Storage
    --list-available      List all available backups and exit
    --yes, -y             Skip confirmation prompt (use with caution)
    --env-file PATH       Path to .env file (default: /opt/app/.env)
    --help, -h            Show this help message

${BOLD}EXAMPLES:${NC}
    # List available local backups
    sudo ./restore.sh --list-available

    # List available OCI backups
    sudo ./restore.sh --list-available --from-oci

    # Restore from a specific date
    sudo ./restore.sh --backup-date 2025-01-15

    # Restore from a specific backup directory
    sudo ./restore.sh --backup-file /opt/backups/2025-01-15/120000

    # Restore from OCI
    sudo ./restore.sh --backup-date 2025-01-15 --from-oci

${BOLD}WARNING:${NC}
    This will STOP all services and overwrite existing data. Make sure you
    have a current backup before restoring.

EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ──────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --backup-file)
            BACKUP_FILE="$2"; shift 2 ;;
        --backup-date)
            BACKUP_DATE="$2"; shift 2 ;;
        --from-oci)
            FROM_OCI=true; shift ;;
        --list-available)
            LIST_AVAILABLE=true; shift ;;
        --yes|-y)
            CONFIRMED=true; shift ;;
        --env-file)
            ENV_FILE="$2"; shift 2 ;;
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

# List available backups from local storage
list_local_backups() {
    echo -e "${BOLD}Available local backups:${NC}"
    echo ""

    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_warn "No backup directory found at $BACKUP_DIR"
        return 1
    fi

    local found=0
    for date_dir in $(ls -1d "$BACKUP_DIR"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | sort -r); do
        echo -e "${CYAN}$(basename "$date_dir")${NC}"
        for ts_dir in $(ls -1d "$date_dir"/*/ 2>/dev/null | sort -r); do
            local size
            size=$(du -sh "$ts_dir" 2>/dev/null | cut -f1)
            local meta_file="$ts_dir/backup_metadata.json"
            local info=""
            if [[ -f "$meta_file" ]]; then
                info=$(jq -r '.containers // [] | join(", ")' "$meta_file" 2>/dev/null || echo "")
            fi
            echo "  └─ $(basename "$ts_dir")  ($size)  ${info}"
            found=$((found + 1))
        done
    done

    if [[ $found -eq 0 ]]; then
        log_warn "No backups found."
    fi

    return 0
}

# List available backups from OCI Object Storage
list_oci_backups() {
    if ! command -v oci &>/dev/null; then
        log_error "OCI CLI not installed. Cannot list OCI backups."
        return 1
    fi

    local bucket="${OCI_BUCKET_NAME:-}"
    local namespace="${OCI_NAMESPACE:-}"

    if [[ -z "$bucket" || -z "$namespace" ]]; then
        log_error "OCI_BUCKET_NAME or OCI_NAMESPACE not set."
        return 1
    fi

    echo -e "${BOLD}Available OCI Object Storage backups:${NC}"
    echo ""

    oci os object list \
        --bucket-name "$bucket" \
        --namespace "$namespace" \
        --prefix "backups/" \
        --all \
        --output table \
        2>/dev/null || log_error "Failed to list OCI objects."
}

# Download backup from OCI
download_from_oci() {
    local backup_path="$1"
    local download_dir="$2"

    if ! command -v oci &>/dev/null; then
        log_error "OCI CLI not installed."
        exit 1
    fi

    local bucket="${OCI_BUCKET_NAME:-}"
    local namespace="${OCI_NAMESPACE:-}"

    if [[ -z "$bucket" || -z "$namespace" ]]; then
        log_error "OCI_BUCKET_NAME or OCI_NAMESPACE not set."
        exit 1
    fi

    log_info "Downloading backup from OCI: $backup_path"

    # List all objects under this backup path
    local objects
    objects=$(oci os object list \
        --bucket-name "$bucket" \
        --namespace "$namespace" \
        --prefix "$backup_path" \
        --all \
        --output json 2>/dev/null | jq -r '.data[].name' 2>/dev/null || echo "")

    if [[ -z "$objects" ]]; then
        log_error "No objects found at: $backup_path"
        exit 1
    fi

    mkdir -p "$download_dir"

    while IFS= read -r obj; do
        [[ -z "$obj" ]] && continue
        local obj_name
        obj_name=$(basename "$obj")
        log_info "  Downloading: $obj_name"
        oci os object get \
            --bucket-name "$bucket" \
            --namespace "$namespace" \
            --name "$obj" \
            --file "${download_dir}/${obj_name}" \
            --no-retry 2>&1 | tail -1
    done <<< "$objects"

    log_info "Download complete."
}

# Find the backup directory from a date
find_backup_by_date() {
    local date="$1"
    local date_dir="${BACKUP_DIR}/${date}"

    if [[ ! -d "$date_dir" ]]; then
        log_error "No backup found for date: $date"
        log_info "Available dates:"
        ls -1d "$BACKUP_DIR"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | \
            xargs -I{} basename {} || echo "  (none)"
        exit 1
    fi

    # Find the most recent timestamp subdirectory
    local latest
    latest=$(ls -1d "$date_dir"/*/ 2>/dev/null | sort -r | head -1)

    if [[ -z "$latest" ]]; then
        log_error "No backup timestamps found for date: $date"
        exit 1
    fi

    echo "$latest"
}

# Wait for containers to become healthy
wait_for_healthy() {
    local timeout="${1:-300}"
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

    log_error "Timed out waiting for containers to become healthy."
    return 1
}

# Verify data integrity after restore
verify_integrity() {
    local failures=0

    log_step "Verifying data integrity..."

    # Check OpenProject API
    log_info "Checking OpenProject API..."
    if curl -sf --max-time 30 "http://localhost:8080/api/v3" > /dev/null 2>&1; then
        log_info "  OpenProject API: ${GREEN}OK${NC}"
    else
        log_warn "  OpenProject API: ${YELLOW}NOT RESPONDING${NC} (may need initial setup)"
        failures=$((failures + 1))
    fi

    # Check Mattermost API
    log_info "Checking Mattermost API..."
    if curl -sf --max-time 30 "http://localhost:8065/api/v4/system/ping" > /dev/null 2>&1; then
        log_info "  Mattermost API: ${GREEN}OK${NC}"
    else
        log_warn "  Mattermost API: ${YELLOW}NOT RESPONDING${NC} (may need initial setup)"
        failures=$((failures + 1))
    fi

    # Check PostgreSQL
    log_info "Checking PostgreSQL..."
    PG_CONTAINER=$(docker ps --filter "name=postgres" --format '{{.Names}}' | head -1 || echo "")
    if [[ -n "$PG_CONTAINER" ]]; then
        if docker exec "$PG_CONTAINER" pg_isready -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; then
            log_info "  PostgreSQL: ${GREEN}OK${NC}"

            # Check database exists
            local_db="${POSTGRES_DB_OPENPROJECT:-openproject}"
            mm_db="${POSTGRES_DB_MATTERMOST:-mattermost}"
            docker exec "$PG_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "$local_db" && \
                log_info "  Database '${local_db}': ${GREEN}EXISTS${NC}" || \
                log_warn "  Database '${local_db}': ${YELLOW}NOT FOUND${NC}"

            docker exec "$PG_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "$mm_db" && \
                log_info "  Database '${mm_db}': ${GREEN}EXISTS${NC}" || \
                log_warn "  Database '${mm_db}': ${YELLOW}NOT FOUND${NC}"
        else
            log_warn "  PostgreSQL: ${YELLOW}NOT READY${NC}"
            failures=$((failures + 1))
        fi
    else
        log_warn "  PostgreSQL container: ${YELLOW}NOT FOUND${NC}"
        failures=$((failures + 1))
    fi

    return $failures
}

# ──────────────────────────────────────────────────────────────────────────────
# Main restore process
# ──────────────────────────────────────────────────────────────────────────────

# ── List mode ──
if [[ "$LIST_AVAILABLE" == true ]]; then
    if [[ "$FROM_OCI" == true ]]; then
        list_oci_backups
    else
        list_local_backups
    fi
    exit 0
fi

# ── Determine backup source ──
if [[ -n "$BACKUP_FILE" ]]; then
    if [[ "$FROM_OCI" == true ]]; then
        RESTORE_DIR="/tmp/restore_${TIMESTAMP:-$(date +%Y%m%d_%H%M%S)}"
        mkdir -p "$RESTORE_DIR"
        download_from_oci "$BACKUP_FILE" "$RESTORE_DIR"
    elif [[ -d "$BACKUP_FILE" ]]; then
        RESTORE_DIR="$BACKUP_FILE"
    elif [[ -f "$BACKUP_FILE" ]]; then
        # It's a file, extract it first
        RESTORE_DIR="/tmp/restore_${TIMESTAMP:-$(date +%Y%m%d_%H%M%S)}"
        mkdir -p "$RESTORE_DIR"
        log_info "Extracting backup file: $BACKUP_FILE"
        tar xzf "$BACKUP_FILE" -C "$RESTORE_DIR"
    else
        log_error "Backup path not found: $BACKUP_FILE"
        exit 1
    fi
elif [[ -n "$BACKUP_DATE" ]]; then
    if [[ "$FROM_OCI" == true ]]; then
        RESTORE_DIR="/tmp/restore_${TIMESTAMP:-$(date +%Y%m%d_%H%M%S)}"
        mkdir -p "$RESTORE_DIR"
        download_from_oci "backups/${BACKUP_DATE}" "$RESTORE_DIR"
    else
        RESTORE_DIR=$(find_backup_by_date "$BACKUP_DATE")
    fi
else
    log_error "You must specify either --backup-file, --backup-date, or --list-available."
    show_help
    exit 1
fi

if [[ ! -d "$RESTORE_DIR" || -z "$(ls -A "$RESTORE_DIR" 2>/dev/null)" ]]; then
    log_error "Restore directory is empty or does not exist: $RESTORE_DIR"
    exit 1
fi

log_info "Restore source: $RESTORE_DIR"

# ── Show what will be restored ──
log_info "Backup contents:"
ls -lh "$RESTORE_DIR" 2>/dev/null | awk 'NR>1{print "  " $NF " (" $5 ")"}'

# ── Confirmation ──
if [[ "$CONFIRMED" != true ]]; then
    echo ""
    echo -e "${RED}${BOLD}WARNING: This will stop all services and overwrite existing data!${NC}"
    echo -e "${YELLOW}Make sure you have a current backup before proceeding.${NC}"
    echo ""
    read -rp "Are you sure you want to restore? (type 'yes' to continue): " confirmation
    if [[ "$confirmation" != "yes" ]]; then
        log_info "Restore cancelled by user."
        exit 0
    fi
fi

# ── Step 1: Stop services ──
log_step "Stopping all services..."
cd "$APP_DIR"
docker compose down --timeout 30 2>/dev/null || true
log_info "All services stopped."

# ── Step 2: Restore PostgreSQL databases ──
log_step "Restoring PostgreSQL databases..."

PG_CONTAINER=$(docker compose ps -q postgres 2>/dev/null || echo "")

# Need PostgreSQL running to restore databases
# Start only PostgreSQL temporarily
docker compose up -d postgres 2>/dev/null || true

# Wait for PostgreSQL to be ready
log_info "Waiting for PostgreSQL to start..."
sleep 10

PG_CONTAINER=$(docker ps --filter "name=postgres" --format '{{.Names}}' | head -1 || echo "")

if [[ -n "$PG_CONTAINER" ]]; then
    # Wait until PostgreSQL is accepting connections
    local retries=30
    while [[ $retries -gt 0 ]]; do
        if docker exec "$PG_CONTAINER" pg_isready -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; then
            break
        fi
        sleep 2
        retries=$((retries - 1))
    done

    if [[ $retries -eq 0 ]]; then
        log_error "PostgreSQL failed to start within timeout."
        exit 1
    fi

    # Restore OpenProject database
    local_db="${POSTGRES_DB_OPENPROJECT:-openproject}"
    for db_file in "$RESTORE_DIR"/openproject_*.sql.gz; do
        if [[ -f "$db_file" ]]; then
            log_info "Restoring database: ${local_db} from $(basename "$db_file")..."
            # Drop and recreate database
            docker exec "$PG_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" \
                -c "DROP DATABASE IF EXISTS ${local_db};" 2>/dev/null || true
            docker exec "$PG_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" \
                -c "CREATE DATABASE ${local_db};" 2>/dev/null || true
            # Restore from dump
            gunzip -c "$db_file" | docker exec -i "$PG_CONTAINER" \
                psql -U "${POSTGRES_USER:-postgres}" -d "$local_db" 2>&1 | tail -5
            log_info "  → ${local_db} restored."
        fi
    done

    # Restore Mattermost database
    mm_db="${POSTGRES_DB_MATTERMOST:-mattermost}"
    for db_file in "$RESTORE_DIR"/mattermost_*.sql.gz; do
        if [[ -f "$db_file" ]]; then
            log_info "Restoring database: ${mm_db} from $(basename "$db_file")..."
            docker exec "$PG_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" \
                -c "DROP DATABASE IF EXISTS ${mm_db};" 2>/dev/null || true
            docker exec "$PG_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" \
                -c "CREATE DATABASE ${mm_db};" 2>/dev/null || true
            gunzip -c "$db_file" | docker exec -i "$PG_CONTAINER" \
                psql -U "${POSTGRES_USER:-postgres}" -d "$mm_db" 2>&1 | tail -5
            log_info "  → ${mm_db} restored."
        fi
    done

    # Restore global objects (roles, etc.) if available
    for globals_file in "$RESTORE_DIR"/postgres_globals_*.sql.gz; do
        if [[ -f "$globals_file" ]]; then
            log_info "Restoring PostgreSQL global objects..."
            gunzip -c "$globals_file" | docker exec -i "$PG_CONTAINER" \
                psql -U "${POSTGRES_USER:-postgres}" 2>&1 | tail -3
        fi
    done

    # Stop PostgreSQL (will be restarted with full stack)
    docker compose stop postgres 2>/dev/null || true
else
    log_warn "PostgreSQL container not found. Skipping database restore."
fi

# ── Step 3: Restore data volumes ──
log_step "Restoring data volumes..."

# Restore OpenProject data
for data_file in "$RESTORE_DIR"/openproject_data_*.tar.gz; do
    if [[ -f "$data_file" ]]; then
        log_info "Restoring OpenProject data volume from $(basename "$data_file")..."
        for vol in $(docker volume ls --format '{{.Name}}' | grep -i openproject); do
            local vol_path
            vol_path=$(docker volume inspect "$vol" --format '{{.Mountpoint}}' 2>/dev/null)
            if [[ -n "$vol_path" ]]; then
                log_info "  Target volume: $vol ($vol_path)"
                # Clear existing data and restore
                rm -rf "${vol_path:?}/"*
                tar xzf "$data_file" -C "$(dirname "$vol_path")"
                log_info "  → OpenProject data restored to $vol"
                break
            fi
        done
    fi
done

# Restore Mattermost data
for data_file in "$RESTORE_DIR"/mattermost_data_*.tar.gz; do
    if [[ -f "$data_file" ]]; then
        log_info "Restoring Mattermost data volume from $(basename "$data_file")..."
        for vol in $(docker volume ls --format '{{.Name}}' | grep -i mattermost); do
            local vol_path
            vol_path=$(docker volume inspect "$vol" --format '{{.Mountpoint}}' 2>/dev/null)
            if [[ -n "$vol_path" ]]; then
                log_info "  Target volume: $vol ($vol_path)"
                rm -rf "${vol_path:?}/"*
                tar xzf "$data_file" -C "$(dirname "$vol_path")"
                log_info "  → Mattermost data restored to $vol"
                break
            fi
        done
    fi
done

# ── Step 4: Restore Nginx configs and SSL certs ──
log_step "Restoring Nginx configs and SSL certificates..."

for nginx_file in "$RESTORE_DIR"/nginx_config_*.tar.gz; do
    if [[ -f "$nginx_file" ]]; then
        log_info "Restoring Nginx configs..."
        mkdir -p "${APP_DIR}/nginx"
        tar xzf "$nginx_file" -C "$APP_DIR"
        log_info "  → Nginx configs restored."
    fi
done

for ssl_file in "$RESTORE_DIR"/ssl_certs_*.tar.gz; do
    if [[ -f "$ssl_file" ]]; then
        log_info "Restoring SSL certificates..."
        tar xzf "$ssl_file" -C /
        log_info "  → SSL certificates restored to /etc/letsencrypt/"
    fi
done

# Restore docker-compose.yml if present in backup
if [[ -f "$RESTORE_DIR/docker-compose.yml" ]]; then
    log_info "Restoring docker-compose.yml..."
    cp "$RESTORE_DIR/docker-compose.yml" "${APP_DIR}/docker-compose.yml"
fi

# ── Step 5: Restart all services ──
log_step "Restarting all services..."
cd "$APP_DIR"
docker compose up -d

log_info "Services restarted. Waiting for healthy state..."

# Wait for healthy
if ! wait_for_healthy 300; then
    log_error "Services did not become healthy after restore!"
    log_error "Check logs: docker compose logs"
    exit 1
fi

# ── Step 6: Verify data integrity ──
verify_integrity || true

# ── Step 7: Summary ──
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  RESTORE SUMMARY${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Details:${NC}"
echo "  Source      : $RESTORE_DIR"
echo "  Timestamp   : $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Services    : All restarted"
echo ""
echo -e "${BOLD}Container Status:${NC}"
docker compose ps
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Cleanup temp directory if it was downloaded
if [[ "$RESTORE_DIR" == /tmp/restore_* ]]; then
    log_info "Cleaning up temporary download directory..."
    rm -rf "$RESTORE_DIR"
fi

log_info "Restore completed successfully!"
