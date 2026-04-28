#!/bin/bash
# ==============================================================================
# backup.sh - Backup script for databases and data volumes
# ==============================================================================
# Description: Creates compressed backups of PostgreSQL databases, Docker
#              volumes, Nginx configs, and SSL certificates. Optionally uploads
#              to OCI Object Storage. Manages retention policy.
# Usage: sudo ./backup.sh [--env-file /opt/app/.env] [--no-upload] [--dry-run]
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
RETENTION_DAYS=30
APP_DIR="/opt/app"
ENV_FILE="${APP_DIR}/.env"
LOG_FILE="/var/log/incubadora-backup.log"
OCI_UPLOAD=true
DRY_RUN=false
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_FOLDER=$(date +%Y-%m-%d)

# ──────────────────────────────────────────────────────────────────────────────
# Help text
# ──────────────────────────────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${BOLD}backup.sh${NC} - Backup databases and data volumes for OpenProject + Mattermost

${BOLD}USAGE:${NC}
    sudo ./backup.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    --env-file PATH   Path to .env file (default: /opt/app/.env)
    --no-upload       Skip OCI Object Storage upload
    --dry-run         Show what would be backed up without actually doing it
    --retention DAYS  Number of days to retain backups (default: 30)
    --help, -h        Show this help message

${BOLD}DESCRIPTION:${NC}
    Creates timestamped backups of:
      - PostgreSQL databases (openproject, mattermost)
      - OpenProject data volume
      - Mattermost data volume
      - Nginx configurations and SSL certificates
    Optionally uploads to OCI Object Storage and enforces retention policy.

${BOLD}OCI CONFIGURATION:${NC}
    To enable cloud upload, ensure:
      - OCI CLI is installed and configured (oci setup)
      - Environment variables set:
        - OCI_BUCKET_NAME (e.g., incubadora-backups)
        - OCI_NAMESPACE   (from OCI CLI: oci os ns get)

${BOLD}RETENTION:${NC}
    Local backups older than RETENTION_DAYS (default: 30) are automatically
    deleted. Adjust with --retention flag.

EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ──────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env-file)
            ENV_FILE="$2"; shift 2 ;;
        --no-upload)
            OCI_UPLOAD=false; shift ;;
        --dry-run)
            DRY_RUN=true; shift ;;
        --retention)
            RETENTION_DAYS="$2"; shift 2 ;;
        --help|-h)
            show_help; exit 0 ;;
        *)
            log_error "Unknown argument: $1"
            show_help; exit 1 ;;
    esac
done

# ──────────────────────────────────────────────────────────────────────────────
# Source environment
# ──────────────────────────────────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# ──────────────────────────────────────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────────────────────────────────────

# Execute command or print it in dry-run mode
run_cmd() {
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] $*"
    else
        "$@"
    fi
}

# Get the actual Docker volume path for a given volume name
get_volume_path() {
    local vol_name="$1"
    docker volume inspect "$vol_name" --format '{{.Mountpoint}}' 2>/dev/null || echo ""
}

# Upload a file to OCI Object Storage
upload_to_oci() {
    local file_path="$1"
    local object_name="$2"

    if [[ "$OCI_UPLOAD" != true ]]; then
        log_info "OCI upload skipped (--no-upload)."
        return 0
    fi

    if ! command -v oci &>/dev/null; then
        log_warn "OCI CLI not installed. Skipping cloud upload."
        return 0
    fi

    local bucket="${OCI_BUCKET_NAME:-}"
    local namespace="${OCI_NAMESPACE:-}"

    if [[ -z "$bucket" || -z "$namespace" ]]; then
        log_warn "OCI_BUCKET_NAME or OCI_NAMESPACE not set. Skipping cloud upload."
        return 0
    fi

    if [[ ! -f "$file_path" ]]; then
        log_warn "File not found for upload: $file_path"
        return 1
    fi

    log_info "Uploading $(basename "$file_path") to OCI Object Storage..."
    if oci os object put \
        --bucket-name "$bucket" \
        --namespace "$namespace" \
        --file "$file_path" \
        --name "$object_name" \
        --no-retry 2>&1 | tail -3; then
        log_info "Upload complete: $object_name"
    else
        log_warn "Failed to upload $object_name to OCI."
    fi
}

