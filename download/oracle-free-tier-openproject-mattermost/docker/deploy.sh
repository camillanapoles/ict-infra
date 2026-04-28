#!/bin/bash
# =============================================================================
# deploy.sh - Script de deploy para Oracle Cloud Free Tier
# OpenProject + Mattermost
# =============================================================================
# Este script prepara a configuração e inicia todos os serviços.
# Uso: chmod +x deploy.sh && ./deploy.sh [comando]
# Comandos: setup | ssl | start | stop | restart | status | logs | nginx-reload
# =============================================================================

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# =============================================================================
# Funções auxiliares
# =============================================================================
log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[AVISO]${NC} $*"; }
log_error()   { echo -e "${RED}[ERRO]${NC} $*"; }

check_env() {
    if [[ ! -f .env ]]; then
        log_error "Arquivo .env não encontrado!"
        log_info "Copie o template e configure:"
        echo "  cp .env.example .env"
        echo "  vim .env"
        exit 1
    fi

    # Verificar variáveis obrigatórias
    source .env
    local missing=0

    if [[ "$POSTGRES_PASSWORD" == *"gerar"* ]]; then
        log_error "POSTGRES_PASSWORD não configurada no .env"
        missing=1
    fi
    if [[ "$OPENPROJECT_SECRET_KEY" == *"gerar"* ]]; then
        log_error "OPENPROJECT_SECRET_KEY não configurada no .env"
        missing=1
    fi
    if [[ "$OPENPROJECT_DOMAIN" == *"exemplo"* ]]; then
        log_error "OPENPROJECT_DOMAIN não configurada no .env"
        missing=1
    fi
    if [[ "$MATTERMOST_DOMAIN" == *"exemplo"* ]]; then
        log_error "MATTERMOST_DOMAIN não configurada no .env"
        missing=1
    fi

    if [[ $missing -eq 1 ]]; then
        exit 1
    fi

    log_success "Variáveis de ambiente verificadas"
}

# =============================================================================
# Comando: setup - Preparação inicial
# =============================================================================
cmd_setup() {
    log_info "=== Configuração Inicial ==="
    check_env

    source .env

    # Criar certificado auto-assinado temporário para o Nginx poder iniciar
    log_info "Gerando certificado auto-assinado temporário..."
    mkdir -p nginx/ssl
    if [[ ! -f nginx/ssl/dummy-cert.pem ]]; then
        openssl req -x509 -nodes -days 365 \
            -newkey rsa:2048 \
            -keyout nginx/ssl/dummy-key.pem \
            -out nginx/ssl/dummy-cert.pem \
            -subj "/CN=localhost/O=Dev/C=BR" 2>/dev/null
        log_success "Certificado auto-assinado criado"
    else
        log_info "Certificado auto-assinado já existe"
    fi

    # Gerar DH parameters (pode levar alguns minutos)
    if [[ ! -f nginx/ssl/dhparam.pem ]]; then
        log_info "Gerando DH parameters (isso pode levar alguns minutos)..."
        openssl dhparam -out nginx/ssl/dhparam.pem 2048 2>/dev/null
        log_success "DH parameters gerados"
    fi

    # Substituir domínios nos configs do Nginx
    log_info "Configurando domínios no Nginx..."
    sed -i "s/openproject\.exemplo\.com/${OPENPROJECT_DOMAIN}/g" nginx/conf.d/openproject.conf
    sed -i "s/mattermost\.exemplo\.com/${MATTERMOST_DOMAIN}/g" nginx/conf.d/mattermost.conf

    # Atualizar CSP do Mattermost com o domínio correto
    sed -i "s|https://mattermost\.exemplo\.com|https://${MATTERMOST_DOMAIN}|g" nginx/conf.d/mattermost.conf

    log_success "Domínios configurados: ${OPENPROJECT_DOMAIN}, ${MATTERMOST_DOMAIN}"
    echo ""
    log_info "=== Setup concluído ==="
    log_info "Próximos passos:"
    echo "  1. ./deploy.sh ssl       # Obter certificados SSL (após DNS apontar)"
    echo "  2. ./deploy.sh start     # Iniciar os serviços"
}

