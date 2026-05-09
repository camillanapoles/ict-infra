#!/bin/bash
# ==============================================================================
# health-check.sh - Comprehensive health check for OpenProject + Mattermost
# ==============================================================================
# Description: Checks system resources, Docker container status, service health,
#              SSL certificates, and recent error logs. Supports JSON output
#              for monitoring integration.
# Usage: ./health-check.sh [--json] [--env-file /opt/app/.env]
# Exit codes: 0=healthy, 1=degraded, 2=critical
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
JSON_OUTPUT=false
EXIT_CODE=0  # 0=healthy, 1=degraded, 2=critical

# Arrays to collect results for JSON output
declare -a CHECKS=()
declare -a WARNINGS=()
declare -a ERRORS=()

# ──────────────────────────────────────────────────────────────────────────────
# Help text
# ──────────────────────────────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${BOLD}health-check.sh${NC} - Comprehensive health check for OpenProject + Mattermost

${BOLD}USAGE:${NC}
    ./health-check.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    --json            Output results in JSON format (for monitoring)
    --env-file PATH   Path to .env file (default: /opt/app/.env)
    --help, -h        Show this help message

${BOLD}EXIT CODES:${NC}
    0   All checks passed - system is healthy
    1   Some warnings - system is degraded but operational
    2   Critical failures - system needs immediate attention

${BOLD}CHECKS PERFORMED:${NC}
    - CPU, memory, disk usage
    - Docker container status
    - OpenProject API health
    - Mattermost API health
    - PostgreSQL connectivity
    - Nginx HTTPS response
    - SSL certificate expiry
    - Recent Docker error logs
    - UFW firewall status
    - fail2ban status

EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ──────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)
            JSON_OUTPUT=true; shift ;;
        --env-file)
            ENV_FILE="$2"; shift 2 ;;
        --help|-h)
            show_help; exit 0 ;;
        *)
            log_error "Unknown argument: $1"
            show_help; exit 1 ;;
    esac
done

# Load environment for domain names
if [[ -f "$ENV_FILE" ]]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# ──────────────────────────────────────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────────────────────────────────────

# Record a check result
add_check() {
    local name="$1" status="$2" message="$3"
    CHECKS+=("{\"name\":\"$name\",\"status\":\"$status\",\"message\":\"$message\"}")
}

# Record a warning (sets exit code to 1 if not already 2)
add_warning() {
    local msg="$1"
    WARNINGS+=("\"$msg\"")
    [[ $EXIT_CODE -lt 1 ]] && EXIT_CODE=1
}

# Record an error (sets exit code to 2)
add_error() {
    local msg="$1"
    ERRORS+=("\"$msg\"")
    EXIT_CODE=2
}

# ──────────────────────────────────────────────────────────────────────────────
# Health checks
# ──────────────────────────────────────────────────────────────────────────────

