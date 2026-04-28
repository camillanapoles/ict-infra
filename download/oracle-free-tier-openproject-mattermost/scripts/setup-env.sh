#!/bin/bash
# ==============================================================================
# setup-env.sh - Environment file setup and management
# ==============================================================================
# Description: Creates or updates the .env file for the Docker Compose stack.
#              Generates secure random passwords, prompts for user input,
#              optionally fetches secrets from OCI Vault, and validates the
#              resulting configuration.
# Usage: sudo ./setup-env.sh [--env-file /opt/app/.env] [--from-oci-vault]
#                            [--non-interactive] [--help]
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
ENV_EXAMPLE="${APP_DIR}/.env.example"
FROM_VAULT=false
NON_INTERACTIVE=false

# ──────────────────────────────────────────────────────────────────────────────
# Help text
# ──────────────────────────────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${BOLD}setup-env.sh${NC} - Environment file setup and management

${BOLD}USAGE:${NC}
    sudo ./setup-env.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    --env-file PATH       Path to .env file (default: /opt/app/.env)
    --from-oci-vault      Fetch secrets from OCI Vault
    --non-interactive     Use defaults / environment variables (no prompts)
    --help, -h            Show this help message

${BOLD}DESCRIPTION:${NC}
    Creates the .env configuration file required by docker-compose.yml.

    ${BOLD}Password Generation:${NC}
      - PostgreSQL password: 32-character alphanumeric random string
      - OpenProject secret key: 64-character hex string
      - Mattermost signing key: 32-character base64 string

    ${BOLD}User Prompts:${NC}
      - OpenProject domain (e.g., project.example.com)
      - Mattermost domain (e.g., chat.example.com)
      - Admin email address
      - SMTP settings (optional, for email notifications)
      - Mattermost site URL

    ${BOLD}OCI Vault Integration:${NC}
      If --from-oci-vault is used, the script attempts to fetch
      secrets from OCI Vault using the OCI CLI. Secrets must be
      stored with specific secret names:
        - incubadora-postgres-password
        - incubadora-openproject-secret-key
        - incubadora-mattermost-signing-key

    ${BOLD}Security:${NC}
      - Generated passwords use /dev/urandom (cryptographically secure)
      - .env file is created with 600 permissions (owner read/write only)
      - Existing .env file is backed up before overwriting

EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ──────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env-file)
            ENV_FILE="$2"; shift 2 ;;
        --from-oci-vault)
            FROM_VAULT=true; shift ;;
        --non-interactive)
            NON_INTERACTIVE=true; shift ;;
        --help|-h)
            show_help; exit 0 ;;
        *)
            log_error "Unknown argument: $1"
            show_help; exit 1 ;;
    esac
done

# ──────────────────────────────────────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────────────────────────────────────

# Generate a secure random password
# Arguments: $1 = length (default: 32)
generate_password() {
    local length="${1:-32}"
    tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$length"
}

# Generate a hex string (for secret keys)
# Arguments: $1 = byte count (default: 32, produces 64 hex chars)
generate_hex() {
    local bytes="${1:-32}"
    openssl rand -hex "$bytes" 2>/dev/null || \
        tr -dc 'a-f0-9' < /dev/urandom | head -c $((bytes * 2))
}

# Generate a base64 string (for signing keys)
# Arguments: $1 = byte count (default: 32)
generate_base64() {
    local bytes="${1:-32}"
    openssl rand -base64 "$bytes" 2>/dev/null | tr -d '\n' || \
        head -c "$bytes" /dev/urandom | base64 | tr -d '\n'
}

# Prompt user for input with a default value
# Arguments: $1 = prompt text, $2 = default value, $3 = variable name to set
prompt_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"

    if [[ "$NON_INTERACTIVE" == true ]]; then
        eval "$var_name=\"\$default\""
        log_info "  $var_name: $default (non-interactive mode)"
        return 0
    fi

    local input
    if [[ -n "$default" ]]; then
        read -rp "  $prompt [$default]: " input
        input="${input:-$default}"
    else
        read -rp "  $prompt: " input
    fi

    eval "$var_name=\"\$input\""
}

