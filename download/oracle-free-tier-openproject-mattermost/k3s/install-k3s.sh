#!/usr/bin/env bash
# ============================================================================
# install-k3s.sh - Instalação do K3s na Oracle A1 Flex (ARM64)
# ============================================================================
# Script para instalar K3s, Helm 3, cert-manager e Traefik em uma VM
# Oracle Cloud A1 Flex com Ubuntu 22.04 LTS ARM64.
#
# Uso:
#   chmod +x install-k3s.sh
#   ./install-k3s.sh [--single-node] [--cluster] [--skip-traefik]
#
# Opções:
#   --single-node    Instala K3s single-node (padrão para Free Tier)
#   --cluster        Instala K3s em modo cluster (2+ nós)
#   --skip-traefik   Não instala Traefik Helm chart (usar custom Ingress)
#
# IMPORTANTE: Execute como root ou com sudo.
# ============================================================================
set -euo pipefail

# ----------------------------------------------------------------------------
# Configurações
# ----------------------------------------------------------------------------
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly K3S_VERSION="v1.30.4+k3s1"
readonly HELM_VERSION="v3.15.4"
readonly CERT_MANAGER_VERSION="v1.15.3"
readonly TRAEFIK_CHART_VERSION="28.0.0"
readonly TRAEFIK_NAMESPACE="traefik"

# Cores para output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Variáveis de modo
MODE="single-node"
SKIP_TRAEFIK=false

# ----------------------------------------------------------------------------
# Funções utilitárias
# ----------------------------------------------------------------------------
log_info()    { echo -e "${BLUE}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $*"; }
log_error()   { echo -e "${RED}[ERRO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $*"; }

# Verifica se o comando foi executado como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script deve ser executado como root."
        log_info "Use: sudo $0 $*"
        exit 1
    fi
}

# Verifica a arquitetura ARM64
check_arch() {
    local arch
    arch=$(uname -m)
    if [[ "${arch}" != "aarch64" && "${arch}" != "arm64" ]]; then
        log_warn "Arquitetura detectada: ${arch} (esperado: aarch64/arm64)"
        log_warn "Continuando, mas pode haver problemas com imagens ARM."
    else
        log_success "Arquitetura ARM64 confirmada."
    fi
}

# Verifica se há memória e CPU suficientes
check_resources() {
    local total_mem_gb
    total_mem_gb=$(awk '/MemTotal/ {printf "%.0f", $2/1024/1024}' /proc/meminfo)
    local cpu_count
    cpu_count=$(nproc)

    log_info "CPU detectadas: ${cpu_count}"
    log_info "Memória RAM: ${total_mem_gb} GB"

    if [[ "${cpu_count}" -lt 2 ]]; then
        log_warn "Recomendado mínimo de 2 CPUs para K3s com OpenProject + Mattermost."
    fi

    if [[ "${total_mem_gb}" -lt 12 ]]; then
        log_error "Mínimo de 12 GB RAM necessário. Detectado: ${total_mem_gb} GB"
        exit 1
    fi
}

# ----------------------------------------------------------------------------
# Parsing de argumentos
# ----------------------------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --single-node) MODE="single-node"; shift ;;
            --cluster)     MODE="cluster"; shift ;;
            --skip-traefik) SKIP_TRAEFIK=true; shift ;;
            --help|-h)
                echo "Uso: $0 [--single-node] [--cluster] [--skip-traefik] [--help]"
                echo ""
                echo "Opções:"
                echo "  --single-node    K3s single-node (padrão, ideal para Free Tier)"
                echo "  --cluster        K3s cluster (múltiplos nós)"
                echo "  --skip-traefik   Não instala o Helm chart do Traefik"
                exit 0
                ;;
            *)
                log_error "Opção desconhecida: $1"
                exit 1
                ;;
        esac
    done
}