check_system_resources() {
    log_step "Checking system resources..."

    # CPU usage
    local cpu_idle
    cpu_idle=$(top -bn1 | grep "Cpu(s)" | awk '{print $8}' | cut -d'.' -f1)
    cpu_idle=${cpu_idle:-0}
    local cpu_used=$((100 - cpu_idle))

    if [[ "$cpu_used" -gt 90 ]]; then
        log_error "  CPU usage CRITICAL: ${cpu_used}% used"
        add_check "cpu" "critical" "CPU usage at ${cpu_used}%"
        add_error "CPU usage at ${cpu_used}%"
    elif [[ "$cpu_used" -gt 75 ]]; then
        log_warn "  CPU usage HIGH: ${cpu_used}% used"
        add_check "cpu" "warning" "CPU usage at ${cpu_used}%"
        add_warning "CPU usage at ${cpu_used}%"
    else
        log_info "  CPU usage: ${cpu_used}% used (${cpu_idle}% idle)"
        add_check "cpu" "ok" "CPU usage at ${cpu_used}%"
    fi

    # Memory usage
    local mem_info
    mem_info=$(free -m | awk '/Mem:/')
    local mem_total mem_used mem_avail mem_percent
    mem_total=$(echo "$mem_info" | awk '{print $2}')
    mem_used=$(echo "$mem_info" | awk '{print $3}')
    mem_avail=$(echo "$mem_info" | awk '{print $7}')
    mem_percent=$((mem_used * 100 / mem_total))

    if [[ "$mem_percent" -gt 90 ]]; then
        log_error "  Memory CRITICAL: ${mem_percent}% used (${mem_used}MB / ${mem_total}MB)"
        add_check "memory" "critical" "Memory usage at ${mem_percent}% (${mem_used}MB/${mem_total}MB)"
        add_error "Memory usage at ${mem_percent}%"
    elif [[ "$mem_percent" -gt 80 ]]; then
        log_warn "  Memory HIGH: ${mem_percent}% used (${mem_used}MB / ${mem_total}MB)"
        add_check "memory" "warning" "Memory usage at ${mem_percent}% (${mem_used}MB/${mem_total}MB)"
        add_warning "Memory usage at ${mem_percent}%"
    else
        log_info "  Memory: ${mem_percent}% used (${mem_used}MB / ${mem_total}MB, available: ${mem_avail}MB)"
        add_check "memory" "ok" "Memory usage at ${mem_percent}% (${mem_used}MB/${mem_total}MB)"
    fi

    # Disk usage
    local disk_info
    disk_info=$(df -h / | awk 'NR==2')
    local disk_total disk_used disk_avail disk_percent
    disk_total=$(echo "$disk_info" | awk '{print $2}')
    disk_used=$(echo "$disk_info" | awk '{print $3}')
    disk_avail=$(echo "$disk_info" | awk '{print $4}')
    disk_percent=$(echo "$disk_info" | awk '{print $5}' | tr -d '%')

    if [[ "$disk_percent" -gt 90 ]]; then
        log_error "  Disk CRITICAL: ${disk_percent}% used (${disk_used} / ${disk_total})"
        add_check "disk" "critical" "Disk usage at ${disk_percent}% (${disk_used}/${disk_total})"
        add_error "Disk usage at ${disk_percent}%"
    elif [[ "$disk_percent" -gt 80 ]]; then
        log_warn "  Disk HIGH: ${disk_percent}% used (${disk_used} / ${disk_total})"
        add_check "disk" "warning" "Disk usage at ${disk_percent}% (${disk_used}/${disk_total})"
        add_warning "Disk usage at ${disk_percent}%"
    else
        log_info "  Disk: ${disk_percent}% used (${disk_used} / ${disk_total}, available: ${disk_avail})"
        add_check "disk" "ok" "Disk usage at ${disk_percent}% (${disk_used}/${disk_total})"
    fi

    # Docker disk usage
    if command -v docker &>/dev/null; then
        local docker_df
        docker_df=$(docker system df --format '{{.Type}}: {{.Size}}' 2>/dev/null || echo "")
        if [[ -n "$docker_df" ]]; then
            log_info "  Docker disk usage:"
            echo "$docker_df" | while IFS= read -r line; do
                log_info "    $line"
            done
        fi
    fi

    # Swap usage
    local swap_info
    swap_info=$(free -m | awk '/Swap:/')
    local swap_total swap_used
    swap_total=$(echo "$swap_info" | awk '{print $2}')
    swap_used=$(echo "$swap_info" | awk '{print $3}')
    if [[ "$swap_total" -gt 0 ]]; then
        local swap_percent=$((swap_used * 100 / swap_total))
        log_info "  Swap: ${swap_percent}% used (${swap_used}MB / ${swap_total}MB)"
        if [[ "$swap_percent" -gt 50 ]]; then
            add_warning "Swap usage at ${swap_percent}%"
        fi
        add_check "swap" "$([[ $swap_percent -gt 50 ]] && echo 'warning' || echo 'ok')" \
            "Swap usage at ${swap_percent}% (${swap_used}MB/${swap_total}MB)"
    else
        log_info "  Swap: not configured"
        add_check "swap" "ok" "No swap configured"
    fi
}

