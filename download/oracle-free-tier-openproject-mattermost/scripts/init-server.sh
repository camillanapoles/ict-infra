#!/bin/bash
# ==============================================================================
# init-server.sh - Master initialization script for Oracle Cloud Free Tier VM
# ==============================================================================
# Description: First-boot server setup for OpenProject + Mattermost deployment
# Target: Oracle A1 Flex VM (4 OCPU / 24 GB RAM), Ubuntu 22.04
# Usage: sudo ./init-server.sh --domain-op project.example.com \
#         --domain-mm chat.example.com --email admin@example.com \
#         --env-file /opt/app/.env
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
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" >&2; }
log_step()  { echo -e "${BLUE}${BOLD}[STEP]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $*"; }

# ──────────────────────────────────────────────────────────────────────────────
# Help text
# ──────────────────────────────────────────────────────────────────────────────
show_help() {
    cat <<EOF
${BOLD}init-server.sh${NC} - Master initialization for Oracle Cloud Free Tier VM

${BOLD}USAGE:${NC}
    sudo ./init-server.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    --domain-op DOMAIN    OpenProject domain (e.g., project.example.com)
    --domain-mm DOMAIN    Mattermost domain (e.g., chat.example.com)
    --email EMAIL         Admin email for SSL and notifications
    --env-file PATH       Path to write .env file (default: /opt/app/.env)
    --help, -h            Show this help message

${BOLD}DESCRIPTION:${NC}
    Initializes a fresh Ubuntu 22.04 VM on Oracle Cloud Free Tier for
    running OpenProject + Mattermost with Docker Compose. Configures
    system packages, firewall, swap, cron jobs, and directory structure.

${BOLD}REQUIREMENTS:${NC}
    - Run as root (sudo)
    - Ubuntu 22.04 LTS
    - Internet connectivity
    - Minimum 4 OCPU / 24 GB RAM VM shape

EOF
}

# ──────────────────────────────────────────────────────────────────────────────
# Parse command-line arguments
# ──────────────────────────────────────────────────────────────────────────────
DOMAIN_OP=""
DOMAIN_MM=""
ADMIN_EMAIL=""
ENV_FILE="/opt/app/.env"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain-op)
            DOMAIN_OP="$2"; shift 2 ;;
        --domain-mm)
            DOMAIN_MM="$2"; shift 2 ;;
        --email)
            ADMIN_EMAIL="$2"; shift 2 ;;
        --env-file)
            ENV_FILE="$2"; shift 2 ;;
        --help|-h)
            show_help; exit 0 ;;
        *)
            log_error "Unknown argument: $1"
            show_help; exit 1 ;;
    esac
done

# Validate required arguments
if [[ -z "$DOMAIN_OP" ]]; then
    log_error "Missing required argument: --domain-op"
    show_help; exit 1
fi
if [[ -z "$DOMAIN_MM" ]]; then
    log_error "Missing required argument: --domain-mm"
    show_help; exit 1
fi
if [[ -z "$ADMIN_EMAIL" ]]; then
    log_error "Missing required argument: --email"
    show_help; exit 1
fi

# Must be root
if [[ "$(id -u)" -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)."
    exit 1
fi

log_info "Starting server initialization..."
log_info "  OpenProject domain : $DOMAIN_OP"
log_info "  Mattermost domain  : $DOMAIN_MM"
log_info "  Admin email        : $ADMIN_EMAIL"
log_info "  Env file           : $ENV_FILE"

# ──────────────────────────────────────────────────────────────────────────────
# Step 1: Update system packages
# ──────────────────────────────────────────────────────────────────────────────
log_step "Step 1/12: Updating system packages"
export DEBIAN_FRONTEND=noninteractive
apt update -y
apt upgrade -y

log_info "System packages updated successfully."

# ──────────────────────────────────────────────────────────────────────────────
# Step 2: Install dependencies
# ──────────────────────────────────────────────────────────────────────────────
log_step "Step 2/12: Installing dependencies"

# Install Docker from Docker's official repository
apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list

apt update -y

# Install core packages
apt install -y \
    docker.io \
    docker-compose-plugin \
    nginx \
    certbot \
    python3-certbot-nginx \
    python3-pip \
    jq \
    curl \
    wget \
    git \
    htop \
    ncdu \
    fail2ban \
    ufw \
    software-properties-common \
    apt-transport-https \
    logrotate

log_info "All dependencies installed successfully."

# ──────────────────────────────────────────────────────────────────────────────
# Step 3: Configure Docker
# ──────────────────────────────────────────────────────────────────────────────
log_step "Step 3/12: Configuring Docker"

# Enable and start Docker service
systemctl enable docker
systemctl start docker

# Add ubuntu user to docker group (allows running docker without sudo)
if id "ubuntu" &>/dev/null; then
    usermod -aG docker ubuntu
    log_info "User 'ubuntu' added to docker group."
else
    log_warn "User 'ubuntu' not found; skipping docker group assignment."
fi

# Configure Docker daemon for better performance and logging
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "live-restore": true
}
EOF