# ----------------------------------------------------------------------------
# Passo 1: Preparar o sistema
# ----------------------------------------------------------------------------
prepare_system() {
    log_info "============================================================"
    log_info "  PASSO 1/6: Preparando o sistema"
    log_info "============================================================"

    # Atualizar pacotes
    log_info "Atualizando pacotes do sistema..."
    apt-get update -qq
    apt-get upgrade -y -qq > /dev/null 2>&1

    # Instalar dependências básicas
    log_info "Instalando dependências..."
    apt-get install -y -qq \
        curl \
        wget \
        ca-certificates \
        gnupg \
        lsb-release \
        socat \
        conntrack \
        iptables \
        apt-transport-https \
        software-properties-common \
        git \
        jq \
        > /dev/null 2>&1

    # Desabilitar swap (K3s não funciona bem com swap)
    log_info "Desabilitando swap..."
    swapoff -a
    sed -i '/swap/d' /etc/fstab

    # Configurar parâmetros do kernel para Kubernetes
    log_info "Configurando parâmetros do kernel..."
    cat > /etc/sysctl.d/99-kubernetes.conf <<EOF
# Parâmetros do kernel para Kubernetes/K3s
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
net.ipv4.conf.all.forwarding        = 1
net.ipv6.conf.all.forwarding        = 1

# Otimização para Oracle A1 Flex (ARM)
vm.swappiness                       = 1
vm.overcommit_memory                = 1
vm.panic_on_oom                     = 0
kernel.panic                        = 10
kernel.panic_on_oops                = 1

# Otimização de rede
net.core.somaxconn                  = 65535
net.core.netdev_max_backlog         = 65535
net.ipv4.tcp_max_syn_backlog        = 65535
net.ipv4.tcp_tw_reuse               = 1
net.ipv4.ip_local_port_range        = "1024 65535"
EOF

    sysctl --system > /dev/null 2>&1

    # Configurar limites de arquivo
    log_info "Configurando limites de arquivo abertos..."
    cat > /etc/security/limits.d/99-kubernetes.conf <<EOF
# Limites para Kubernetes
root    soft    nofile    1048576
root    hard    nofile    1048576
root    soft    nproc     unlimited
root    hard    nproc     unlimited
*       soft    nofile    1048576
*       hard    nofile    1048576
*       soft    nproc     unlimited
*       hard    nproc     unlimited
EOF

    log_success "Sistema preparado com sucesso."
}

# ----------------------------------------------------------------------------
# Passo 2: Instalar K3s
# ----------------------------------------------------------------------------
install_k3s() {
    log_info "============================================================"
    log_info "  PASSO 2/6: Instalando K3s ${K3S_VERSION}"
    log_info "============================================================"

    # Verificar se K3s já está instalado
    if command -v k3s &> /dev/null; then
        local current_version
        current_version=$(k3s --version 2>/dev/null | head -1 | awk '{print $3}')
        log_warn "K3s já está instalado (versão: ${current_version:-desconhecida})"
        log_info "Para reinstalar, execute: /usr/local/bin/k3s-uninstall.sh"
        return 0
    fi

    if [[ "${MODE}" == "single-node" ]]; then
        log_info "Instalando K3s em modo SINGLE-NODE..."

        # Instalar K3s single-node com flags otimizadas para ARM + Free Tier
        # --disable traefik: vamos instalar via Helm com configuração customizada
        # --disable servicelb: não precisamos de LoadBalancer interno
        # --tls-san: SANs adicionais para certificados
        INSTALL_K3S_EXEC="--disable=traefik \
            --disable=servicelb \
            --kubelet-arg=max-pods=250 \
            --kubelet-arg=eviction-hard=memory.available<500Mi,nodefs.available<1Gi \
            --kubelet-arg=system-reserved=cpu=200m,memory=400Mi \
            --kubelet-arg=kube-reserved=cpu=200m,memory=300Mi \
            --write-kubeconfig-mode=644 \
            --resolv-conf=/run/systemd/resolve/resolv.conf" \
            K3S_KUBECONFIG_MODE="644" \
            curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${K3S_VERSION}" sh -
    else
        log_info "Instalando K3s em modo CLUSTER..."
        log_warn "Para cluster, execute este script em cada nó."
        log_warn "No primeiro nó (server), execute como está."
        log_warn "Nos demais nós, obtenha o token do server: cat /var/lib/rancher/k3s/server/node-token"

        # Instalar K3s server (primeiro nó do cluster)
        INSTALL_K3S_EXEC="--disable=traefik \
            --disable=servicelb \
            --cluster-init \
            --kubelet-arg=max-pods=250 \
            --write-kubeconfig-mode=644" \
            K3S_KUBECONFIG_MODE="644" \
            curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${K3S_VERSION}" sh -

        log_info ""
        log_info "Para adicionar worker nodes, execute nos outros nós:"
        log_info "  curl -sfL https://get.k3s.io | K3S_URL=https://<SERVER_IP>:6443 \\"
        log_info "    K3S_TOKEN=<NODE_TOKEN> INSTALL_K3S_VERSION=\"${K3S_VERSION}\" sh -"
    fi

    # Aguardar K3s estar pronto
    log_info "Aguardando K3s ficar pronto..."
    local max_wait=120
    local waited=0
    while ! kubectl get nodes &> /dev/null; do
        sleep 2
        waited=$((waited + 2))
        if [[ ${waited} -ge ${max_wait} ]]; then
            log_error "K3s não ficou pronto após ${max_wait} segundos."
            exit 1
        fi
    done

    log_success "K3s instalado com sucesso."
    kubectl get nodes
}

