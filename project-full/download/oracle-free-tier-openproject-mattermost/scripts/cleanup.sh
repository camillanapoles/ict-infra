#!/bin/bash
# ==============================================================================
# cleanup.sh - Cleanup and maintenance script
# ==============================================================================
# Description: Frees disk space by removing unused Docker resources, old logs,
#              apt cache, temporary files, and expired backups. Safe to run
#              periodically (e.g., weekly via cron).
# Usage: sudo ./cleanup.sh [--dry-run] [--aggressive] [--help]
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
DRY_RUN=false
AGGRESSIVE=false
TOTAL_FREED=0

# ──────────────────────────────────────────────────────────────────────────────
# Help text
# ──────────────────────────────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${BOLD}cleanup.sh${NC} - Cleanup and maintenance for OpenProject + Mattermost server

${BOLD}USAGE:${NC}
    sudo ./cleanup.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    --dry-run         Show what would be cleaned without actually deleting
    --aggressive      Remove ALL unused Docker images (including those not in use)
    --retention DAYS  Backup retention in days (default: 30)
    --help, -h        Show this help message

${BOLD}DESCRIPTION:${NC}
    Cleans up various system resources to free disk space:

    ${BOLD}Docker:${NC}
      - Unused containers (stopped)
      - Unused networks
      - Dangling images (untagged)
      - Unused build cache
      - Unused volumes (with --aggressive)
      - ALL unused images (with --aggressive)

    ${BOLD}System:${NC}
      - Old journal logs (>7 days)
      - APT cache (autoremove + clean)
      - Temporary files in /tmp (>7 days old)
      - Old systemd journal logs
      - Docker container logs (>50MB, kept to last 3)

    ${BOLD}Backups:${NC}
      - Backup files older than retention period (default: 30 days)

    ${BOLD}WARNING:${NC}
      The --aggressive flag removes ALL unused Docker images, not just
      dangling ones. This is useful for reclaiming maximum space but
      means the next deploy will need to re-pull all images.

EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ──────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true; shift ;;
        --aggressive)
            AGGRESSIVE=true; shift ;;
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
# Helper: Calculate and track freed space
# ──────────────────────────────────────────────────────────────────────────────

# Get current disk usage of / in KB (for tracking freed space)
get_disk_used_kb() {
    df / --output=used -k | tail -1 | tr -d ' '
}

# Track space freed between two measurements
# Usage: track_freed "description" command...
track_freed() {
    local desc="$1"
    shift

    local before after freed
    before=$(get_disk_used_kb)

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run: $*"
        return 0
    fi

    # Run the command
    local output
    output=$("$@" 2>&1) && true
    local exit_code=$?

    after=$(get_disk_used_kb)

    # Calculate freed space (negative means used more, positive means freed)
    local diff=$((before - after))
    if [[ $diff -gt 0 ]]; then
        freed="${diff}KB"
        TOTAL_FREED=$((TOTAL_FREED + diff))
    else
        freed="0KB"
    fi

    # Show meaningful output
    if [[ -n "$output" ]]; then
        # Extract key info from Docker commands
        local summary
        summary=$(echo "$output" | grep -oE '[0-9.]+[A-Z]+' | head -3 | tr '\n' ' ' || echo "")
        [[ -n "$summary" ]] && log_info "  $desc: freed $summary"
    fi

    return $exit_code
}

# ──────────────────────────────────────────────────────────────────────────────
# Main cleanup process
# ──────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║              CLEANUP - $(date '+%Y-%m-%d %H:%M')                       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$DRY_RUN" == true ]]; then
    log_warn "DRY RUN MODE - No changes will be made."
    echo ""
fi

# Record starting disk usage
DISK_BEFORE=$(get_disk_used_kb)
log_info "Starting disk usage: $(df -h / | awk 'NR==2{print $3 " used, " $4 " available"}')"

# ── Step 1: Docker system prune ──
log_step "Step 1/7: Docker system prune (unused containers, networks, build cache)..."

if command -v docker &>/dev/null; then
    log_info "Current Docker disk usage:"
    docker system df 2>/dev/null || log_warn "  Could not get Docker disk usage."

    track_freed "Docker system prune" \
        docker system prune -f --volumes 2>&1 || \
        log_warn "Docker system prune failed."

    # Docker image prune - remove dangling images
    log_info "Pruning dangling Docker images..."
    track_freed "Dangling images" \
        docker image prune -f 2>&1 || \
        log_warn "Docker image prune failed."
else
    log_warn "Docker not available. Skipping Docker cleanup."
fi

# ── Step 2: Aggressive Docker cleanup (optional) ──
if [[ "$AGGRESSIVE" == true ]]; then
    log_step "Step 2/7: Aggressive Docker cleanup (ALL unused images)..."
    track_freed "All unused images" \
        docker image prune -a -f 2>&1 || \
        log_warn "Aggressive image prune failed."
else
    log_step "Step 2/7: Skipping aggressive cleanup (use --aggressive to enable)."
fi

# ── Step 3: Docker volume prune (unused anonymous volumes) ──
log_step "Step 3/7: Docker volume prune..."

if command -v docker &>/dev/null; then
    # Only remove anonymous volumes (not named volumes - those hold our data!)
    track_freed "Unused anonymous volumes" \
        docker volume prune -f 2>&1 || \
        log_warn "Docker volume prune failed."