systemctl daemon-reload
systemctl restart docker

log_info "Docker configured and running."

# ──────────────────────────────────────────────────────────────────────────────
# Step 4: Configure UFW Firewall
# ──────────────────────────────────────────────────────────────────────────────
log_step "Step 4/12: Configuring UFW firewall"

# Reset UFW to defaults (safe starting point)
ufw --force reset

# Default policies: deny incoming, allow outgoing
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (port 22)
ufw allow 22/tcp comment 'SSH remote access'

# Allow HTTP (port 80) for Let's Encrypt and web traffic
ufw allow 80/tcp comment 'HTTP - Web traffic and certbot'

# Allow HTTPS (port 443) for encrypted web traffic
ufw allow 443/tcp comment 'HTTPS - Encrypted web traffic'

# Allow internal network access (Oracle Cloud metadata and internal comms)
ufw allow from 10.0.0.0/16 comment 'Oracle Cloud internal network'

# Allow Docker bridge network communication
ufw allow from 172.16.0.0/12 comment 'Docker and internal networks'

# Ensure SSH is allowed BEFORE enabling (safety check)
ufw status numbered | grep -q "22/tcp" || {
    log_error "SSH rule not found! Refusing to enable UFW."
    exit 1
}

# Enable UFW
ufw --force enable

log_info "UFW firewall configured and enabled."
ufw status verbose

# ──────────────────────────────────────────────────────────────────────────────
# Step 5: Configure fail2ban for SSH protection
# ──────────────────────────────────────────────────────────────────────────────
log_step "Step 5/12: Configuring fail2ban"

cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
# Ban hosts for 1 hour on 5 failed attempts
bantime  = 3600
findtime = 600
maxretry = 5
# Use UFW as the banning action (works well with our firewall)
banaction = ufw
# Log paths
backend   = systemd

[sshd]
enabled   = true
port      = ssh
filter    = sshd
logpath   = /var/log/auth.log
maxretry  = 3
bantime   = 7200
findtime  = 600

[nginx-http-auth]
enabled  = true
filter   = nginx-http-auth
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban

log_info "fail2ban configured for SSH and Nginx protection."

# ──────────────────────────────────────────────────────────────────────────────
# Step 6: Create /opt/app directory structure
# ──────────────────────────────────────────────────────────────────────────────
log_step "Step 6/12: Creating /opt/app directory structure"

mkdir -p /opt/app/{nginx/conf.d,nginx/ssl,certs,scripts,logs}
mkdir -p /opt/backups/{daily,weekly,monthly}
mkdir -p /var/log/incubadora

# Set ownership so ubuntu user can manage files
chown -R ubuntu:ubuntu /opt/app /opt/backups
chmod -R 755 /opt/app /opt/backups

log_info "Directory structure created at /opt/app and /opt/backups."

# ──────────────────────────────────────────────────────────────────────────────
# Step 7: Setup log rotation for Docker containers
# ──────────────────────────────────────────────────────────────────────────────
log_step "Step 7/12: Configuring log rotation"

cat > /etc/logrotate.d/docker-containers <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size 50M
    missingok
    delaycompress
    copytruncate
}
EOF