# ----------------------------------------------------------------------------
# Passo 3: Instalar Helm 3
# ----------------------------------------------------------------------------
install_helm() {
    log_info "============================================================"
    log_info "  PASSO 3/6: Instalando Helm ${HELM_VERSION}"
    log_info "============================================================"

    if command -v helm &> /dev/null; then
        local current_helm
        current_helm=$(helm version --short 2>/dev/null || echo "desconhecida")
        log_warn "Helm já está instalado (versão: ${current_helm})"
        return 0
    fi

    log_info "Baixando Helm ${HELM_VERSION} para ARM64..."
    curl -fsSL "https://get.helm.sh/helm-${HELM_VERSION}-linux-arm64.tar.gz" -o /tmp/helm.tar.gz

    tar -xzf /tmp/helm.tar.gz -C /tmp/
    mv /tmp/linux-arm64/helm /usr/local/bin/helm
    chmod +x /usr/local/bin/helm
    rm -rf /tmp/helm.tar.gz /tmp/linux-arm64

    # Configurar bash completion
    helm completion bash > /etc/bash_completion.d/helm 2>/dev/null || true

    log_success "Helm ${HELM_VERSION} instalado com sucesso."
    helm version --short
}

# ----------------------------------------------------------------------------
# Passo 4: Instalar cert-manager
# ----------------------------------------------------------------------------
install_cert_manager() {
    log_info "============================================================"
    log_info "  PASSO 4/6: Instalando cert-manager ${CERT_MANAGER_VERSION}"
    log_info "============================================================"

    if kubectl get namespace cert-manager &> /dev/null 2>&1; then
        log_warn "cert-manager já está instalado."
        return 0
    fi

    # Adicionar repo do cert-manager
    helm repo add jetstack https://charts.jetstack.io
    helm repo update

    # Instalar cert-manager CRDs
    log_info "Instalando CRDs do cert-manager..."
    kubectl apply -f "https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.crds.yaml"

    # Instalar cert-manager via Helm
    log_info "Instalando cert-manager via Helm..."
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --version "${CERT_MANAGER_VERSION}" \
        --set installCRDs=true \
        --set replicaCount=1 \
        --set resources.requests.cpu=50m \
        --set resources.requests.memory=64Mi \
        --set resources.limits.cpu=200m \
        --set resources.limits.memory=256Mi \
        --set "extraArgs[0]=--enable-certificate-owner-ref=true"

    # Aguardar cert-manager estar pronto
    log_info "Aguardando cert-manager ficar pronto..."
    kubectl wait --for=condition=Available --timeout=120s deployment/cert-manager -n cert-manager
    kubectl wait --for=condition=Available --timeout=120s deployment/cert-manager-cainjector -n cert-manager
    kubectl wait --for=condition=Available --timeout=120s deployment/cert-manager-webhook -n cert-manager

    log_success "cert-manager instalado com sucesso."
}

# ----------------------------------------------------------------------------
# Passo 5: Instalar Traefik via Helm
# ----------------------------------------------------------------------------
install_traefik() {
    if [[ "${SKIP_TRAEFIK}" == true ]]; then
        log_warn "Instalação do Traefik ignorada (--skip-traefik)."
        return 0
    fi

    log_info "============================================================"
    log_info "  PASSO 5/6: Instalando Traefik ${TRAEFIK_CHART_VERSION}"
    log_info "============================================================"

    # Verificar se o arquivo de valores existe
    local values_file="${SCRIPT_DIR}/traefik-values.yaml"
    if [[ ! -f "${values_file}" ]]; then
        log_warn "Arquivo ${values_file} não encontrado."
        log_info "Instalando Traefik com valores padrão (sem ACME)."
        values_file=""
    fi

    # Adicionar repo do Traefik
    helm repo add traefik https://traefik.github.io/charts
    helm repo update

    # Instalar Traefik
    local helm_args=(
        upgrade
        --install
        traefik
        traefik/traefik
        --namespace "${TRAEFIK_NAMESPACE}"
        --create-namespace
        --version "${TRAEFIK_CHART_VERSION}"
        --set "ports.web.exposedPort=80"
        --set "ports.websecure.exposedPort=443"
        --set "resources.requests.cpu=50m"
        --set "resources.requests.memory=64Mi"
        --set "resources.limits.cpu=500m"
        --set "resources.limits.memory=256Mi"
        --set "deployment.replicas=1"
    )

    if [[ -n "${values_file}" ]]; then
        helm_args+=(-f "${values_file}")
    fi

    helm "${helm_args[@]}"

    # Aguardar Traefik estar pronto
    log_info "Aguardando Traefik ficar pronto..."
    kubectl wait --for=condition=Available --timeout=120s deployment/traefik -n "${TRAEFIK_NAMESPACE}" 2>/dev/null || \
    kubectl rollout status deployment/traefik -n "${TRAEFIK_NAMESPACE}" --timeout=120s

    log_success "Traefik instalado com sucesso."
}

