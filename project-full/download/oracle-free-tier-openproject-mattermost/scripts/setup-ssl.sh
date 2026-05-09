#!/bin/bash
# ==============================================================================
# setup-ssl.sh - SSL certificate setup with Let's Encrypt
# ==============================================================================
# Description: Provisions SSL/TLS certificates for OpenProject and Mattermost
#              using Let's Encrypt (certbot). Handles DNS validation, certificate
#              installation, renewal cron setup, and verification.
# Usage: sudo ./setup-ssl.sh [--env-file /opt/app/.env] [--staging] [--force]
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
STAGING=false
FORCE=false
CERTBOT_EMAIL=""

# ──────────────────────────────────────────────────────────────────────────────
# Help text
# ──────────────────────────────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${BOLD}setup-ssl.sh${NC} - SSL certificate setup with Let's Encrypt

${BOLD}USAGE:${NC}
    sudo ./setup-ssl.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    --env-file PATH   Path to .env file (default: /opt/app/.env)
    --staging         Use Let's Encrypt staging server (for testing)
    --force           Force certificate renewal even if not expired
    --help, -h        Show this help message

${BOLD}PREREQUISITES:${NC}
    - Certbot installed: apt install certbot python3-certbot-nginx
    - Nginx installed and configured
    - DNS A records pointing to this server's public IP
    - Ports 80 and 443 open in firewall
    - .env file with OPENPROJECT_DOMAIN, MATTERMOST_DOMAIN, ADMIN_EMAIL

${BOLD}DESCRIPTION:${NC}
    1. Verifies DNS resolution for both domains
    2. Stops Nginx temporarily (for standalone mode)
    3. Obtains SSL certificates from Let's Encrypt
    4. Configures automatic renewal
    5. Tests renewal with dry-run
    6. Restarts Nginx with SSL
    7. Verifies certificate installation

${BOLD}NOTES:${NC}
    - Let's Encrypt has rate limits (50 certs/week per domain).
      Use --staging for testing first.
    - Certificates are stored in /etc/letsencrypt/live/<domain>/
    - Renewal is automatic via cron (certbot renew runs twice daily)

EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ──────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env-file)
            ENV_FILE="$2"; shift 2 ;;
        --staging)
            STAGING=true; shift ;;
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

# Validate required variables
if [[ -z "${OPENPROJECT_DOMAIN:-}" ]]; then
    log_error "OPENPROJECT_DOMAIN not set in $ENV_FILE"
    exit 1
fi
if [[ -z "${MATTERMOST_DOMAIN:-}" ]]; then
    log_error "MATTERMOST_DOMAIN not set in $ENV_FILE"
    exit 1
fi

CERTBOT_EMAIL="${ADMIN_EMAIL:-admin@${OPENPROJECT_DOMAIN}}"

# ──────────────────────────────────────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────────────────────────────────────