# =============================================================================
# Comando: ssl - Obter certificados Let's Encrypt
# =============================================================================
cmd_ssl() {
    check_env
    source .env

    log_info "=== Obtenção de Certificados SSL ==="

    # Verificar se o Nginx está rodando
    if ! docker compose ps nginx | grep -q "running"; then
        log_warn "Nginx não está rodando. Iniciando apenas Nginx e Certbot..."

        # Iniciar apenas os serviços necessários para o certbot
        docker compose up -d nginx
        sleep 5
    fi

    log_info "Solicitando certificados para: ${OPENPROJECT_DOMAIN}, ${MATTERMOST_DOMAIN}"
    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path /var/www/certbot \
        -d "${OPENPROJECT_DOMAIN}" \
        -d "${MATTERMOST_DOMAIN}" \
        --email "${SMTP_USER:-admin@${OPENPROJECT_DOMAIN}}" \
        --agree-tos \
        --no-eff-email \
        --non-interactive

    log_success "Certificados obtidos!"
    log_info "Reiniciando Nginx..."
    docker compose restart nginx
}

# =============================================================================
# Comando: start - Iniciar serviços
# =============================================================================
cmd_start() {
    check_env
    log_info "=== Iniciando Serviços ==="
    docker compose up -d
    echo ""
    log_info "Aguardando serviços ficarem saudáveis..."
    sleep 10
    cmd_status
}

# =============================================================================
# Comando: stop - Parar serviços
# =============================================================================
cmd_stop() {
    log_info "=== Parando Serviços ==="
    docker compose down
    log_success "Serviços parados"
}

# =============================================================================
# Comando: restart - Reiniciar serviços
# =============================================================================
cmd_restart() {
    log_info "=== Reiniciando Serviços ==="
    docker compose restart
    log_success "Serviços reiniciados"
}

# =============================================================================
# Comando: status - Verificar status
# =============================================================================
cmd_status() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  Status dos Serviços - Oracle Cloud Free Tier              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    docker compose ps
    echo ""

    # Verificar saúde dos serviços
    docker compose ps --format "table {{.Name}}\t{{.Status}}" | while read line; do
        if echo "$line" | grep -q "healthy"; then
            echo -e "  ${GREEN}✓${NC} $line"
        elif echo "$line" | grep -q "running"; then
            echo -e "  ${YELLOW}⟳${NC} $line"
        elif echo "$line" | grep -q "exited\|dead"; then
            echo -e "  ${RED}✗${NC} $line"
        else
            echo "    $line"
        fi
    done
}

# =============================================================================
# Comando: logs - Ver logs
# =============================================================================
cmd_logs() {
    local service="${1:-}"
    if [[ -n "$service" ]]; then
        docker compose logs -f --tail=100 "$service"
    else
        docker compose logs -f --tail=50
    fi
}

# =============================================================================
# Comando: nginx-reload - Recarregar Nginx
# =============================================================================
cmd_nginx-reload() {
    log_info "Recarregando configuração do Nginx..."
    docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
    log_success "Nginx recarregado"
}

# =============================================================================
# Main
# =============================================================================
case "${1:-help}" in
    setup)
        cmd_setup
        ;;
    ssl)
        cmd_ssl
        ;;
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs "${2:-}"
        ;;
    nginx-reload)
        cmd_nginx-reload
        ;;
    help|*)
        echo ""
        echo "Uso: $0 <comando>"
        echo ""
        echo "Comandos:"
        echo "  setup          Configuração inicial (gera certificados dummy, substitui domínios)"
        echo "  ssl            Obtém certificados SSL (Let's Encrypt)"
        echo "  start          Inicia todos os serviços"
        echo "  stop           Para todos os serviços"
        echo "  restart        Reinicia todos os serviços"
        echo "  status         Mostra status dos serviços"
        echo "  logs [serviço] Mostra logs (opcionalmente de um serviço específico)"
        echo "  nginx-reload   Recarrega a configuração do Nginx"
        echo ""
        ;;
esac