# ----------------------------------------------------------------------------
# Passo 6: Verificação final
# ----------------------------------------------------------------------------
verify_installation() {
    log_info "============================================================"
    log_info "  PASSO 6/6: Verificação da instalação"
    log_info "============================================================"

    echo ""
    log_info "Versões instaladas:"
    echo "  K3s:         $(k3s --version 2>/dev/null | head -1 || echo 'N/A')"
    echo "  kubectl:     $(kubectl version --short --client 2>/dev/null || echo 'N/A')"
    echo "  Helm:        $(helm version --short 2>/dev/null || echo 'N/A')"
    echo ""

    log_info "Status dos nós:"
    kubectl get nodes -o wide
    echo ""

    log_info "Pods do sistema:"
    kubectl get pods -A | head -20
    echo ""

    log_info "Namespaces:"
    kubectl get namespaces
    echo ""

    log_info "Kubeconfig: ~/.kube/config"
    log_info "Arquivo de configuração do K3s: /etc/rancher/k3s/k3s.yaml"

    # Teste de resolução DNS
    log_info "Testando DNS interno do cluster..."
    kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- \
        nslookup kubernetes.default.svc.cluster.local > /dev/null 2>&1 && \
        log_success "DNS interno do cluster está funcionando." || \
        log_warn "DNS interno pode estar com problemas. Verifique CoreDNS."

    echo ""
    echo "============================================================"
    echo -e "  ${GREEN}✅ INSTALAÇÃO DO K3s CONCLUÍDA COM SUCESSO${NC}"
    echo "============================================================"
    echo ""
    echo "  Próximos passos:"
    echo "    1. Edite as variáveis de ambiente em k3s/.env"
    echo "    2. Crie o secret do Cloudflare API token:"
    echo "       kubectl create secret generic cloudflare-api-token \\"
    echo "         --from-literal=api-token=YOUR_TOKEN -n cert-manager"
    echo "    3. Aplique os manifestos (em ordem):"
    echo "       kubectl apply -f k3s/namespaces.yaml"
    echo "       kubectl apply -f k3s/network-policies.yaml"
    echo "       kubectl apply -f k3s/postgresql.yaml"
    echo "       kubectl apply -f k3s/memcached.yaml"
    echo "       kubectl apply -f k3s/cert-manager.yaml"
    echo "       kubectl apply -f k3s/openproject.yaml"
    echo "       kubectl apply -f k3s/mattermost.yaml"
    echo "       kubectl apply -f k3s/backup-cronjob.yaml"
    echo "    Ou use Kustomize para aplicar tudo de uma vez:"
    echo "       kubectl apply -k k3s/"
    echo ""
    echo "  Para monitorar todos os namespaces:"
    echo "    kubectl get pods -A -l app.kubernetes.io/part-of=incubadora"
    echo "  Para logs:"
    echo "    kubectl logs -f deployment/openproject -n incubadora-openproject"
    echo "    kubectl logs -f deployment/mattermost -n incubadora-mattermost"
    echo "============================================================"
}

# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
main() {
    parse_args "$@"

    echo ""
    echo "============================================================"
    echo -e "  ${BLUE}Instalação do K3s - Oracle A1 Flex (ARM64)${NC}"
    echo -e "  Modo: ${YELLOW}${MODE}${NC}"
    echo -e "  Data: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo "============================================================"
    echo ""

    check_root
    check_arch
    check_resources

    prepare_system
    install_k3s
    install_helm
    install_cert_manager
    install_traefik
    verify_installation
}

main "$@"
