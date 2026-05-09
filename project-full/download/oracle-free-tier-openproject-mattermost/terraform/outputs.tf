# ============================================================================
# outputs.tf - Saidas do Terraform
# ============================================================================
# Define todas as informacoes de saida apos o deploy, incluindo:
# - IPs publicos e URLs de acesso
# - Strings de conexao SSH
# - OCIDs de recursos criados
# - Resumo completo do deploy
# ============================================================================

# ----------------------------------------------------------------------------
# Informacoes da Instancia
# ----------------------------------------------------------------------------
output "vm_id" {
  description = "OCID da instancia de compute criada"
  value       = oci_core_instance.this.id
}

output "vm_display_name" {
  description = "Nome de exibicao da instancia"
  value       = oci_core_instance.this.display_name
}

output "vm_public_ip" {
  description = "IP publico da instancia de compute"
  value       = oci_core_instance.this.public_ip
}

output "vm_private_ip" {
  description = "IP privado da instancia de compute dentro da VCN"
  value       = oci_core_instance.this.private_ip
}

output "vm_shape" {
  description = "Shape da instancia (CPU, memoria)"
  value       = "${var.vm_shape} - ${var.vm_ocpus} OCPU / ${var.vm_memory_in_gbs} GB RAM"
}

# ----------------------------------------------------------------------------
# URLs de Acesso
# ----------------------------------------------------------------------------
output "openproject_url" {
  description = "URL completa de acesso ao OpenProject"
  value       = "https://${var.openproject_domain}"
}

output "mattermost_url" {
  description = "URL completa de acesso ao Mattermost"
  value       = "https://${var.mattermost_domain}"
}

# ----------------------------------------------------------------------------
# Conexao SSH
# ----------------------------------------------------------------------------
output "ssh_connection_string" {
  description = "Comando SSH para acesso a instancia"
  value       = "ssh -i ~/.ssh/id_rsa ubuntu@${oci_core_instance.this.public_ip}"
}

output "ssh_with_key_info" {
  description = "Instrucoes de acesso SSH"
  value       = "Conecte-se com: ssh -i <sua_chave_privada> ubuntu@${oci_core_instance.this.public_ip}"
}

# ----------------------------------------------------------------------------
# Load Balancer
# ----------------------------------------------------------------------------
output "load_balancer_id" {
  description = "OCID do Load Balancer"
  value       = oci_load_balancer.this.id
}

output "load_balancer_ip" {
  description = "IP publico do Load Balancer"
  value       = oci_load_balancer.this.ip_address_details[0].ip_address
}

# ----------------------------------------------------------------------------
# Rede (VCN)
# ----------------------------------------------------------------------------
output "vcn_id" {
  description = "OCID da Virtual Cloud Network"
  value       = oci_core_vcn.this.id
}

output "vcn_cidr" {
  description = "Bloco CIDR da VCN"
  value       = var.vcn_cidr
}

output "subnet_id" {
  description = "OCID da sub-rede publica"
  value       = oci_core_subnet.public.id
}

output "internet_gateway_id" {
  description = "OCID do Internet Gateway"
  value       = oci_core_internet_gateway.this.id
}

# ----------------------------------------------------------------------------
# Vault
# ----------------------------------------------------------------------------
output "vault_ocid" {
  description = "OCID do Vault (se criado)"
  value       = var.enable_vault ? oci_kms_vault.this[0].id : "Vault nao habilitado"
}

output "vault_key_ocid" {
  description = "OCID da chave mestra de criptografia (se criada)"
  value       = var.enable_vault ? oci_kms_key.this[0].id : "Vault nao habilitado"
}

output "vault_secret_count" {
  description = "Numero de segredos armazenados no Vault"
  value       = var.enable_vault ? 5 : 0
}

# ----------------------------------------------------------------------------
# Monitoramento
# ----------------------------------------------------------------------------
output "notification_topic_ocid" {
  description = "OCID do topico de notificacao para alertas"
  value       = oci_ons_notification_topic.this.topic_id
}

output "notification_email" {
  description = "Email cadastrado para receber alertas"
  value       = var.notification_email != "" ? var.notification_email : "Configurar notification_email"
}

output "log_group_ocid" {
  description = "OCID do grupo de logs"
  value       = oci_logging_log_group.this.id
}

# ----------------------------------------------------------------------------
# Seguranca
# ----------------------------------------------------------------------------
output "waf_enabled" {
  description = "Indica se o WAF esta habilitado"
  value       = var.enable_waf
}

output "waf_policy_ocid" {
  description = "OCID da politica WAF (se criada)"
  value       = var.enable_waf ? oci_waas_waas_policy.this[0].id : "WAF nao habilitado"
}

# ----------------------------------------------------------------------------
# Resumo do Deploy
# ----------------------------------------------------------------------------
output "deployment_summary" {
  description = "Resumo completo do deployment"
  value = <<-SUMMARY
    ╔══════════════════════════════════════════════════════════════╗
    ║  DEPLOY CONCLUIDO - OpenProject + Mattermost                ║
    ╠══════════════════════════════════════════════════════════════╣
    ║                                                              ║
    ║  INSTANCIA:                                                  ║
    ║    ID:        ${oci_core_instance.this.id}       ║
    ║    Nome:      ${oci_core_instance.this.display_name}                   ║
    ║    IP Pub:    ${oci_core_instance.this.public_ip}                     ║
    ║    IP Priv:   ${oci_core_instance.this.private_ip}                    ║
    ║    Shape:     ${var.vm_shape} (${var.vm_ocpus} OCPU / ${var.vm_memory_in_gbs} GB)  ║
    ║                                                              ║
    ║  ACESSO:                                                     ║
    ║    OpenProject: https://${var.openproject_domain}           ║
    ║    Mattermost:  https://${var.mattermost_domain}              ║
    ║    SSH:         ssh ubuntu@${oci_core_instance.this.public_ip}          ║
    ║                                                              ║
    ║  LOAD BALANCER:                                              ║
    ║    IP:         ${oci_load_balancer.this.ip_address_details[0].ip_address}              ║
    ║                                                              ║
    ║  AMBIENTE:                                                   ║
    ║    Regiao:     ${var.region}                    ║
    ║    Compartment:${var.compartment_ocid}     ║
    ║    VCN:        ${oci_core_vcn.this.id}     ║
    ║    Vault:      ${var.enable_vault ? "Habilitado" : "Desabilitado"}                          ║
    ║    WAF:        ${var.enable_waf ? "Habilitado" : "Desabilitado"}                          ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
  SUMMARY
}