check_docker_containers() {
    log_step "Checking Docker containers..."

    if ! command -v docker &>/dev/null; then
        log_error "  Docker is not installed or not in PATH."
        add_check "docker" "critical" "Docker not available"
        add_error "Docker not available"
        return
    fi

    local total=0 running=0 exited=0 unhealthy=0

    # Check if docker-compose.yml exists
    if [[ -f "${APP_DIR}/docker-compose.yml" ]]; then
        # Get container status via docker compose
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            local name status
            name=$(echo "$line" | awk '{print $1}')
            status=$(echo "$line" | awk '{print $2}')

            total=$((total + 1))

            if echo "$status" | grep -qi "running\|healthy"; then
                running=$((running + 1))
                log_info "  ${GREEN}✓${NC} $name: $status"
                add_check "container_$name" "ok" "$status"
            elif echo "$status" | grep -qi "exited.*0"; then
                # Exited with code 0 is OK for some containers
                exited=$((exited + 1))
                log_info "  ${CYAN}○${NC} $name: $status"
                add_check "container_$name" "ok" "$status"
            elif echo "$status" | grep -qi "unhealthy"; then
                unhealthy=$((unhealthy + 1))
                log_error "  ${RED}✗${NC} $name: $status"
                add_check "container_$name" "critical" "$status"
                add_error "Container $name is unhealthy"
            else
                exited=$((exited + 1))
                log_warn "  ${YELLOW}!${NC} $name: $status"
                add_check "container_$name" "warning" "$status"
                add_warning "Container $name: $status"
            fi
        done < <(docker compose -f "${APP_DIR}/docker-compose.yml" ps --format '{{.Name}} {{.Status}}' 2>/dev/null)
    else
        # Fallback: check all Docker containers
        log_warn "  docker-compose.yml not found. Checking all Docker containers..."
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            total=$((total + 1))
            local name status
            name=$(echo "$line" | awk '{print $NF}')
            status=$(echo "$line" | awk '{print $(NF-1)}')

            if [[ "$status" == "Up" ]]; then
                running=$((running + 1))
                log_info "  ${GREEN}✓${NC} $name: $status"
            else
                exited=$((exited + 1))
                log_warn "  ${YELLOW}!${NC} $name: $status"
                add_warning "Container $name: $status"
            fi
        done < <(docker ps -a --format '{{.Status}} {{.Names}}' 2>/dev/null)
    fi

    log_info "  Summary: $running running, $exited exited/stopped, $unhealthy unhealthy (total: $total)"
}

