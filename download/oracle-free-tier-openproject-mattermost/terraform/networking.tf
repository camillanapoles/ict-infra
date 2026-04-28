# ============================================================================
# networking.tf - Balanceador de Carga e roteamento baseado em hostname
# ============================================================================
# Abordagem pratica para o Free Tier:
# - Utiliza o Load Balancer Flexivel OCI (200 Mbps Always Free)
# - Hostname-based routing para OpenProject e Mattermost
# - Listener HTTP (80) para Let's Encrypt e redirect
# - Listener HTTPS (443) para trafego seguro
#
# NOTA: Para o Free Tier, se o Load Balancer nao estiver disponivel,
#       o Nginx na propria VM faz o reverse proxy (configurado via cloud-init).
# ============================================================================

# ----------------------------------------------------------------------------
# Backend Set - Grupo de servidores backend
# ----------------------------------------------------------------------------
resource "oci_load_balancer_backend_set" "openproject" {
  load_balancer_id = oci_load_balancer.this.id
  name             = "openproject-backend"
  policy           = "ROUND_ROBIN"

  health_checker {
    protocol          = "HTTP"
    port              = 8080
    url_path          = "/health_check"
    return_code       = 200
    interval_ms       = 30000
    timeout_in_millis = 10000
    retries           = 3
  }

  # O backend (instancia) e adicionado apos a criacao
}

resource "oci_load_balancer_backend_set" "mattermost" {
  load_balancer_id = oci_load_balancer.this.id
  name             = "mattermost-backend"
  policy           = "ROUND_ROBIN"

  health_checker {
    protocol          = "HTTP"
    port              = 8065
    url_path          = "/api/v4/config"
    return_code       = 200
    interval_ms       = 30000
    timeout_in_millis = 10000
    retries           = 3
  }
}

# ----------------------------------------------------------------------------
# Load Balancer - Flexivel OCI (Always Free: 10 Mbps)
# ----------------------------------------------------------------------------
resource "oci_load_balancer" "this" {
  compartment_id = var.compartment_ocid
  display_name   = "incubadora-lb"
  shape          = "flexible"

  # Shape flexivel - 10 Mbps e o minimo (Always Free)
  shape_details {
    minimum_bandwidth_in_mbps = 10
    maximum_bandwidth_in_mbps = 10
  }

  # Configuracao da sub-rede
  subnet_ids = [oci_core_subnet.public.id]

  # Nao e Is Private - precisa de IP publico
  is_private = false

  freeform_tags = merge(local.common_tags, {
    Name = "incubadora-lb"
  })

  # Depends on the compute instance for backend attachment
  depends_on = [oci_core_instance.this]
}

# ----------------------------------------------------------------------------
# Certificado SSL - Placeholder (substituido pelo Certbot/Let's Encrypt)
# ----------------------------------------------------------------------------
resource "oci_load_balancer_certificate" "default" {
  load_balancer_id = oci_load_balancer.this.id
  certificate_name = "incubadora-default-cert"
  public_certificate = fileexists("${path.module}/certs/server.crt") ? file("${path.module}/certs/server.crt") : <<-EOT
    -----BEGIN CERTIFICATE-----
    MIIBkTCB+wIJAKHBfpEgcMFvMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnNl
    bGYtY2EwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjARMQ8wDQYDVQQD
    DAZzZWxmLWNhMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALjxrmkQF5Z6xH/VydFJ+
    mC7Jq9/P9f7J2x3Q8q8q3PBvkD8f7P9f7J2x3Q8q8q3PBvkD8f7P9f7J2x3Q8q8q3P
    BvkCAwEAATANBgkqhkiG9w0BAQsFAANBAKwV3xH/VydFJ+mC7Jq9/P9f7J2x3Q8q8
    q3PBvkD8f7P9f7J2x3Q8q8q3PBvkD8f7P9f7J2x3Q8q8q3PBvk=
    -----END CERTIFICATE-----
  EOT
  private_key = fileexists("${path.module}/certs/server.key") ? file("${path.module}/certs/server.key") : <<-EOT
    -----BEGIN PRIVATE KEY-----
    MIIBVQIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEAuPGuaRAWlnrEf9XJ0
    Un6YLsmr38/1/snHdDyryrc8G+QPx/s/1/snHdDyryrc8G+QPx/s/1/snHdDyryr
    c8G+QIDAQABAkA5PHNLFM+ZaK3xH/VydFJ+mC7Jq9/P9f7J2x3Q8q8q3PBvkD8f7P
    9f7J2x3Q8q8q3PBvkD8f7P9f7J2x3Q8q8q3PBvkAiEA5M+qo9Z3xH/VydFJ+mC7Jq
    9/P9f7J2x3Q8q8q3PBvkCIQDPHNLFM+ZaK3xH/VydFJ+mC7Jq9/P9f7J2x3Q8q8q3
    PBvkJQIgPHNLFM+ZaK3xH/VydFJ+mC7Jq9/P9f7J2x3Q8q8q3PBvkCIAjPHNLFM+Z
    aK3xH/VydFJ+mC7Jq9/P9f7J2x3Q8q8q3PBvkAiEAmjPHNLFM+ZaK3xH/VydFJ+mC
    7Jq9/P9f7J2x3Q8q8q3PBvk=
    -----END PRIVATE KEY-----
  EOT

  lifecycle {
    create_before_destroy = true
  }
}

