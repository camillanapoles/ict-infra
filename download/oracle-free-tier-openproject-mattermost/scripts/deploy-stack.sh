#!/bin/bash
# ==============================================================================
# deploy-stack.sh - Deploy the Docker Compose stack for OpenProject + Mattermost
# ==============================================================================
# Description: Pulls images, starts containers, waits for healthy state,
#              runs initial SSL setup, and performs smoke tests.
# Usage: sudo ./deploy-stack.sh [--env-file /opt/app/.env] [--skip-ssl]
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
SKIP_SSL=false

# ──────────────────────────────────────────────────────────────────────────────
# Help text
# ──────────────────────────────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${BOLD}deploy-stack.sh${NC} - Deploy OpenProject + Mattermost Docker Compose stack

${BOLD}USAGE:${NC}
    sudo ./deploy-stack.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    --env-file PATH   Path to .env file (default: /opt/app/.env)
    --skip-ssl        Skip initial SSL certificate setup
    --help, -h        Show this help message

${BOLD}DESCRIPTION:${NC}
    Pulls the latest Docker images, validates environment configuration,
    starts the entire stack, waits for all containers to become healthy,
    optionally provisions SSL certificates, and runs smoke tests against
    the OpenProject and Mattermost APIs.

${BOLD}REQUIREMENTS:${NC}
    - Run as root or docker-group user
    - .env file must exist with all required variables
    - docker-compose.yml must exist in /opt/app/
    - Internet connectivity for pulling images

EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ──────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env-file)
            ENV_FILE="$2"; shift 2 ;;
        --skip-ssl)
            SKIP_SSL=true; shift ;;
        --help|-h)
            show_help; exit 0 ;;
        *)
            log_error "Unknown argument: $1"
            show_help; exit 1 ;;
    esac
done

# ──────────────────────────────────────────────────────────────────────────────
# Functions
# ──────────────────────────────────────────────────────────────────────────────

# Wait for all containers to reach healthy state
# Arguments: $1 = timeout in seconds (default: 300)
wait_for_healthy() {
    local timeout="${1:-300}"
    local elapsed=0
    local interval=10

    log_info "Waiting for all containers to become healthy (timeout: ${timeout}s)..."

    while [[ $elapsed -lt $timeout ]]; do
        # Get list of services that should be healthy
        local unhealthy
        unhealthy=$(docker compose -f "${APP_DIR}/docker-compose.yml" ps \
            --format '{{.Name}} {{.Status}}' 2>/dev/null \
            | grep -v -E '(running|healthy|exited \(0\))' || true)

        if [[ -z "$unhealthy" ]]; then
            log_info "All containers are healthy! ✓"
            return 0
        fi

        log_info "  Waiting... (${elapsed}s / ${timeout}s) - Unhealthy:"
        echo "$unhealthy" | while read -r line; do
            log_info "    $line"
        done

        sleep "$interval"
        elapsed=$((elapsed + interval))
    done

    log_error "Timed out waiting for containers to become healthy after ${timeout}s."
    log_error "Check logs with: docker compose logs"
    return 1
}

# Run smoke tests against services
run_smoke_tests() {
    local failures=0

    log_step "Running smoke tests..."

    # Test OpenProject API
    log_info "Testing OpenProject API (http://localhost:8080/api/v3)..."
    if curl -sf --max-time 30 "http://localhost:8080/api/v3" > /dev/null 2>&1; then
        log_info "  OpenProject API: ${GREEN}OK${NC}"
    else
        log_error "  OpenProject API: ${RED}FAILED${NC}"
        failures=$((failures + 1))
    fi

    # Test Mattermost API
    log_info "Testing Mattermost API (http://localhost:8065/api/v4/system/ping)..."
    if curl -sf --max-time 30 "http://localhost:8065/api/v4/system/ping" > /dev/null 2>&1; then
        log_info "  Mattermost API: ${GREEN}OK${NC}"
    else
        log_error "  Mattermost API: ${RED}FAILED${NC}"
        failures=$((failures + 1))
    fi

    # Test Nginx HTTP
    log_info "Testing Nginx HTTP (http://localhost:80)..."
    if curl -sf --max-time 10 -o /dev/null -w "%{http_code}" "http://localhost:80" | grep -qE '^(200|301|302)$'; then
        log_info "  Nginx HTTP: ${GREEN}OK${NC}"
    else
        log_warn "  Nginx HTTP: ${YELLOW}CHECK NEEDED${NC} (may redirect to HTTPS)"
    fi

    return $failures
}

# ──────────────────────────────────────────────────────────────────────────────
# Main deployment process
# ──────────────────────────────────────────────────────────────────────────────

log_step "Starting deployment..."

