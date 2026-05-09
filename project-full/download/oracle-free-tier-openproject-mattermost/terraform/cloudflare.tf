# ============================================================================
# cloudflare.tf - Registros DNS gerenciados via Cloudflare
# ============================================================================
# Gerencia automaticamente os registros DNS no Cloudflare usando a API Token.
# Garante que projects.<dominio> e chat.<dominio> apontem para o IP publico
# da instancia OCI. Tambem configura regras de cache e HTTPS.
#
# REQUISITOS:
#   - Conta Cloudflare com o dominio configurado
#   - API Token com permissoes: Zone:DNS:Edit + Zone:Zone:Read
#   - Zone ID do dominio (encontrado no Cloudflare Dashboard)
#
# NOTA: Este arquivo e condicional - so e criado se cloudflare_api_token estiver
# definido. Veja cloudflare-auto.tf para a logica condicional.
# ============================================================================

# ----------------------------------------------------------------------------
# Provider Cloudflare (com API Token)
# Autenticacao via API Token e mais segura do que Global API Key.
# Criar em: Cloudflare Dashboard > My Profile > API Tokens
# Permissoes necessarias: Zone:DNS:Edit, Zone:Zone:Read
# ----------------------------------------------------------------------------
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# ----------------------------------------------------------------------------
# Locals - Valores auxiliares para Cloudflare
# ----------------------------------------------------------------------------
locals {
  # IP alvo para os registros DNS (IP publico da instancia OCI)
  # Se usar Load Balancer, usa o IP do LB; caso contrario, o IP da VM
  cf_target_ip = var.enable_load_balancer != false ? (
    try(oci_load_balancer.this.ip_address_details[0].ip_address, oci_core_instance.this.public_ip)
  ) : oci_core_instance.this.public_ip

  # Verificar se Cloudflare esta habilitado
  cf_enabled = var.cloudflare_api_token != "" && var.cloudflare_zone_id != "" && var.cloudflare_zone_name != ""
}

# ----------------------------------------------------------------------------
# Registro A - projects.<dominio> -> IP publico da VM/LB
# Aponta o subdominio do OpenProject para a instancia
# ----------------------------------------------------------------------------
resource "cloudflare_record" "openproject" {
  zone_id = var.cloudflare_zone_id
  name    = "projects"
  type    = "A"
  content = local.cf_target_ip
  ttl     = var.use_cloudflare_proxy ? 1 : 300 # TTL=1 significa auto quando proxied
  proxied = var.use_cloudflare_proxy

  # Aguarda a instancia OCI estar pronta antes de criar o DNS
  depends_on = [oci_core_instance.this]

  # Permite a Terraform destruir/recriar sem erro
  allow_overwrite = true
}

# ----------------------------------------------------------------------------
# Registro A - chat.<dominio> -> IP publico da VM/LB
# Aponta o subdominio do Mattermost para a instancia
# ----------------------------------------------------------------------------
resource "cloudflare_record" "mattermost" {
  zone_id = var.cloudflare_zone_id
  name    = "chat"
  type    = "A"
  content = local.cf_target_ip
  ttl     = var.use_cloudflare_proxy ? 1 : 300
  proxied = var.use_cloudflare_proxy

  depends_on = [oci_core_instance.this]
  allow_overwrite = true
}

# ----------------------------------------------------------------------------
# Registro CNAME - *.<dominio> -> dominio principal (wildcard)
# Permite criar subdominios extras no futuro sem necessidade de mudar a infra
# Ex: docs.seudominio.com, ci.seudominio.com, etc.
# ----------------------------------------------------------------------------
resource "cloudflare_record" "wildcard" {
  zone_id = var.cloudflare_zone_id
  name    = "*"
  type    = "CNAME"
  content = var.cloudflare_zone_name
  ttl     = var.use_cloudflare_proxy ? 1 : 300
  proxied = var.use_cloudflare_proxy

  depends_on = [oci_core_instance.this]
  allow_overwrite = true
}

# ----------------------------------------------------------------------------
# Registro TXT - Verificacao de dominio
# Util para verificacoes de posse do dominio (Google Workspace, etc.)
# ----------------------------------------------------------------------------
resource "cloudflare_record" "verification_txt" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "TXT"
  content = "v=spf1 include:_spf.google.com ~all"
  ttl     = 3600
  proxied = false # TXT nunca e proxied

  depends_on = [oci_core_instance.this]
}

# ----------------------------------------------------------------------------
# Registro TXT - Site verification para Google
# Permite associar o dominio ao Google Search Console
# ----------------------------------------------------------------------------
resource "cloudflare_record" "google_site_verification" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "TXT"
  content = "google-site-verification=${var.cloudflare_zone_name}"
  ttl     = 3600
  proxied = false

  depends_on = [oci_core_instance.this]
}

