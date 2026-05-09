# ============================================================================
# monitoring.tf - Monitoramento e alertas OCI
# ============================================================================
# Configura alarmes para metricas criticas do servidor:
# - CPU utilization > 80%
# - Memory utilization > 85%
# - Disk usage > 80%
# - Disponibilidade do servico (health check HTTP)
#
# Utiliza OCI Monitoring (Always Free com limites generosos) e
# OCI Notifications para envio de alertas por email.
# ============================================================================

# ----------------------------------------------------------------------------
# Topico de Notificacao
# ----------------------------------------------------------------------------
resource "oci_ons_notification_topic" "this" {
  compartment_id = var.compartment_ocid
  display_name   = "${var.project_tag}-alertas-${var.environment}"
  description    = "Topico de alertas para o ambiente ${var.project_tag} (${var.environment})"

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_tag}-alertas"
  })
}

# ----------------------------------------------------------------------------
# Subscricao de Email para Notificacao
# ----------------------------------------------------------------------------
resource "oci_ons_subscription" "email" {
  compartment_id = var.compartment_ocid
  topic_id       = oci_ons_notification_topic.this.id
  protocol       = "EMAIL"
  endpoint       = var.notification_email != "" ? var.notification_email : "admin@example.com"
  display_name   = "email-alerts"

  freeform_tags = merge(local.common_tags, {
    Name = "email-alerts-subscription"
  })
}

# ----------------------------------------------------------------------------
# Alarme: CPU Utilization > 80%
# Monitora o uso do processador da instancia via OCI Compute Agent
# Metrica nativa coletada pelo Oracle Cloud Agent
# ----------------------------------------------------------------------------
resource "oci_monitoring_alarm" "cpu_high" {
  compartment_id        = var.compartment_ocid
  display_name          = "${var.vm_display_name}-cpu-alta"
  metric_compartment_id = var.compartment_ocid
  namespace             = "oci_computeagent"

  # Metrica de CPU - query no formato MQL da OCI
  query = <<-QUERY
    CpuUtilization[1m]{resourceId="${oci_core_instance.this.id}"}.mean() > 80
  QUERY

  # Destinatarios do alerta
  destinations = [oci_ons_notification_topic.this.topic_id]

  # Condicoes de trigger
  severity          = "WARNING"
  body              = "ALERTA: CPU da instancia ${var.vm_display_name} acima de 80% por mais de 5 minutos. Valor: {{evaluations[0].value}}%"
  is_enabled        = true
  pending_duration  = "PT5M"

  # Repeticao de notificacao
  repeat_notification_duration = "PT1H"
  alarm_summary                = "CPU alta na instancia ${var.vm_display_name}"

  message_format = "ONS_OPTIMIZED"

  freeform_tags = merge(local.common_tags, {
    Name      = "${var.vm_display_name}-cpu-alta"
    AlertType = "CPU"
  })
}

# ----------------------------------------------------------------------------
# Alarme: Memory Utilization > 85%
# Monitora o uso de memoria da instancia via OCI Compute Agent
# ----------------------------------------------------------------------------
resource "oci_monitoring_alarm" "memory_high" {
  compartment_id        = var.compartment_ocid
  display_name          = "${var.vm_display_name}-memoria-alta"
  metric_compartment_id = var.compartment_ocid
  namespace             = "oci_computeagent"

  query = <<-QUERY
    MemoryUtilization[1m]{resourceId="${oci_core_instance.this.id}"}.mean() > 85
  QUERY

  destinations = [oci_ons_notification_topic.this.topic_id]

  severity          = "WARNING"
  body              = "ALERTA: Memoria da instancia ${var.vm_display_name} acima de 85%. Valor: {{evaluations[0].value}}%"
  is_enabled        = true
  pending_duration  = "PT5M"
  repeat_notification_duration = "PT1H"
  alarm_summary    = "Memoria alta na instancia ${var.vm_display_name}"

  message_format = "ONS_OPTIMIZED"

  freeform_tags = merge(local.common_tags, {
    Name      = "${var.vm_display_name}-memoria-alta"
    AlertType = "Memory"
  })
}

# ----------------------------------------------------------------------------
# Alarme: Disk Usage > 80%
# Monitora o uso do disco do volume de boot via OCI Compute Agent
# ----------------------------------------------------------------------------
resource "oci_monitoring_alarm" "disk_high" {
  compartment_id        = var.compartment_ocid
  display_name          = "${var.vm_display_name}-disco-alto"
  metric_compartment_id = var.compartment_ocid
  namespace             = "oci_computeagent"

  query = <<-QUERY
    DiskUsagePercent[1m]{resourceId="${oci_core_instance.this.id}"}.mean() > 80
  QUERY

  destinations = [oci_ons_notification_topic.this.topic_id]

  severity          = "CRITICAL"
  body              = "CRITICO: Disco da instancia ${var.vm_display_name} acima de 80%. Acao imediata necessaria. Valor: {{evaluations[0].value}}%"
  is_enabled        = true
  pending_duration  = "PT5M"
  repeat_notification_duration = "PT30M"
  alarm_summary    = "Disco cheio na instancia ${var.vm_display_name}"

  message_format = "ONS_OPTIMIZED"

  freeform_tags = merge(local.common_tags, {
    Name      = "${var.vm_display_name}-disco-alto"
    AlertType = "Disk"
  })
}