# Cleanup old backups beyond retention period
cleanup_old_backups() {
    log_step "Cleaning up backups older than ${RETENTION_DAYS} days..."
    local count=0

    while IFS= read -r -d '' dir; do
        count=$((count + 1))
        log_info "Removing old backup: $(basename "$dir")"
        run_cmd rm -rf "$dir"
    done < <(find "$BACKUP_DIR" -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -print0 2>/dev/null)

    # Also clean up individual files (for flat backup structure)
    while IFS= read -r -d '' file; do
        count=$((count + 1))
        log_info "Removing old file: $(basename "$file")"
        run_cmd rm -f "$file"
    done < <(find "$BACKUP_DIR" -maxdepth 2 -type f -mtime "+${RETENTION_DAYS}" -print0 2>/dev/null)

    log_info "Cleaned up ${count} old backup item(s)."
}

# ──────────────────────────────────────────────────────────────────────────────
# Main backup process
# ──────────────────────────────────────────────────────────────────────────────

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Tee all output to log file
exec > >(tee -a "$LOG_FILE") 2>&1

log_step "Starting backup process..."
log_info "Timestamp     : $TIMESTAMP"
log_info "Backup dir    : $BACKUP_DIR"
log_info "Retention     : ${RETENTION_DAYS} days"
log_info "Dry run       : $DRY_RUN"
log_info "OCI upload    : $OCI_UPLOAD"

# ── Create backup directory ──
BACKUP_SUBDIR="${BACKUP_DIR}/${DATE_FOLDER}/${TIMESTAMP}"
mkdir -p "$BACKUP_SUBDIR"
log_info "Backup directory: $BACKUP_SUBDIR"

# ── Step 1: Backup PostgreSQL databases ──
log_step "Backing up PostgreSQL databases..."

# Determine PostgreSQL container name
PG_CONTAINER=$(docker compose -f "${APP_DIR}/docker-compose.yml" ps -q postgres 2>/dev/null || echo "")
if [[ -z "$PG_CONTAINER" ]]; then
    # Try alternative container name
    PG_CONTAINER=$(docker ps --filter "name=postgres" --format '{{.Names}}' | head -1 || echo "")
fi

if [[ -n "$PG_CONTAINER" ]]; then
    # Backup OpenProject database
    local_db="${POSTGRES_DB_OPENPROJECT:-openproject}"
    log_info "Dumping PostgreSQL database: ${local_db}..."
    run_cmd docker exec "$PG_CONTAINER" \
        pg_dump -U "${POSTGRES_USER:-postgres}" "$local_db" \
        | gzip > "${BACKUP_SUBDIR}/openproject_${TIMESTAMP}.sql.gz" \
        && log_info "  → openproject_${TIMESTAMP}.sql.gz ($(du -h "${BACKUP_SUBDIR}/openproject_${TIMESTAMP}.sql.gz" | cut -f1))" \
        || log_error "Failed to dump database: ${local_db}"

    # Backup Mattermost database
    mm_db="${POSTGRES_DB_MATTERMOST:-mattermost}"
    log_info "Dumping PostgreSQL database: ${mm_db}..."
    run_cmd docker exec "$PG_CONTAINER" \
        pg_dump -U "${POSTGRES_USER:-postgres}" "$mm_db" \
        | gzip > "${BACKUP_SUBDIR}/mattermost_${TIMESTAMP}.sql.gz" \
        && log_info "  → mattermost_${TIMESTAMP}.sql.gz ($(du -h "${BACKUP_SUBDIR}/mattermost_${TIMESTAMP}.sql.gz" | cut -f1))" \
        || log_error "Failed to dump database: ${mm_db}"

    # Backup all roles and schema (for complete restore)
    log_info "Dumping PostgreSQL global objects (roles, tablespaces)..."
    run_cmd docker exec "$PG_CONTAINER" \
        pg_dumpall -U "${POSTGRES_USER:-postgres}" --globals-only \
        | gzip > "${BACKUP_SUBDIR}/postgres_globals_${TIMESTAMP}.sql.gz" \
        && log_info "  → postgres_globals_${TIMESTAMP}.sql.gz" \
        || log_warn "Failed to dump global objects (non-critical)"
