# ============================================================================
# security.tf - Web Application Firewall (WAF)
# ============================================================================
# NOTA: O OCI WAF NAO esta disponivel na camada gratuita.
# Este modulo e condicional (enable_waf = false por padrao).
# Se habilitado, protege o Load Balancer contra ataques comuns na web.
#
# Recursos criados:
# - Instancia WAF
# - Politica WAF com regras OWASP
# - Associacao com o Load Balancer
# ============================================================================

# ----------------------------------------------------------------------------
# WAF - Web Application Firewall (condicional)
# ----------------------------------------------------------------------------
resource "oci_waas_waas_policy" "this" {
  count = var.enable_waf ? 1 : 0

  compartment_id = var.compartment_ocid
  display_name   = "${var.project_tag}-waf-policy"

  # Dominios protegidos pelo WAF
  domains = [
    var.openproject_domain,
    var.mattermost_domain
  ]

  # Origem do WAF: Load Balancer
  origin_groups {
    origin_group {
      origins {
        uri  = "http://${oci_core_instance.this.private_ip}"
        type = "ORIGIN_TYPE_LOAD_BALANCER"
        http_port  = 80
        https_port = 443
      }
      display_name = "origin-group"
      policy       = "SIMPLE"
    }
  }

  # Requisicoes HTTPS
  https_certificates {
    # Usar certificado do Load Balancer
    certificate_id = oci_load_balancer_certificate.default.certificate_id
  }

  # Politica de cache (basica)
  caching_rules {
    action     = "CACHE"
    caching_duration  = "300"
    criteria  = "URL_PARTS_IS"
    is_cacheable = true
    key        = "/static/.*"
    name       = "cache-static"
  }

  # Forcar HTTPS
  is_https_preferred = true

  # WAF Policies - Protecao contra ataques comuns
  protection_settings {
    # Protecao contra protecao DDoS basica
    allowed_http_methods = ["GET", "HEAD", "POST", "OPTIONS"]

    # Nao permitir listagem de diretorio
    denylisted_http_methods = ["TRACE"]

    # Tamanho maximo do corpo da requisicao (em bytes)
    max_request_body_size_in_bytes = 10485760 # 10MB

    # Tamanho maximo de header
    max_header_size_in_bytes = 8192

    # Recommendations do OWASP
    recommendations_in_recovery_mode = true

    # Protecao contra SQL Injection
    sql_injection_protection = true

    # Protecao contra XSS
    cross_site_scripting_protection = true

    # Protecao contra Shell Injection
    shell_injection_protection = true
  }

  # WAF Request Rate Limiting
  waf_config {
    access_rules {
      action   = "DETECT"
      name     = "rate-limit-rule"
      criteria {
        condition = "REQUEST_RATE_LIMITED"
        value     = "1000"
      }
    }
  }

  # Backend health check
  health_checks {
    enabled     = true
    interval_in_seconds = 60
    path        = "/"
    timeout_in_seconds = 10
    unhealthy_threshold = 3
    healthy_threshold   = 3
    is_response_body_check_enabled = false
  }

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_tag}-waf-policy"
  })
}

# ----------------------------------------------------------------------------
# Dynamic Group para instancias de compute (necessario para Vault e WAF)
# ----------------------------------------------------------------------------
resource "oci_identity_dynamic_group" "compute_instances" {
  compartment_id = var.compartment_ocid
  name           = "${var.project_tag}-compute-dg"
  description    = "Grupo dinamico para todas as instancias de compute do projeto ${var.project_tag}"

  # Matching rule: instancias de compute no compartimento
  matching_rule = "ALL {instance.compartment.id = '${var.compartment_ocid}'}"

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_tag}-compute-dg"
  })
}

# ----------------------------------------------------------------------------
# Politica IAM - Politicas de seguranca para a aplicacao
# ----------------------------------------------------------------------------
resource "oci_identity_policy" "base_security" {
  compartment_id = var.compartment_ocid
  name           = "${var.project_tag}-base-security-policy"
  description    = "Politica base de seguranca para o ambiente ${var.project_tag}"

  # Permitir que as instancias enviem metricas para o OCI Monitoring
  statements {
    effect  = "ALLOW"
    actions = [
      "monitoring_write",
      "oci-management-agent-write"
    ]
    resources = [
      "*"
    ]
  }

  # Permitir que as instancias leiam metricas
  statements {
    effect  = "ALLOW"
    actions = [
      "monitoring_read"
    ]
    resources = [
      "*"
    ]
  }

  # Permitir health checks (O agente precisa publicar metricas)
  statements {
    effect  = "ALLOW"
    actions = [
      "ons-topic-publish"
    ]
    resources = [
      oci_ons_notification_topic.this.topic_id
    ]
  }

  # Permitir que as instancias usem Object Storage (para backups futuros)
  statements {
    effect  = "ALLOW"
    actions = [
      "OBJECTSTORAGE_READ",
      "OBJECTSTORAGE_WRITE"
    ]
    resources = [
      "${var.compartment_ocid}/objectstorage/*"
    ]
  }

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_tag}-base-security-policy"
  })
}