# Also rotate our application logs
cat > /etc/logrotate.d/incubadora <<EOF
/var/log/incubadora/*.log {
    rotate 30
    daily
    compress
    missingok
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
}
EOF

log_info "Log rotation configured for Docker and application logs."

# ──────────────────────────────────────────────────────────────────────────────
# Step 8: Configure swap (4GB for memory safety on A1 Flex)
# ──────────────────────────────────────────────────────────────────────────────
log_step "Step 8/12: Configuring 4GB swap file"

SWAP_FILE="/swapfile"
SWAP_SIZE="4G"

# Check if swap already exists and is the right size
if swapon --show | grep -q "$SWAP_FILE"; then
    current_size=$(swapon --show=SIZE --noheadings "$SWAP_FILE" 2>/dev/null || echo "0")
    log_info "Swap file already exists (size: ${current_size}). Skipping creation."
else
    log_info "Creating ${SWAP_SIZE} swap file at ${SWAP_FILE}..."

    # Allocate swap file
    fallocate -l "$SWAP_SIZE" "$SWAP_FILE"
    chmod 600 "$SWAP_FILE"
    mkswap "$SWAP_FILE"
    swapon "$SWAP_FILE"

    # Make swap persistent across reboots
    if ! grep -q "$SWAP_FILE" /etc/fstab; then
        echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
        log_info "Swap entry added to /etc/fstab."
    fi
fi

# Set swappiness to a low value (prefer RAM, use swap as safety net)
sysctl -w vm.swappiness=10

log_info "Swap configured: $(swapon --show)"

# ──────────────────────────────────────────────────────────────────────────────
# Step 9: Configure sysctl for performance optimization
# ──────────────────────────────────────────────────────────────────────────────
log_step "Step 9/12: Tuning kernel parameters"

cat > /etc/sysctl.d/99-incubadora.conf <<EOF
# ── Memory Management ──────────────────────────────────────────────
# Low swappiness: prefer keeping data in RAM (we have 24 GB)
vm.swappiness = 10
# Minimize swapping even under memory pressure
vm.vfs_cache_pressure = 50

# ── Network Optimization ───────────────────────────────────────────
# Increase max connection backlog for high-traffic services
net.core.somaxconn = 65535
# Allow more socket connections in TIME_WAIT
net.ipv4.tcp_max_syn_backlog = 65535
# Enable TCP Fast Open for reduced latency
net.ipv4.tcp_fastopen = 3
# Reuse TIME_WAIT sockets for new connections
net.ipv4.tcp_tw_reuse = 1
# Keepalive settings: detect dead connections faster
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5
# Increase max file descriptors
fs.file-max = 2097152
# Increase max inotify watches (needed by some services)
fs.inotify.max_user_watches = 524288

# ── Security ───────────────────────────────────────────────────────
# Disable IP source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
# Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
# Enable SYN cookies (SYN flood protection)
net.ipv4.tcp_syncookies = 1
# Log martian packets (suspicious source-routed packets)
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# ── PostgreSQL Optimization ────────────────────────────────────────
# Increase shared memory segments
kernel.shmmax = 68719476736
kernel.shmall = 4294967296
EOF

# Apply sysctl settings immediately
sysctl --system > /dev/null 2>&1

log_info "Kernel parameters tuned and applied."

# ──────────────────────────────────────────────────────────────────────
# Step 10: Setup cron jobs
# ──────────────────────────────────────────────────────────────────────
log_step "Step 10/12: Setting up cron jobs"

SCRIPT_DIR="/opt/app/scripts"

# ── Weekly Docker system prune (Sundays at 3:00 AM) ──
cat > /etc/cron.d/docker-prune <<EOF
# Docker system prune - runs weekly on Sundays at 03:00
# Removes unused images, containers, networks, and build cache
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 3 * * 0 root docker system prune -af --volumes >> /var/log/incubadora/docker-prune.log 2>&1
EOF

# ── Certbot renewal twice daily ──
cat > /etc/cron.d/certbot-renew <<EOF
# Certbot SSL renewal attempts - twice daily at 02:00 and 14:00
# Certbot only renews certificates when they are within 30 days of expiry
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 2,14 * * * root certbot renew --quiet --deploy-hook "docker restart nginx" >> /var/log/incubadora/certbot-renew.log 2>&1
EOF

# ── Daily backup at 01:00 AM ──
cat > /etc/cron.d/incubadora-backup <<EOF
# Daily backup of databases and data volumes
# Runs at 01:00 AM every day
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 1 * * * root ${SCRIPT_DIR}/backup.sh >> /var/log/incubadora/backup.log 2>&1
EOF

chmod 644 /etc/cron.d/docker-prune /etc/cron.d/certbot-renew /etc/cron.d/incubadora-backup

log_info "Cron jobs installed:"
log_info "  - Docker prune     : Weekly (Sun 03:00)"
log_info "  - Certbot renewal  : Twice daily (02:00, 14:00)"
log_info "  - Backup           : Daily (01:00)"

# ──────────────────────────────────────────────────────────────────────
# Step 11: Increase file descriptor limits for ubuntu user
# ──────────────────────────────────────────────────────────────────────
log_step "Step 11/12: Setting file descriptor limits"

cat > /etc/security/limits.d/99-incubadora.conf <<EOF
# Increase file descriptor limits for the application user
ubuntu   soft   nofile   65535
ubuntu   hard   nofile   65535
ubuntu   soft   nproc    65535
ubuntu   hard   nproc    65535
root     soft   nofile   65535
root     hard   nofile   65535
EOF

log_info "File descriptor limits set to 65535."

# ──────────────────────────────────────────────────────────────────────
# Step 12: Print summary
# ──────────────────────────────────────────────────────────────────────
log_step "Step 12/12: Initialization complete!"

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  SERVER INITIALIZATION SUMMARY${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}System Configuration:${NC}"
echo "  OS              : $(lsb_release -ds)"
echo "  Kernel          : $(uname -r)"
echo "  CPU             : $(nproc) cores"
echo "  Memory          : $(free -h | awk '/Mem:/{print $2}')"
echo "  Swap            : $(swapon --show=SIZE --noheadings)"
echo "  Disk (root)     : $(df -h / | awk 'NR==2{print $4}') free"
echo ""
echo -e "${BOLD}Installed Packages:${NC}"
echo "  Docker          : $(docker --version 2>/dev/null | grep -oP 'Docker version \K[^,]+' || echo 'NOT INSTALLED')"
echo "  Docker Compose  : $(docker compose version 2>/dev/null | grep -oP 'v\K[^ ]+' || echo 'NOT INSTALLED')"
echo "  Nginx           : $(nginx -v 2>&1 | grep -oP 'nginx/\K[^ ]+' || echo 'NOT INSTALLED')"
echo "  Certbot         : $(certbot --version 2>/dev/null | grep -oP 'certbot \K[^ ]+' || echo 'NOT INSTALLED')"
echo ""
echo -e "${BOLD}Firewall (UFW):${NC}"
echo "  Status          : $(ufw status | head -1)"
echo "  SSH (22)        : ALLOWED"
echo "  HTTP (80)       : ALLOWED"
echo "  HTTPS (443)     : ALLOWED"
echo ""
echo -e "${BOLD}Security:${NC}"
echo "  fail2ban        : $(systemctl is-active fail2ban)"
echo "  Docker group    : $(groups ubuntu 2>/dev/null | grep -o docker || echo 'not set')"
echo ""
echo -e "${BOLD}Domains:${NC}"
echo "  OpenProject     : https://${DOMAIN_OP}"
echo "  Mattermost      : https://${DOMAIN_MM}"
echo "  Admin email     : ${ADMIN_EMAIL}"
echo ""
echo -e "${BOLD}Directories:${NC}"
echo "  Application     : /opt/app"
echo "  Backups         : /opt/backups"
echo "  Logs            : /var/log/incubadora"
echo ""
echo -e "${BOLD}Cron Jobs:${NC}"
echo "  Backup          : Daily at 01:00 AM"
echo "  Certbot renew   : Daily at 02:00 and 14:00"
echo "  Docker prune    : Weekly on Sunday at 03:00 AM"
echo ""
echo -e "${YELLOW}${BOLD}NEXT STEPS:${NC}"
echo "  1. Copy docker-compose.yml to /opt/app/"
echo "  2. Copy nginx configs to /opt/app/nginx/conf.d/"
echo "  3. Run: ${CYAN}./setup-env.sh --domain-op ${DOMAIN_OP} --domain-mm ${DOMAIN_MM} --email ${ADMIN_EMAIL}${NC}"
echo "  4. Run: ${CYAN}./deploy-stack.sh${NC}"
echo "  5. Run: ${CYAN}./setup-ssl.sh${NC}"
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
echo ""
log_info "Server initialization completed successfully!"
log_warn "Remember to log out and back in for docker group changes to take effect."