else
    log_warn "PostgreSQL container not found. Skipping database backups."
fi

# ── Step 2: Backup OpenProject data volume ──
log_step "Backing up OpenProject data volume..."

OP_VOLUME="openproject_data"
OP_VOL_PATH=$(get_volume_path "$OP_VOLUME")

if [[ -n "$OP_VOL_PATH" && -d "$OP_VOL_PATH" ]]; then
    log_info "Archiving volume: $OP_VOLUME ($OP_VOL_PATH)..."
    run_cmd tar czf "${BACKUP_SUBDIR}/openproject_data_${TIMESTAMP}.tar.gz" \
        -C "$(dirname "$OP_VOL_PATH")" "$(basename "$OP_VOL_PATH")" \
        && log_info "  → openproject_data_${TIMESTAMP}.tar.gz ($(du -h "${BACKUP_SUBDIR}/openproject_data_${TIMESTAMP}.tar.gz" | cut -f1))"
else
    log_warn "OpenProject volume '$OP_VOLUME' not found. Trying alternative names..."
    # Try common alternative volume names from docker-compose
    for vol in $(docker volume ls --format '{{.Name}}' | grep -i openproject); do
        vol_path=$(get_volume_path "$vol")
        if [[ -n "$vol_path" && -d "$vol_path" ]]; then
            log_info "Found volume: $vol ($vol_path)"
            run_cmd tar czf "${BACKUP_SUBDIR}/openproject_data_${TIMESTAMP}.tar.gz" \
                -C "$(dirname "$vol_path")" "$(basename "$vol_path")"
            log_info "  → openproject_data_${TIMESTAMP}.tar.gz"
            break
        fi
    done
fi

# ── Step 3: Backup Mattermost data volume ──
log_step "Backing up Mattermost data volume..."

MM_VOLUME="mattermost_data"
MM_VOL_PATH=$(get_volume_path "$MM_VOLUME")

if [[ -n "$MM_VOL_PATH" && -d "$MM_VOL_PATH" ]]; then
    log_info "Archiving volume: $MM_VOLUME ($MM_VOL_PATH)..."
    run_cmd tar czf "${BACKUP_SUBDIR}/mattermost_data_${TIMESTAMP}.tar.gz" \
        -C "$(dirname "$MM_VOL_PATH")" "$(basename "$MM_VOL_PATH")" \
        && log_info "  → mattermost_data_${TIMESTAMP}.tar.gz ($(du -h "${BACKUP_SUBDIR}/mattermost_data_${TIMESTAMP}.tar.gz" | cut -f1))"
else
    log_warn "Mattermost volume '$MM_VOLUME' not found. Trying alternative names..."
    for vol in $(docker volume ls --format '{{.Name}}' | grep -i mattermost | grep -v config); do
        vol_path=$(get_volume_path "$vol")
        if [[ -n "$vol_path" && -d "$vol_path" ]]; then
            log_info "Found volume: $vol ($vol_path)"
            run_cmd tar czf "${BACKUP_SUBDIR}/mattermost_data_${TIMESTAMP}.tar.gz" \
                -C "$(dirname "$vol_path")" "$(basename "$vol_path")"
            log_info "  → mattermost_data_${TIMESTAMP}.tar.gz"
            break
        fi
    done
fi