# Source environment file
if [[ ! -f "$ENV_FILE" ]]; then
    log_error "Environment file not found: $ENV_FILE"
    log_error "Run ./setup-env.sh first to create the .env file."
    exit 1
fi

log_info "Loading environment from: $ENV_FILE"
set -a
source "$ENV_FILE"
set +a

# Change to app directory
cd "$APP_DIR"

# Validate required environment variables
log_step "Validating environment variables..."

REQUIRED_VARS=(
    "OPENPROJECT_DOMAIN"
    "MATTERMOST_DOMAIN"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB_OPENPROJECT"
    "POSTGRES_DB_MATTERMOST"
)

missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    log_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        log_error "  - $var"
    done
    exit 1
fi

log_info "All required environment variables are set. ✓"

# Verify docker-compose.yml exists
if [[ ! -f "${APP_DIR}/docker-compose.yml" ]]; then
    log_error "docker-compose.yml not found in ${APP_DIR}"
    exit 1
fi

# ── Pull latest images ──
log_step "Pulling latest Docker images..."
docker compose pull 2>&1 | while IFS= read -r line; do
    log_info "  $line"
done
log_info "Image pull complete."

# ── Stop existing containers ──
log_step "Stopping existing containers..."
if docker compose ps -q 2>/dev/null | grep -q .; then
    docker compose down --timeout 30
    log_info "Existing containers stopped."
else
    log_info "No existing containers to stop."
fi

# ── Start the stack ──
log_step "Starting Docker Compose stack..."
docker compose up -d

log_info "Containers started. Waiting for healthy state..."

# ── Wait for healthy state ──
if ! wait_for_healthy 300; then
    log_error "Stack did not reach healthy state. Printing container logs:"
    docker compose logs --tail=50
    exit 1
fi

# ── Print container status ──
log_info "Container status:"
docker compose ps

# ── Initial SSL certificate setup (optional) ──
if [[ "$SKIP_SSL" != true ]]; then
    log_step "Setting up SSL certificates..."

    # Check if certbot is available
    if command -v certbot &>/dev/null; then
        # Stop Nginx temporarily for standalone certbot
        docker compose stop nginx || true

        log_info "Requesting SSL certificate for ${OPENPROJECT_DOMAIN}..."
        certbot certonly --standalone \
            --non-interactive \
            --agree-tos \
            --email "${ADMIN_EMAIL:-admin@${OPENPROJECT_DOMAIN}}" \
            -d "$OPENPROJECT_DOMAIN" 2>&1 | tail -5 || \
            log_warn "Failed to get SSL cert for ${OPENPROJECT_DOMAIN}. You may need to set up DNS first."

        log_info "Requesting SSL certificate for ${MATTERMOST_DOMAIN}..."
        certbot certonly --standalone \
            --non-interactive \
            --agree-tos \
            --email "${ADMIN_EMAIL:-admin@${MATTERMOST_DOMAIN}}" \
            -d "$MATTERMOST_DOMAIN" 2>&1 | tail -5 || \
            log_warn "Failed to get SSL cert for ${MATTERMOST_DOMAIN}. You may need to set up DNS first."

        # Restart Nginx
        docker compose start nginx
        log_info "Nginx restarted with SSL configuration."
    else
        log_warn "Certbot not found. Skipping SSL setup. Run ./setup-ssl.sh separately."
    fi
fi

# ── Run smoke tests ──
log_step "Running smoke tests..."
smoke_result=0
run_smoke_tests || smoke_result=$?

# ── Deployment summary ──
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  DEPLOYMENT SUMMARY${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Services:${NC}"

# List all running containers with their ports
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
    docker compose ps

echo ""
echo -e "${BOLD}URLs:${NC}"
echo "  OpenProject  : https://${OPENPROJECT_DOMAIN}"
echo "  Mattermost   : https://${MATTERMOST_DOMAIN}"
echo ""
echo -e "${BOLD}Smoke Tests:${NC}"
if [[ $smoke_result -eq 0 ]]; then
    echo -e "  Result: ${GREEN}ALL PASSED${NC}"
else
    echo -e "  Result: ${RED}${smoke_result} FAILED${NC}"
    echo -e "  ${YELLOW}Check service logs: docker compose logs <service_name>${NC}"
fi
echo ""
echo -e "${BOLD}Useful Commands:${NC}"
echo -e "  View logs  : ${CYAN}docker compose logs -f${NC}"
echo -e "  Stop stack : ${CYAN}docker compose down${NC}"
echo -e "  Restart    : ${CYAN}docker compose restart${NC}"
echo -e "  Health check: ${CYAN}./health-check.sh${NC}"
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""

if [[ $smoke_result -gt 0 ]]; then
    log_warn "Deployment completed with ${smoke_result} failing smoke test(s)."
    exit 1
fi

log_info "Deployment completed successfully!"