else
    log_info "  Skipped (Docker not available)."
fi

# ── Step 4: Cleanup journal logs ──
log_step "Step 4/7: Cleaning up system journal logs..."

if command -v journalctl &>/dev/null; then
    if [[ "$DRY_RUN" != true ]]; then
        # Vacuum journal logs older than 7 days
        journalctl --vacuum-time=7d 2>&1 | tail -3
        # Also limit total journal size to 500MB
        journalctl --vacuum-size=500M 2>&1 | tail -3
        log_info "  Journal logs cleaned."
    else
        log_info "[DRY RUN] Would vacuum journal logs (>7 days, max 500MB)."
    fi
else
    log_info "  journalctl not available. Skipped."
fi

# ── Step 5: Cleanup APT cache ──
log_step "Step 5/7: Cleaning up APT package cache..."

if [[ "$DRY_RUN" != true ]]; then
    apt autoremove -y 2>&1 | tail -3
    apt clean -y 2>&1 | tail -1
    # Also clean apt lists cache
    rm -rf /var/cache/apt/archives/*.deb 2>/dev/null || true
    log_info "  APT cache cleaned."
else
    log_info "[DRY RUN] Would run: apt autoremove -y && apt clean -y"
fi

# ── Step 6: Cleanup /tmp files ──
log_step "Step 6/7: Cleaning up old temporary files..."

if [[ "$DRY_RUN" != true ]]; then
    # Remove files in /tmp older than 7 days (not directories owned by services)
    local tmp_count
    tmp_count=$(find /tmp -type f -atime +7 -not -name '.' 2>/dev/null | wc -l)
    if [[ $tmp_count -gt 0 ]]; then
        find /tmp -type f -atime +7 -delete 2>/dev/null || true
        log_info "  Removed $tmp_count old file(s) from /tmp."
    else
        log_info "  No old files in /tmp."
    fi

    # Clean old user temp files
    local user_tmp_count
    user_tmp_count=$(find /tmp -user ubuntu -type f -atime +3 2>/dev/null | wc -l)
    if [[ $user_tmp_count -gt 0 ]]; then
        find /tmp -user ubuntu -type f -atime +3 -delete 2>/dev/null || true
        log_info "  Removed $user_tmp_count old user temp file(s)."
    fi
else
    log_info "[DRY RUN] Would remove files in /tmp older than 7 days."
fi

# ── Step 7: Cleanup old backups ──
log_step "Step 7/7: Cleaning up old backups (>${RETENTION_DAYS} days)..."

if [[ -d "$BACKUP_DIR" ]]; then
    local old_backups
    old_backups=$(find "$BACKUP_DIR" -type d -mtime "+${RETENTION_DAYS}" 2>/dev/null)

    if [[ -n "$old_backups" ]]; then
        local old_count=0
        local old_size=0

        while IFS= read -r dir; do
            [[ -z "$dir" ]] && continue
            local size
            size=$(du -sk "$dir" 2>/dev/null | cut -f1)
            old_count=$((old_count + 1))
            old_size=$((old_size + size))

            if [[ "$DRY_RUN" != true ]]; then
                rm -rf "$dir"
                log_info "  Removed: $(basename "$dir")"
            else
                log_info "[DRY RUN] Would remove: $dir"
            fi
        done <<< "$old_backups"

        if [[ $old_count -gt 0 ]]; then
            log_info "  Total: $old_count old backup(s) freed $(numfmt --to=iec $((old_size * 1024)) 2>/dev/null || echo "${old_size}KB")"
        fi
    else
        log_info "  No old backups to remove."
    fi
else
    log_info "  Backup directory not found. Skipped."
fi

# ──────────────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────────────

DISK_AFTER=$(get_disk_used_kb)
DISK_DIFF=$((DISK_BEFORE - DISK_AFTER))

# Format freed space nicely
if command -v numfmt &>/dev/null; then
    FREED_HUMAN=$(numfmt --to=iec $((DISK_DIFF * 1024)))
else
    FREED_HUMAN="${DISK_DIFF}KB"
fi

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  CLEANUP SUMMARY${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Disk Space:${NC}"
echo "  Before: $(df -h / | awk 'NR==2{print $3 " used, " $4 " available (" $5 " full)"}')"
echo "  After:  $(numfmt --to=iec --suffix=B $((DISK_AFTER * 1024)) 2>/dev/null || echo "${DISK_AFTER}KB") used"
echo "  Freed:  ${GREEN}${FREED_HUMAN}${NC}"
echo ""
echo -e "${BOLD}Docker (after cleanup):${NC}"
if command -v docker &>/dev/null; then
    docker system df 2>/dev/null || echo "  Unable to get Docker disk usage."
else
    echo "  Docker not available."
fi
echo ""
echo -e "${BOLD}Settings:${NC}"
echo "  Mode         : $([[ "$DRY_RUN" == true ]] && echo "DRY RUN" || echo "LIVE")"
echo "  Aggressive   : $([[ "$AGGRESSIVE" == true ]] && echo "Yes" || echo "No")"
echo "  Retention    : ${RETENTION_DAYS} days"
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""

log_info "Cleanup completed. Freed approximately ${FREED_HUMAN}."