# Check if a domain resolves to this server's public IP
check_dns() {
    local domain="$1"
    local expected_ip

    log_info "Checking DNS for: $domain"

    # Get this server's public IP (try multiple methods for Oracle Cloud)
    expected_ip=$(curl -sf --max-time 10 http://169.254.169.254/opc/v1/instance/ 2>/dev/null \
        | jq -r '.canonical_ips' 2>/dev/null | head -1 || echo "")

    if [[ -z "$expected_ip" ]]; then
        expected_ip=$(curl -sf --max-time 10 https://ifconfig.me 2>/dev/null || \
                      curl -sf --max-time 10 https://api.ipify.org 2>/dev/null || \
                      curl -sf --max-time 10 https://icanhazip.com 2>/dev/null || echo "")
    fi

    if [[ -z "$expected_ip" ]]; then
        log_warn "  Could not determine public IP. Skipping DNS check for $domain."
        return 0
    fi

    local resolved_ip
    resolved_ip=$(dig +short "$domain" A 2>/dev/null | tail -1 || echo "")

    if [[ -z "$resolved_ip" ]]; then
        resolved_ip=$(getent hosts "$domain" 2>/dev/null | awk '{print $1}' | head -1 || echo "")
    fi

    if [[ "$resolved_ip" == "$expected_ip" ]]; then
        log_info "  ${GREEN}✓${NC} $domain resolves to $expected_ip (matches this server)"
        return 0
    elif [[ -n "$resolved_ip" ]]; then
        log_warn "  ${YELLOW}!${NC} $domain resolves to $resolved_ip but this server's IP is $expected_ip"
        log_warn "  SSL certificate issuance may fail. Ensure DNS A record points to $expected_ip"
        return 1
    else
        log_error "  ${RED}✗${NC} $domain does not resolve to any IP address"
        return 1
    fi
}

# Get SSL certificate expiry date and days remaining
check_cert() {
    local domain="$1"
    local cert_path="/etc/letsencrypt/live/$domain/fullchain.pem"

    if [[ ! -f "$cert_path" ]]; then
        echo "NOT_FOUND"
        return
    fi

    local expiry_epoch now_epoch days_remaining
    expiry_epoch=$(date -d "$(openssl x509 -in "$cert_path" -noout -enddate 2>/dev/null \
        | cut -d= -f2)" +%s 2>/dev/null || echo "0")
    now_epoch=$(date +%s)

    if [[ "$expiry_epoch" -eq 0 ]]; then
        echo "INVALID"
        return
    fi

    days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))
    echo "$days_remaining"
}

# Verify SSL certificate on a domain
verify_ssl() {
    local domain="$1"
    local port="${2:-443}"

    log_info "Verifying SSL for $domain:$port..."

    echo | openssl s_client -servername "$domain" -connect "$domain":"$port" 2>/dev/null \
        | openssl x509 -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null || {
        log_error "  Could not verify SSL certificate."
        return 1
    }
}

# ──────────────────────────────────────────────────────────────────────────────
# Main SSL setup process
# ──────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║              SSL SETUP - $(date '+%Y-%m-%d %H:%M')                        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check DNS resolution ──
log_step "Step 1/8: Verifying DNS resolution..."

dns_ok=true
check_dns "$OPENPROJECT_DOMAIN" || dns_ok=false
check_dns "$MATTERMOST_DOMAIN" || dns_ok=false

if [[ "$dns_ok" != true && "$FORCE" != true ]]; then
    log_error "DNS verification failed for one or more domains."
    log_error "Fix DNS records before proceeding, or use --force to continue."
    exit 1
fi

if [[ "$dns_ok" != true ]]; then
    log_warn "Proceeding despite DNS issues (--force)."
fi

# ── Step 2: Verify prerequisites ──
log_step "Step 2/8: Verifying prerequisites..."

if ! command -v certbot &>/dev/null; then
    log_error "certbot is not installed."
    log_error "Install with: apt install -y certbot python3-certbot-nginx"
    exit 1
fi
log_info "  certbot: $(certbot --version 2>/dev/null | head -1)"

if ! command -v openssl &>/dev/null; then
    log_error "openssl is not installed."
    exit 1
fi
log_info "  openssl: $(openssl version 2>/dev/null)"

# Check ports 80 and 443 are available
if ss -tlnp | grep -q ':80 '; then
    log_info "  Port 80: in use ($(ss -tlnp | grep ':80 ' | head -1))"
else
    log_warn "  Port 80: not listening"
fi

if ss -tlnp | grep -q ':443 '; then
    log_info "  Port 443: in use ($(ss -tlnp | grep ':443 ' | head -1))"
else
    log_warn "  Port 443: not listening"
fi

# ── Step 3: Check existing certificates ──
log_step "Step 3/8: Checking existing certificates..."

op_cert_days=$(check_cert "$OPENPROJECT_DOMAIN")
mm_cert_days=$(check_cert "$MATTERMOST_DOMAIN")