# Prompt for password (hidden input)
# Arguments: $1 = prompt text, $2 = variable name to set
prompt_password() {
    local prompt="$1"
    local var_name="$2"

    if [[ "$NON_INTERACTIVE" == true ]]; then
        eval "$var_name=\"\$(generate_password)\""
        log_info "  $var_name: <auto-generated> (non-interactive mode)"
        return 0
    fi

    local password1 password2
    while true; do
        read -rsp "  $prompt: " password1
        echo ""
        read -rsp "  Confirm $prompt: " password2
        echo ""

        if [[ "$password1" == "$password2" ]]; then
            if [[ ${#password1} -ge 8 ]]; then
                break
            else
                log_warn "  Password must be at least 8 characters. Try again."
            fi
        else
            log_warn "  Passwords do not match. Try again."
        fi
    done

    eval "$var_name=\"\$password1\""
}

# Fetch secret from OCI Vault
# Arguments: $1 = secret name
fetch_vault_secret() {
    local secret_name="$1"

    if ! command -v oci &>/dev/null; then
        return 1
    fi

    local vault_id="${OCI_VAULT_ID:-}"
    local compartment_id="${OCI_COMPARTMENT_ID:-}"

    if [[ -z "$vault_id" || -z "$compartment_id" ]]; then
        return 1
    fi

    oci secrets secret-bundle get \
        --secret-id "$(oci secrets secret list \
            --compartment-id "$compartment_id" \
            --name "$secret_name" \
            --vault-id "$vault_id" \
            --output json 2>/dev/null | jq -r '.data[0].id')" \
        --output json 2>/dev/null \
        | jq -r '.data."secret-bundle-content".content' \
        | base64 -d 2>/dev/null || true
}

# Validate the generated .env file
validate_env() {
    local file="$1"
    local errors=0

    log_info "Validating $file..."

    # Check file exists and is readable
    if [[ ! -f "$file" ]]; then
        log_error "File does not exist: $file"
        return 1
    fi

    # Check for required variables
    local required_vars=(
        "OPENPROJECT_DOMAIN"
        "MATTERMOST_DOMAIN"
        "POSTGRES_PASSWORD"
        "POSTGRES_DB_OPENPROJECT"
        "POSTGRES_DB_MATTERMOST"
    )

    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" "$file"; then
            local value
            value=$(grep "^${var}=" "$file" | cut -d'=' -f2-)
            if [[ -z "$value" ]]; then
                log_error "  $var is empty!"
                errors=$((errors + 1))
            else
                log_info "  ${GREEN}✓${NC} $var is set"
            fi
        else
            log_error "  $var is missing!"
            errors=$((errors + 1))
        fi
    done

    # Check for common issues
    if grep -q 'PASSWORD=""' "$file" || grep -q 'PASSWORD= ' "$file"; then
        log_error "  Empty password detected!"
        errors=$((errors + 1))
    fi

    # Check for spaces around = (common mistake)
    if grep -qE '^[A-Z]+ =|^ [A-Z]+=' "$file"; then
        log_warn "  Some variables have spaces around '='. This may cause issues."
    fi

    # Check for unquoted special characters in values
    if grep -qE '^[A-Z_]+=\$' "$file"; then
        log_warn "  Dollar signs in values should be quoted or escaped."
    fi

    return $errors
}

# ──────────────────────────────────────────────────────────────────────────────
# Main setup process
# ──────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║         ENVIRONMENT SETUP - $(date '+%Y-%m-%d %H:%M')                   ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check if .env already exists ──
log_step "Step 1/7: Checking for existing .env file..."

if [[ -f "$ENV_FILE" ]]; then
    log_warn "Existing .env file found at: $ENV_FILE"

    if [[ "$NON_INTERACTIVE" != true ]]; then
        read -rp "  Overwrite existing .env file? [y/N]: " overwrite
        overwrite="${overwrite:-n}"

        if [[ "$overwrite" =~ ^[Nn] ]]; then
            log_info "Keeping existing .env file. Use --env-file to specify a different path."
            exit 0
        fi
    fi

    # Backup existing file
    local backup_name="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$ENV_FILE" "$backup_name"
    log_info "Existing .env backed up to: $backup_name"

    # Load existing values as defaults
    set -a
    source "$ENV_FILE"
    set +a
fi

# Ensure directory exists
mkdir -p "$(dirname "$ENV_FILE")"

# ── Step 2: Generate or fetch secrets ──
log_step "Step 2/7: Setting up secrets..."

# PostgreSQL password
if [[ "$FROM_VAULT" == true ]]; then
    log_info "Attempting to fetch secrets from OCI Vault..."
    POSTGRES_PASSWORD=$(fetch_vault_secret "incubadora-postgres-password") || true
    OPENPROJECT_SECRET_KEY=$(fetch_vault_secret "incubadora-openproject-secret-key") || true
    MATTERMOST_SIGNING_KEY=$(fetch_vault_secret "incubadora-mattermost-signing-key") || true
fi

# Generate if not fetched from vault
if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
    POSTGRES_PASSWORD=$(generate_password 32)
fi
if [[ -z "${OPENPROJECT_SECRET_KEY:-}" ]]; then
    OPENPROJECT_SECRET_KEY=$(generate_hex 32)
fi
if [[ -z "${MATTERMOST_SIGNING_KEY:-}" ]]; then
    MATTERMOST_SIGNING_KEY=$(generate_base64 32)
fi

log_info "  PostgreSQL password:      <generated> (${#POSTGRES_PASSWORD} chars)"
log_info "  OpenProject secret key:   <generated> (${#OPENPROJECT_SECRET_KEY} chars)"
log_info "  Mattermost signing key:   <generated> (${#MATTERMOST_SIGNING_KEY} chars)"

# ── Step 3: Prompt for domain configuration ──
log_step "Step 3/7: Domain configuration..."

prompt_input "OpenProject domain" "${OPENPROJECT_DOMAIN:-project.example.com}" OPENPROJECT_DOMAIN
prompt_input "Mattermost domain" "${MATTERMOST_DOMAIN:-chat.example.com}" MATTERMOST_DOMAIN

# Validate domain format
for domain in "$OPENPROJECT_DOMAIN" "$MATTERMOST_DOMAIN"; do
    if [[ ! "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$ ]]; then
        log_error "Invalid domain format: $domain"
        exit 1
    fi
done

if [[ "$OPENPROJECT_DOMAIN" == "$MATTERMOST_DOMAIN" ]]; then
    log_error "OpenProject and Mattermost domains cannot be the same!"
    exit 1
fi

# ── Step 4: Prompt for email and SMTP settings ──
log_step "Step 4/7: Email and SMTP configuration..."

prompt_input "Admin email address" "${ADMIN_EMAIL:-admin@example.com}" ADMIN_EMAIL

# SMTP settings (optional)
echo ""
log_info "SMTP settings (press Enter to skip and use defaults):"
prompt_input "SMTP host" "${SMTP_HOST:-smtp.gmail.com}" SMTP_HOST
prompt_input "SMTP port" "${SMTP_PORT:-587}" SMTP_PORT
prompt_input "SMTP username" "${SMTP_USERNAME:-}" SMTP_USERNAME
prompt_input "SMTP password" "${SMTP_PASSWORD:-}" SMTP_PASSWORD
prompt_input "SMTP from address" "${SMTP_FROM_ADDRESS:-noreply@${OPENPROJECT_DOMAIN}}" SMTP_FROM_ADDRESS
prompt_input "Use TLS for SMTP? (true/false)" "${SMTP_TLS:-true}" SMTP_TLS

# ── Step 5: Prompt for database settings ──
log_step "Step 5/7: Database configuration..."

prompt_input "PostgreSQL user" "${POSTGRES_USER:-postgres}" POSTGRES_USER
prompt_input "OpenProject database name" "${POSTGRES_DB_OPENPROJECT:-openproject}" POSTGRES_DB_OPENPROJECT
prompt_input "Mattermost database name" "${POSTGRES_DB_MATTERMOST:-mattermost}" POSTGRES_DB_MATTERMOST

# ── Step 6: Write .env file ──
log_step "Step 6/7: Writing .env file..."

cat > "$ENV_FILE" <<ENVFILE
# ═══════════════════════════════════════════════════════════════════════════════
# OpenProject + Mattermost Environment Configuration
# Auto-generated by setup-env.sh on $(date '+%Y-%m-%d %H:%M:%S')
# ═══════════════════════════════════════════════════════════════════════════════

# ── Domain Configuration ─────────────────────────────────────────────────────
OPENPROJECT_DOMAIN=${OPENPROJECT_DOMAIN}
MATTERMOST_DOMAIN=${MATTERMOST_DOMAIN}

# ── Admin Configuration ──────────────────────────────────────────────────────
ADMIN_EMAIL=${ADMIN_EMAIL}

# ── PostgreSQL Configuration ─────────────────────────────────────────────────
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB_OPENPROJECT=${POSTGRES_DB_OPENPROJECT}
POSTGRES_DB_MATTERMOST=${POSTGRES_DB_MATTERMOST}
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# ── OpenProject Configuration ────────────────────────────────────────────────
OPENPROJECT_SECRET_KEY=${OPENPROJECT_SECRET_KEY}
OPENPROJECT_HOST=${OPENPROJECT_DOMAIN}
OPENPROJECT_HTTPS=true
OPENPROJECT_DEFAULT_LANGUAGE=en

# ── Mattermost Configuration ─────────────────────────────────────────────────
MATTERMOST_SECRET_KEY=${OPENPROJECT_SECRET_KEY}
MATTERMOST_SIGNING_KEY=${MATTERMOST_SIGNING_KEY}
MATTERMOST_SITE_URL=https://${MATTERMOST_DOMAIN}
MATTERMOST_DB_DRIVER=postgres

# ── SMTP Configuration (Email) ───────────────────────────────────────────────
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USERNAME=${SMTP_USERNAME}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM_ADDRESS=${SMTP_FROM_ADDRESS}
SMTP_TLS=${SMTP_TLS}
SMTP_AUTHENTICATION=login

# ── Memcached Configuration ──────────────────────────────────────────────────
MEMCACHED_HOST=memcached
MEMCACHED_PORT=11211

# ── OCI Object Storage (Backups) ────────────────────────────────────────────
# OCI_BUCKET_NAME=
# OCI_NAMESPACE=

# ── OCI Vault (Secrets) ──────────────────────────────────────────────────────
# OCI_VAULT_ID=
# OCI_COMPARTMENT_ID=
ENVFILE

log_info "  .env file written to: $ENV_FILE"

# ── Set proper permissions ──
chmod 600 "$ENV_FILE"
chown root:root "$ENV_FILE" 2>/dev/null || true
log_info "  Permissions set: 600 (owner read/write only)"

# ── Step 7: Validate the .env file ──
log_step "Step 7/7: Validating .env file..."

validate_errors=0
validate_env "$ENV_FILE" || validate_errors=$?

if [[ $validate_errors -gt 0 ]]; then
    log_error "Validation found ${validate_errors} error(s)."
    log_error "Please review and fix $ENV_FILE before deploying."
    exit 1
fi

# ── Summary ──
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ENVIRONMENT SETUP SUMMARY${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Configuration File:${NC}"
echo "  Location: $ENV_FILE"
echo "  Permissions: $(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%Lp' "$ENV_FILE")"
echo "  Size: $(wc -l < "$ENV_FILE") lines"
echo ""
echo -e "${BOLD}Domains:${NC}"
echo "  OpenProject : https://${OPENPROJECT_DOMAIN}"
echo "  Mattermost  : https://${MATTERMOST_DOMAIN}"
echo ""
echo -e "${BOLD}Database:${NC}"
echo "  Host        : postgres (Docker network)"
echo "  User        : ${POSTGRES_USER}"
echo "  Databases   : ${POSTGRES_DB_OPENPROJECT}, ${POSTGRES_DB_MATTERMOST}"
echo ""
echo -e "${BOLD}Email:${NC}"
echo "  Admin       : ${ADMIN_EMAIL}"
echo "  SMTP        : ${SMTP_HOST}:${SMTP_PORT}"
echo "  From        : ${SMTP_FROM_ADDRESS}"
echo "  TLS         : ${SMTP_TLS}"
echo ""
echo -e "${BOLD}Security:${NC}"
echo -e "  PostgreSQL password:  ${RED}<secure - not shown>${NC}"
echo -e "  Secret keys:         ${RED}<secure - not shown>${NC}"
echo -e "  ${YELLOW}IMPORTANT: Save these passwords securely!${NC}"
echo -e "  ${YELLOW}They cannot be recovered from the .env file if lost.${NC}"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo "  1. ${CYAN}sudo ./deploy-stack.sh${NC}"
echo "  2. ${CYAN}sudo ./setup-ssl.sh${NC}"
echo "  3. Access OpenProject at: ${CYAN}https://${OPENPROJECT_DOMAIN}${NC}"
echo "  4. Access Mattermost at:  ${CYAN}https://${MATTERMOST_DOMAIN}${NC}"
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""

log_info "Environment setup completed successfully!"