check_service_health() {
    log_step "Checking service health..."

    # ── OpenProject ──
    log_info "  Checking OpenProject (localhost:8080)..."
    local op_status="unknown"
    if curl -sf --max-time 15 "http://localhost:8080/api/v3" > /dev/null 2>&1; then
        log_info "    ${GREEN}✓${NC} OpenProject API is responding"
        add_check "openproject" "ok" "API responding on port 8080"
        op_status="ok"
    else
        log_error "    ${RED}✗${NC} OpenProject API is NOT responding"
        add_check "openproject" "critical" "API not responding on port 8080"
        add_error "OpenProject API not responding"
        op_status="critical"
    fi

    # ── Mattermost ──
    log_info "  Checking Mattermost (localhost:8065)..."
    if curl -sf --max-time 15 "http://localhost:8065/api/v4/system/ping" > /dev/null 2>&1; then
        log_info "    ${GREEN}✓${NC} Mattermost API is responding"
        add_check "mattermost" "ok" "API responding on port 8065"
    else
        log_error "    ${RED}✗${NC} Mattermost API is NOT responding"
        add_check "mattermost" "critical" "API not responding on port 8065"
        add_error "Mattermost API not responding"
    fi

    # ── PostgreSQL ──
    log_info "  Checking PostgreSQL..."
    local pg_container
    pg_container=$(docker ps --filter "name=postgres" --format '{{.Names}}' | head -1 || echo "")
    if [[ -n "$pg_container" ]]; then
        if docker exec "$pg_container" pg_isready -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; then
            log_info "    ${GREEN}✓${NC} PostgreSQL is accepting connections"
            add_check "postgresql" "ok" "Accepting connections"

            # Show connection count
            local conn_count
            conn_count=$(docker exec "$pg_container" psql -U "${POSTGRES_USER:-postgres}" \
                -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "?")
            log_info "    Active connections: ${conn_count}"
        else
            log_error "    ${RED}✗${NC} PostgreSQL is NOT accepting connections"
            add_check "postgresql" "critical" "Not accepting connections"
            add_error "PostgreSQL not accepting connections"
        fi
    else
        log_warn "    ${YELLOW}!${NC} PostgreSQL container not found"
        add_check "postgresql" "warning" "Container not found"
        add_warning "PostgreSQL container not found"
    fi

    # ── Nginx ──
    local op_domain="${OPENPROJECT_DOMAIN:-}"
    if [[ -n "$op_domain" ]]; then
        log_info "  Checking Nginx (https://${op_domain})..."
        local http_code
        http_code=$(curl -sf --max-time 15 -o /dev/null -w "%{http_code}" "https://${op_domain}" 2>/dev/null || echo "000")
        if [[ "$http_code" =~ ^(200|301|302)$ ]]; then
            log_info "    ${GREEN}✓${NC} Nginx HTTPS responding (HTTP $http_code)"
            add_check "nginx" "ok" "HTTPS responding (HTTP $http_code)"
        else
            log_warn "    ${YELLOW}!${NC} Nginx HTTPS returned HTTP $http_code"
            add_check "nginx" "warning" "HTTPS returned HTTP $http_code"
            add_warning "Nginx HTTPS returned HTTP $http_code"
        fi
    else
        log_info "  Skipping Nginx external check (OPENPROJECT_DOMAIN not set)"
        add_check "nginx" "ok" "Skipped (no domain configured)"
    fi

    # ── Memcached ──
    log_info "  Checking Memcached..."
    local mc_container
    mc_container=$(docker ps --filter "name=memcached" --format '{{.Names}}' | head -1 || echo "")
    if [[ -n "$mc_container" ]]; then
        if docker exec "$mc_container" bash -c 'echo stats | nc localhost 11211' >/dev/null 2>&1; then
            log_info "    ${GREEN}✓${NC} Memcached is responding"
            add_check "memcached" "ok" "Responding on port 11211"
        else
            log_warn "    ${YELLOW}!${NC} Memcached may not be responding"
            add_check "memcached" "warning" "May not be responding"
            add_warning "Memcached may not be responding"
        fi
    else
        log_info "    Memcached container not found (may not be required)"
        add_check "memcached" "ok" "Not deployed"
    fi
}

check_ssl_certificates() {
    log_step "Checking SSL certificates..."

    local domains=()
    [[ -n "${OPENPROJECT_DOMAIN:-}" ]] && domains+=("$OPENPROJECT_DOMAIN")
    [[ -n "${MATTERMOST_DOMAIN:-}" ]] && domains+=("$MATTERMOST_DOMAIN")

    if [[ ${#domains[@]} -eq 0 ]]; then
        log_info "  No domains configured. Skipping SSL check."
        add_check "ssl" "ok" "No domains configured"
        return
    fi

    for domain in "${domains[@]}"; do
        log_info "  Checking SSL for: $domain"

        # Get certificate expiry date
        local expiry
        expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain":443 2>/dev/null \
            | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

        if [[ -z "$expiry" ]]; then
            log_warn "    ${YELLOW}!${NC} Could not retrieve SSL certificate for $domain"
            add_check "ssl_$domain" "warning" "Certificate not found or not valid"
            add_warning "SSL certificate not found for $domain"
            continue
        fi

        # Convert to epoch and calculate days remaining
        local expiry_epoch now_epoch days_remaining
        expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo "0")
        now_epoch=$(date +%s)
        days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))

        if [[ $days_remaining -lt 0 ]]; then
            log_error "    ${RED}✗${NC} $domain: EXPIRED (expired on $expiry)"
            add_check "ssl_$domain" "critical" "EXPIRED on $expiry"
            add_error "SSL certificate EXPIRED for $domain"
        elif [[ $days_remaining -lt 7 ]]; then
            log_error "    ${RED}✗${NC} $domain: expires in $days_remaining days ($expiry)"
            add_check "ssl_$domain" "critical" "Expires in $days_remaining days ($expiry)"
            add_error "SSL certificate expires in $days_remaining days for $domain"
        elif [[ $days_remaining -lt 30 ]]; then
            log_warn "    ${YELLOW}!${NC} $domain: expires in $days_remaining days ($expiry)"
            add_check "ssl_$domain" "warning" "Expires in $days_remaining days ($expiry)"
            add_warning "SSL certificate expires in $days_remaining days for $domain"
        else
            log_info "    ${GREEN}✓${NC} $domain: valid for $days_remaining days ($expiry)"
            add_check "ssl_$domain" "ok" "Valid for $days_remaining days ($expiry)"
        fi
    done
}