if [[ "$op_cert_days" != "NOT_FOUND" && "$op_cert_days" != "INVALID" ]]; then
    if [[ "$op_cert_days" -gt 30 && "$FORCE" != true ]]; then
        log_info "  OpenProject certificate: valid for ${op_cert_days} days (skipping - use --force to renew)"
    else
        log_warn "  OpenProject certificate: ${op_cert_days} days remaining (will renew)"
    fi
else
    log_info "  OpenProject certificate: not found (will obtain)"
fi

if [[ "$mm_cert_days" != "NOT_FOUND" && "$mm_cert_days" != "INVALID" ]]; then
    if [[ "$mm_cert_days" -gt 30 && "$FORCE" != true ]]; then
        log_info "  Mattermost certificate: valid for ${mm_cert_days} days (skipping - use --force to renew)"
    else
        log_warn "  Mattermost certificate: ${mm_cert_days} days remaining (will renew)"
    fi
else
    log_info "  Mattermost certificate: not found (will obtain)"
fi

# ── Step 4: Stop Nginx for standalone certbot ──
log_step "Step 4/8: Stopping Nginx for standalone certificate issuance..."

# Stop Nginx container if running via Docker Compose
if [[ -f "${APP_DIR}/docker-compose.yml" ]]; then
    docker compose -f "${APP_DIR}/docker-compose.yml" stop nginx 2>/dev/null || \
        log_warn "  Could not stop Nginx container (may not be running)."
elif systemctl is-active --quiet nginx 2>/dev/null; then
    systemctl stop nginx
    log_info "  Nginx service stopped."
else
    log_info "  Nginx not running (no need to stop)."
fi

# Wait a moment for port to be released
sleep 2

# ── Step 5: Obtain SSL certificates ──
log_step "Step 5/8: Obtaining SSL certificates from Let's Encrypt..."

# Build certbot command with optional staging flag
CERTBOT_ARGS=()
if [[ "$STAGING" == true ]]; then
    CERTBOT_ARGS+=(--staging)
    log_warn "  Using Let's Encrypt STAGING server (certificates will not be trusted)."
fi

# OpenProject certificate
log_info "  Requesting certificate for: $OPENPROJECT_DOMAIN"
if certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$CERTBOT_EMAIL" \
    -d "$OPENPROJECT_DOMAIN" \
    "${CERTBOT_ARGS[@]}" 2>&1 | tail -5; then
    log_info "  ${GREEN}✓${NC} Certificate obtained for $OPENPROJECT_DOMAIN"
else
    log_error "  ${RED}✗${NC} Failed to obtain certificate for $OPENPROJECT_DOMAIN"
fi

# Mattermost certificate
log_info "  Requesting certificate for: $MATTERMOST_DOMAIN"
if certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$CERTBOT_EMAIL" \
    -d "$MATTERMOST_DOMAIN" \
    "${CERTBOT_ARGS[@]}" 2>&1 | tail -5; then
    log_info "  ${GREEN}✓${NC} Certificate obtained for $MATTERMOST_DOMAIN"
else
    log_error "  ${RED}✗${NC} Failed to obtain certificate for $MATTERMOST_DOMAIN"
fi

# ── Step 6: Setup automatic renewal ──
log_step "Step 6/8: Configuring automatic certificate renewal..."

# Create certbot renewal cron
cat > /etc/cron.d/certbot-renew <<EOF
# Certbot SSL renewal - twice daily
# Certbot only renews when certificate is within 30 days of expiry
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 2,14 * * * root certbot renew --quiet --deploy-hook "docker restart nginx || systemctl restart nginx || true" >> /var/log/incubadora/certbot-renew.log 2>&1
EOF
chmod 644 /etc/cron.d/certbot-renew

log_info "  Renewal cron installed (runs at 02:00 and 14:00 daily)."

# Test renewal with dry-run
log_info "  Testing renewal with --dry-run..."
if certbot renew --dry-run 2>&1 | tail -5; then
    log_info "  ${GREEN}✓${NC} Renewal dry-run successful."