# ── Step 4: Backup Nginx configs and SSL certs ──
log_step "Backing up Nginx configs and SSL certificates..."

# Nginx configs
if [[ -d "${APP_DIR}/nginx" ]]; then
    run_cmd tar czf "${BACKUP_SUBDIR}/nginx_config_${TIMESTAMP}.tar.gz" \
        -C "$APP_DIR" nginx/
    log_info "  → nginx_config_${TIMESTAMP}.tar.gz"
fi

# Let's Encrypt SSL certificates
if [[ -d "/etc/letsencrypt" ]]; then
    run_cmd tar czf "${BACKUP_SUBDIR}/ssl_certs_${TIMESTAMP}.tar.gz" \
        -C /etc letsencrypt/ 2>/dev/null
    log_info "  → ssl_certs_${TIMESTAMP}.tar.gz"
fi

# Docker Compose file (for reproducibility)
if [[ -f "${APP_DIR}/docker-compose.yml" ]]; then
    run_cmd cp "${APP_DIR}/docker-compose.yml" "${BACKUP_SUBDIR}/docker-compose.yml"
    log_info "  → docker-compose.yml"
fi

# Environment file (contains secrets - handle with care)
if [[ -f "$ENV_FILE" ]]; then
    run_cmd cp "$ENV_FILE" "${BACKUP_SUBDIR}/.env"
    run_cmd chmod 600 "${BACKUP_SUBDIR}/.env"
    log_info "  → .env (permissions: 600)"
fi

# Backup metadata (for restore/rollback)
cat > "${BACKUP_SUBDIR}/backup_metadata.json" <<META
{
    "timestamp": "$TIMESTAMP",
    "date": "$DATE_FOLDER",
    "hostname": "$(hostname)",
    "docker_images": $(docker compose -f "${APP_DIR}/docker-compose.yml" images --format '["{{.Repository}}:{{.Tag}}"]' 2>/dev/null | jq -s '.' 2>/dev/null || echo '[]'),
    "containers": $(docker compose -f "${APP_DIR}/docker-compose.yml" ps --format '{{.Name}}' 2>/dev/null | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null || echo '[]'),
    "disk_usage": $(df -h /opt/backups | awk 'NR==2{print "{\"total\":\""$2"\",\"used\":\""$3"\",\"available\":\""$4"\",\"percent\":\""$5"\"}"}'),
    "backup_files": $(ls -1 "$BACKUP_SUBDIR" 2>/dev/null | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null || echo '[]')
}
META
log_info "  → backup_metadata.json"

# ── Step 5: Upload to OCI Object Storage ──
log_step "Uploading backups to OCI Object Storage..."

if [[ "$DRY_RUN" != true ]]; then
    for file in "$BACKUP_SUBDIR"/*; do
        if [[ -f "$file" ]]; then
            upload_to_oci "$file" "backups/${DATE_FOLDER}/${TIMESTAMP}/$(basename "$file")"
        fi
    done
fi

# ── Step 6: Cleanup old backups ──
cleanup_old_backups

# ── Summary ──
BACKUP_SIZE=$(du -sh "$BACKUP_SUBDIR" 2>/dev/null | cut -f1)
BACKUP_COUNT=$(find "$BACKUP_SUBDIR" -type f 2>/dev/null | wc -l)

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  BACKUP SUMMARY${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Details:${NC}"
echo "  Timestamp     : $TIMESTAMP"
echo "  Location      : $BACKUP_SUBDIR"
echo "  Total size    : $BACKUP_SIZE"
echo "  Files         : $BACKUP_COUNT"
echo "  Retention     : ${RETENTION_DAYS} days"
echo "  OCI upload    : $OCI_UPLOAD"
echo ""
echo -e "${BOLD}Files:${NC}"
ls -lh "$BACKUP_SUBDIR" 2>/dev/null | awk 'NR>1{print "  " $NF " (" $5 ")"}'
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""

log_info "Backup completed successfully!"