# ----------------------------------------------------------------------------
# Cloudflare Rules - Forcar HTTPS (Always Use HTTPS)
# Redireciona todo trafego HTTP para HTTPS automaticamente
# ============================================================================
# NOTA: Em Cloudflare, "Always Use HTTPS" e configurado como uma regra de
# zona via API. Usa-se o recurso cloudflare_rules para configurar.
# Alternativa: pode ser configurado manualmente no Dashboard (SSL/TLS > Edge
# Certificates > Always Use HTTPS).
# ----------------------------------------------------------------------------
resource "cloudflare_zone_settings_override" "this" {
  zone_id = var.cloudflare_zone_id

  # Configuracoes de seguranca e performance
  settings {
    # Forcar HTTPS - redireciona HTTP para HTTPS
    always_use_https = "on"

    # Minimo TLS 1.2
    min_tls_version = "1.2"

    # HSTS (HTTP Strict Transport Security)
    # Protege contra downgrade attacks
    security_level = "medium"

    # Desativar TLS 1.3 para compatibilidade (remover se suportado)
    tls_1_3 = "zrt"

    # Cache de assets estaticos
    # Nao interfere em conteudo dinamico (APIs, websockets)
    cache_level = "aggressive"

    # Browser cache TTL
    browser_cache_ttl = 14400 # 4 horas

    # Desenvolvedor mode (desativado em producao)
    development_mode = "off"

    # Auto Minify - reduz tamanho de HTML, CSS e JS
    auto_minify {
      html = "on"
      css  = "on"
      js   = "on"
    }

    # Rocket Loader - carrega JavaScript de forma assincrona
    rocket_loader = "off" # Pode causar problemas com OpenProject/Mattermost

    # Brotli compression (mais eficiente que gzip)
    brotli = "on"

    # Hotlink Protection (evita uso nao autorizado de imagens)
    hotlink_protection = "off" # Nao necessario para apps internas

    # Email Obfuscation
    email_obfuscation = "off" # Nao necessario

    # Server Side Excludes - esconde blocos do HTML para visitantes
    server_side_excludes = "off"

    # IP Geolocation header
    ip_geolocation = "on"

    # Challenge Passage - tempo que o visitante fica "confiavel" apos resolver challenge
    challenge_ttl = 1800 # 30 minutos

    # Privacy Pass - permite visitors pular challenges futuros
    privacy_pass = "on"

    # WebSockets - NECESSARIO para Mattermost
    websockets = "on"
  }

  depends_on = [
    oci_core_instance.this,
    cloudflare_record.openproject,
    cloudflare_record.mattermost
  ]
}

# ----------------------------------------------------------------------------
# Page Rule - Cache de assets estaticos (OpenProject)
# Configura cache agressivo para arquivos estaticos do OpenProject
# ----------------------------------------------------------------------------
resource "cloudflare_page_rule" "openproject_cache" {
  zone_id  = var.cloudflare_zone_id
  name     = "Cache - OpenProject Static Assets"
  target   = "projects.${var.cloudflare_zone_name}/assets/*"
  priority = 10

  actions {
    cache_level          = "cache_everything"
    edge_cache_ttl       = 86400  # 24 horas
    browser_cache_ttl    = 14400  # 4 horas
    cache_key            = "all"
  }
}

# ----------------------------------------------------------------------------
# Page Rule - Cache de assets estaticos (Mattermost)
# Configura cache agressivo para arquivos estaticos do Mattermost
# ----------------------------------------------------------------------------
resource "cloudflare_page_rule" "mattermost_cache" {
  zone_id  = var.cloudflare_zone_id
  name     = "Cache - Mattermost Static Assets"
  target   = "chat.${var.cloudflare_zone_name}/static/*"
  priority = 10

  actions {
    cache_level          = "cache_everything"
    edge_cache_ttl       = 86400  # 24 horas
    browser_cache_ttl    = 14400  # 4 horas
    cache_key            = "all"
  }
}

# ----------------------------------------------------------------------------
# Page Rule - Forcar HTTPS em todos os subdominios do projeto
# Garante que acessos HTTP sejam redirecionados para HTTPS
# ----------------------------------------------------------------------------
resource "cloudflare_page_rule" "force_https" {
  zone_id  = var.cloudflare_zone_id
  name     = "Force HTTPS - All Project Subdomains"
  target   = "*.${var.cloudflare_zone_name}/*"
  priority = 1

  actions {
    always_use_https   = true
    automatic_https_rewrites = true
  }
}

# ----------------------------------------------------------------------------
# Cloudflare Firewall Rule - Rate Limiting basico
# Protege contra abuso e ataques de forca bruta
# ----------------------------------------------------------------------------
resource "cloudflare_ruleset" "rate_limiting" {
  zone_id     = var.cloudflare_zone_id
  name        = "Rate Limiting - Login/API endpoints"
  description = "Limita requisicoes em endpoints de login e API para prevenir ataques de forca bruta"
  kind        = "zone"
  phase       = "http_ratelimit"

  rules {
    expression = "(http.request.uri.path contains \"/api/v4/login\" or http.request.uri.path contains \"/login\")"
    action     = "block"
    description = "Rate limit login endpoints"

    ratelimit {
      characteristics = [
        "cf.colo.id",
        "cf.edge.colo.id",
        "ip.src"
      ]
      period              = 60
      requests_per_period = 20
      mitigation_timeout  = 300
    }

    enabled = true
  }
}

# ----------------------------------------------------------------------------
# Cloudflare Access - (Opcional) Protecao adicional com Cloudflare Access
# Descomente se quiser adicionar autenticacao extra (SSO, IP allowlist)
# ----------------------------------------------------------------------------
# resource "cloudflare_access_application" "openproject" {
#   zone_id                   = var.cloudflare_zone_id
#   name                      = "OpenProject"
#   domain                    = "projects.${var.cloudflare_zone_name}"
#   session_duration          = "24h"
#   auto_redirect_to_identity = false
#
#   # ... configuracoes adicionais de Access
# }