check_docker_logs() {
    log_step "Checking recent Docker logs for errors..."

    if ! command -v docker &>/dev/null; then
        return
    fi

    local error_count=0

    # Check logs for all containers in the stack
    if [[ -f "${APP_DIR}/docker-compose.yml" ]]; then
        while IFS= read -r container; do
            [[ -z "$container" ]] && continue

            local container_errors
            container_errors=$(docker logs --since 1h "$container" 2>&1 \
                | grep -ciE '(ERROR|CRITICAL|FATAL|panic|OutOfMemoryError)' || true)

            if [[ "$container_errors" -gt 0 ]]; then
                log_warn "  ${YELLOW}!${NC} $container: $container_errors error(s) in last hour"
                # Show last 3 errors
                docker logs --since 1h "$container" 2>&1 \
                    | grep -iE '(ERROR|CRITICAL|FATAL|panic)' \
                    | tail -3 | while IFS= read -r err_line; do
                    log_warn "    → $err_line"
                done
                error_count=$((error_count + container_errors))
            else
                log_info "  ${GREEN}✓${NC} $container: no errors in last hour"
            fi
        done < <(docker compose -f "${APP_DIR}/docker-compose.yml" ps --format '{{.Name}}' 2>/dev/null)
    fi

    if [[ $error_count -gt 10 ]]; then
        add_warning "$error_count errors found in Docker logs in the last hour"
    fi

    add_check "docker_logs" "$([[ $error_count -eq 0 ]] && echo 'ok' || echo 'warning')" \
        "$error_count errors in last hour"
}

check_firewall() {
    log_step "Checking firewall (UFW)..."

    if command -v ufw &>/dev/null; then
        local ufw_status
        ufw_status=$(ufw status | head -1 || echo "unknown")

        if echo "$ufw_status" | grep -qi "active"; then
            log_info "  ${GREEN}✓${NC} UFW is active"
            add_check "ufw" "ok" "Firewall active"

            # Check critical rules
            if ufw status | grep -q "22/tcp"; then
                log_info "    SSH (22): allowed"
            else
                log_error "    SSH (22): NOT ALLOWED - you may be locked out!"
                add_error "UFW: SSH port 22 not allowed"
            fi

            if ufw status | grep -q "80/tcp"; then
                log_info "    HTTP (80): allowed"
            fi

            if ufw status | grep -q "443/tcp"; then
                log_info "    HTTPS (443): allowed"
            fi
        else
            log_warn "  ${YELLOW}!${NC} UFW is NOT active"
            add_check "ufw" "warning" "Firewall inactive"
            add_warning "UFW firewall is not active"
        fi
    else
        log_info "  UFW not installed"
        add_check "ufw" "ok" "UFW not installed"
    fi
}