# ----------------------------------------------------------------------------
# Alarme: Health Check HTTP - Instancia indisponivel
# Monitora se o Nginx esta respondendo via OCI Health Checks
# ----------------------------------------------------------------------------
resource "oci_monitoring_alarm" "http_unavailable" {
  compartment_id        = var.compartment_ocid
  display_name          = "${var.vm_display_name}-servico-indisponivel"
  metric_compartment_id = var.compartment_ocid
  namespace             = "oci_healthchecks"

  query = <<-QUERY
    HttpProbe[1m]{probeId="${oci_health_checks_http_probe.openproject_health.id}"}.mean() < 1
  QUERY

  destinations = [oci_ons_notification_topic.this.topic_id]

  severity          = "CRITICAL"
  body              = "CRITICO: Servico indisponivel! A instancia ${var.vm_display_name} nao esta respondendo no endereco ${var.openproject_domain}. Verifique imediatamente."
  is_enabled        = true
  pending_duration  = "PT3M"
  repeat_notification_duration = "PT15M"
  alarm_summary    = "Servico indisponivel - ${var.vm_display_name}"

  message_format = "ONS_OPTIMIZED"

  freeform_tags = merge(local.common_tags, {
    Name      = "${var.vm_display_name}-servico-indisponivel"
    AlertType = "HTTP"
  })
}

# ----------------------------------------------------------------------------
# Alarme: VNIC Bytes Out - Trafego de rede excessivo (possivel anomalia)
# ----------------------------------------------------------------------------
resource "oci_monitoring_alarm" "network_high" {
  compartment_id        = var.compartment_ocid
  display_name          = "${var.vm_display_name}-trafego-rede-alto"
  metric_compartment_id = var.compartment_ocid
  namespace             = "oci_vcn"

  query = <<-QUERY
    VnicBytesOut[5m]{resourceId="${oci_core_instance.this.id}"}.rate() > 50000000
  QUERY

  destinations = [oci_ons_notification_topic.this.topic_id]

  severity          = "INFO"
  body              = "AVISO: Trafego de rede de saida alto na instancia ${var.vm_display_name}. Pode indicar atividade incomum."
  is_enabled        = true
  pending_duration  = "PT10M"
  repeat_notification_duration = "PT1H"
  alarm_summary    = "Trafego de rede alto - ${var.vm_display_name}"

  message_format = "ONS_OPTIMIZED"

  freeform_tags = merge(local.common_tags, {
    Name      = "${var.vm_display_name}-trafego-rede-alto"
    AlertType = "Network"
  })
}

# ----------------------------------------------------------------------------
# HTTP Probe - Verificacao de saude do servico
# OCI Health Checks monitora a disponibilidade do endpoint HTTP
# (20 probes gratuitos por mes)
# ----------------------------------------------------------------------------
resource "oci_health_checks_http_probe" "openproject_health" {
  compartment_id = var.compartment_ocid
  display_name   = "openproject-health-probe"

  # IP publico da instancia como alvo do probe
  targets       = [oci_core_instance.this.public_ip]
  port          = 80
  protocol      = "HTTP"
  request_method = "GET"
  path          = "/"

  # Intervalo de verificacao: a cada 1 minuto
  interval_in_seconds = 60

  # Timeout
  timeout_in_seconds = 10

  # Ponto de monitoramento mais proximo (Brasil)
  vantage_point_names = ["ba-qk-ix-1"]

  # Header Host para virtual hosting
  headers {
    name  = "Host"
    value = var.openproject_domain
  }

  freeform_tags = merge(local.common_tags, {
    Name      = "openproject-health-probe"
    Component = "OpenProject"
  })

  timeouts {
    create = "10m"
    update = "10m"
    delete = "10m"
  }
}

# ----------------------------------------------------------------------------
# Log Group - Grupo de logs para centralizacao
# OCI Logging (Always Free: 10 GB por mes de ingestao)
# ----------------------------------------------------------------------------
resource "oci_logging_log_group" "this" {
  compartment_id = var.compartment_ocid
  display_name   = "${var.project_tag}-logs-${var.environment}"
  description    = "Grupo de logs para ${var.project_tag} (${var.environment})"

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_tag}-logs"
  })
}

# ----------------------------------------------------------------------------
# Custom Logs - Configuracao de logs via OCI Logging Agent
# O agente coleta logs dos arquivos da instancia e envia ao OCI Logging
# ----------------------------------------------------------------------------
resource "oci_logging_log" "nginx_access" {
  display_name   = "${var.vm_display_name}-nginx-access"
  log_group_id   = oci_logging_log_group.this.id
  log_type       = "CUSTOM_LOG"
  compartment_id = var.compartment_ocid
  is_enabled     = true

  configuration {
    source {
      type    = "CUSTOM_LOG"
      subject = "/var/log/nginx/access.log"
      charset = "UTF-8"
    }
  }

  freeform_tags = merge(local.common_tags, {
    Name      = "${var.vm_display_name}-nginx-access"
    LogSource = "Nginx"
  })
}

resource "oci_logging_log" "nginx_error" {
  display_name   = "${var.vm_display_name}-nginx-error"
  log_group_id   = oci_logging_log_group.this.id
  log_type       = "CUSTOM_LOG"
  compartment_id = var.compartment_ocid
  is_enabled     = true

  configuration {
    source {
      type    = "CUSTOM_LOG"
      subject = "/var/log/nginx/error.log"
      charset = "UTF-8"
    }
  }

  freeform_tags = merge(local.common_tags, {
    Name      = "${var.vm_display_name}-nginx-error"
    LogSource = "Nginx"
  })
}

resource "oci_logging_log" "docker" {
  display_name   = "${var.vm_display_name}-docker"
  log_group_id   = oci_logging_log_group.this.id
  log_type       = "CUSTOM_LOG"
  compartment_id = var.compartment_ocid
  is_enabled     = true

  configuration {
    source {
      type    = "CUSTOM_LOG"
      subject = "/var/log/docker.log"
      charset = "UTF-8"
    }
  }

  freeform_tags = merge(local.common_tags, {
    Name      = "${var.vm_display_name}-docker"
    LogSource = "Docker"
  })
}