# ----------------------------------------------------------------------------
# Listeners - Portas de entrada do Load Balancer
# ----------------------------------------------------------------------------

# Listener HTTP (porta 80) - Para Let's Encrypt e redirect para HTTPS
resource "oci_load_balancer_listener" "http" {
  load_balancer_id         = oci_load_balancer.this.id
  name                     = "http-listener"
  default_backend_set_name = oci_load_balancer_backend_set.openproject.name
  port                     = 80
  protocol                 = "HTTP"

  # Configuracao de connection pooling
  connection_configuration {
    idle_timeout_in_seconds = 300
  }

  # Regras de roteamento baseado em hostname
  routing_policy_name = oci_load_balancer_load_balancer_routing_policy.hostname_routing.display_name
}

# Listener HTTPS (porta 443)
resource "oci_load_balancer_listener" "https" {
  load_balancer_id         = oci_load_balancer.this.id
  name                     = "https-listener"
  default_backend_set_name = oci_load_balancer_backend_set.openproject.name
  port                     = 443
  protocol                 = "HTTP"

  # SSL configuration
  ssl_configuration {
    certificate_ids          = [oci_load_balancer_certificate.default.certificate_id]
    verify_peer_certificate  = false
  }

  # Regras de roteamento baseado em hostname
  routing_policy_name = oci_load_balancer_load_balancer_routing_policy.hostname_routing.display_name

  connection_configuration {
    idle_timeout_in_seconds = 300
  }
}

# ----------------------------------------------------------------------------
# Routing Policy - Roteamento baseado em hostname
# ----------------------------------------------------------------------------
resource "oci_load_balancer_load_balancer_routing_policy" "hostname_routing" {
  load_balancer_id = oci_load_balancer.this.id
  display_name     = "hostname-routing-policy"
  condition_language_version = "V1"

  rules {
    name        = "openproject-route"
    condition   = "any(http.request.headers[(i 'host') eq (i '${var.openproject_domain}')])"
    actions {
      name           = "FORWARD_TO_BACKENDSET"
      backend_set_name = oci_load_balancer_backend_set.openproject.name
    }
  }

  rules {
    name        = "mattermost-route"
    condition   = "any(http.request.headers[(i 'host') eq (i '${var.mattermost_domain}')])"
    actions {
      name           = "FORWARD_TO_BACKENDSET"
      backend_set_name = oci_load_balancer_backend_set.mattermost.name
    }
  }
}

# ----------------------------------------------------------------------------
# Backend - Adiciona a instancia ao backend set do OpenProject
# ----------------------------------------------------------------------------
resource "oci_load_balancer_backend" "openproject" {
  load_balancer_id = oci_load_balancer.this.id
  backendset_name  = oci_load_balancer_backend_set.openproject.name
  ip_address       = oci_core_instance.this.private_ip
  port             = 8080
}

# ----------------------------------------------------------------------------
# Backend - Adiciona a instancia ao backend set do Mattermost
# ----------------------------------------------------------------------------
resource "oci_load_balancer_backend" "mattermost" {
  load_balancer_id = oci_load_balancer.this.id
  backendset_name  = oci_load_balancer_backend_set.mattermost.name
  ip_address       = oci_core_instance.this.private_ip
  port             = 8065
}