check_fail2ban() {
    log_step "Checking fail2ban..."

    if systemctl is-active --quiet fail2ban 2>/dev/null; then
        log_info "  ${GREEN}✓${NC} fail2ban is active"

        # Show jail status
        local jails
        jails=$(fail2ban-client status 2>/dev/null | grep "Jail list" | sed 's/.*://;s/ //g' || echo "")
        if [[ -n "$jails" ]]; then
            log_info "  Active jails: $jails"
            for jail in ${jalls//,/ }; do
                local banned
                banned=$(fail2ban-client status "$jail" 2>/dev/null | grep "Currently banned" | awk '{print $NF}' || echo "0")
                log_info "    $jail: $banned banned IP(s)"
            done
        fi
        add_check "fail2ban" "ok" "Active with jails"
    elif command -v fail2ban-client &>/dev/null; then
        log_warn "  ${YELLOW}!${NC} fail2ban installed but not active"
        add_check "fail2ban" "warning" "Installed but not active"
        add_warning "fail2ban installed but not active"
    else
        log_info "  fail2ban not installed"
        add_check "fail2ban" "ok" "Not installed"
    fi
}

generate_report() {
    local timestamp
    timestamp=$(date -Iseconds)
    local hostname_val
    hostname_val=$(hostname)

    # Build JSON checks array
    local checks_json
    checks_json=$(printf '%s\n' "${CHECKS[@]}" | jq -s '.' 2>/dev/null || echo '[]')

    # Build warnings array
    local warnings_json
    warnings_json=$(printf '%s\n' "${WARNINGS[@]}" | jq -s '.' 2>/dev/null || echo '[]')

    # Build errors array
    local errors_json
    errors_json=$(printf '%s\n' "${ERRORS[@]}" | jq -s '.' 2>/dev/null || echo '[]')

    # Determine status string
    local status_str
    case $EXIT_CODE in
        0) status_str="healthy" ;;
        1) status_str="degraded" ;;
        2) status_str="critical" ;;
        *) status_str="unknown" ;;
    esac

    local report
    report=$(jq -n \
        --arg timestamp "$timestamp" \
        --arg hostname "$hostname_val" \
        --arg status "$status_str" \
        --argjson checks "$checks_json" \
        --argjson warnings "$warnings_json" \
        --argjson errors "$errors_json" \
        '{
            timestamp: $timestamp,
            hostname: $hostname,
            status: $status,
            checks: $checks,
            warnings: $warnings,
            errors: $errors
        }')

    echo "$report"
}

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

if [[ "$JSON_OUTPUT" == true ]]; then
    # JSON mode: suppress terminal colors and run all checks
    check_system_resources
    check_docker_containers
    check_service_health
    check_ssl_certificates
    check_docker_logs
    check_firewall
    check_fail2ban
    generate_report
    exit $EXIT_CODE
fi

# Terminal mode: run checks with formatted output
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║            HEALTH CHECK - $(date '+%Y-%m-%d %H:%M:%S')             ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

check_system_resources
echo ""
check_docker_containers
echo ""
check_service_health
echo ""
check_ssl_certificates
echo ""
check_docker_logs
echo ""
check_firewall
echo ""
check_fail2ban

# Print summary
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  HEALTH CHECK SUMMARY${NC}"
echo -e "${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""

case $EXIT_CODE in
    0)
        echo -e "  Overall status: ${GREEN}${BOLD}HEALTHY${NC} ✓"
        ;;
    1)
        echo -e "  Overall status: ${YELLOW}${BOLD}DEGRADED${NC} !"
        if [[ ${#WARNINGS[@]} -gt 0 ]]; then
            echo -e "  ${YELLOW}Warnings:${NC}"
            printf '    • %s\n' "${WARNINGS[@]}"
        fi
        ;;
    2)
        echo -e "  Overall status: ${RED}${BOLD}CRITICAL${NC} ✗"
        if [[ ${#ERRORS[@]} -gt 0 ]]; then
            echo -e "  ${RED}Errors:${NC}"
            printf '    • %s\n' "${ERRORS[@]}"
        fi
        ;;
esac

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""

log_info "Health check completed. Exit code: $EXIT_CODE"
exit $EXIT_CODE