else
    log_warn "  ${YELLOW}!${NC} Renewal dry-run failed. Check your configuration."
fi

# ── Step 7: Restart Nginx ──
log_step "Step 7/8: Restarting Nginx with SSL configuration..."

if [[ -f "${APP_DIR}/docker-compose.yml" ]]; then
    docker compose -f "${APP_DIR}/docker-compose.yml" start nginx 2>/dev/null || \
        docker compose -f "${APP_DIR}/docker-compose.yml" up -d nginx 2>/dev/null || \
        log_warn "  Could not start Nginx container."
    log_info "  Nginx container restarted."
elif systemctl list-unit-files | grep -q nginx.service; then
    systemctl start nginx
    log_info "  Nginx service restarted."
else
    log_warn "  No Nginx service or container found. Start manually."
fi

# ── Step 8: Verify SSL ──
log_step "Step 8/8: Verifying SSL certificates..."

echo ""
echo -e "${BOLD}OpenProject SSL ($OPENPROJECT_DOMAIN):${NC}"
verify_ssl "$OPENPROJECT_DOMAIN" || true

echo ""
echo -e "${BOLD}Mattermost SSL ($MATTERMOST_DOMAIN):${NC}"
verify_ssl "$MATTERMOST_DOMAIN" || true

# Print expiry dates
echo ""
log_info "Certificate expiry dates:"
op_days=$(check_cert "$OPENPROJECT_DOMAIN")
mm_days=$(check_cert "$MATTERMOST_DOMAIN")

if [[ "$op_days" =~ ^[0-9]+$ ]]; then
    op_expiry=$(openssl x509 -in "/etc/letsencrypt/live/$OPENPROJECT_DOMAIN/fullchain.pem" \
        -noout -enddate 2>/dev/null | cut -d= -f2)
    log_info "  $OPENPROJECT_DOMAIN : $op_expiry ($op_days days remaining)"
elif [[ "$op_days" == "NOT_FOUND" ]]; then
    log_warn "  $OPENPROJECT_DOMAIN : Certificate not found"
else
    log_warn "  $OPENPROJECT_DOMAIN : Invalid certificate"
fi

if [[ "$mm_days" =~ ^[0-9]+$ ]]; then
    mm_expiry=$(openssl x509 -in "/etc/letsencrypt/live/$MATTERMOST_DOMAIN/fullchain.pem" \
        -noout -enddate 2>/dev/null | cut -d= -f2)
    log_info "  $MATTERMOST_DOMAIN  : $mm_expiry ($mm_days days remaining)"
elif [[ "$mm_days" == "NOT_FOUND" ]]; then
    log_warn "  $MATTERMOST_DOMAIN  : Certificate not found"
else
    log_warn "  $MATTERMOST_DOMAIN  : Invalid certificate"
fi

# ── Final summary ──
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  SSL SETUP SUMMARY${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Domains:${NC}"
echo "  OpenProject : https://${OPENPROJECT_DOMAIN}"
echo "  Mattermost  : https://${MATTERMOST_DOMAIN}"
echo ""
echo -e "${BOLD}Certificate Storage:${NC}"
echo "  /etc/letsencrypt/live/${OPENPROJECT_DOMAIN}/"
echo "  /etc/letsencrypt/live/${MATTERMOST_DOMAIN}/"
echo ""
echo -e "${BOLD}Auto-Renewal:${NC}"
echo "  Cron schedule: Daily at 02:00 and 14:00"
echo "  Renewal window: Within 30 days of expiry"
echo "  Post-renewal: Nginx automatically restarted"
echo ""
echo -e "${BOLD}Manual Commands:${NC}"
echo "  Test renewal : ${CYAN}certbot renew --dry-run${NC}"
echo "  Force renew  : ${CYAN}certbot renew --force-renewal${NC}"
echo "  Check certs  : ${CYAN}certbot certificates${NC}"
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""

log_info "SSL setup completed!"
