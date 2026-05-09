# ============================================================================
# main.tf - Arquivo principal do Terraform
# ============================================================================
# Orquestra todos os componentes da infraestrutura:
# 1. Data sources (imagens, ADs)
# 2. VCN e rede
# 3. Vault (condicional)
# 4. Compute (instancia A1 Flex)
# 5. Networking (Load Balancer / Nginx)
# 6. Monitoring e alertas
# 7. WAF (condicional)
# ============================================================================

# ----------------------------------------------------------------------------
# Data Sources - Busca de informacoes dinamicas da OCI
# ----------------------------------------------------------------------------

# Imagem do Ubuntu 22.04 LTS para a instancia
data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = var.vm_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# Dominio de disponibilidade pelo numero
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

# ID da sub-rede (referencia local, criada em vcn.tf)
# Os recursos sao implicitamente ligados pelas referencias nos outros arquivos

# ----------------------------------------------------------------------------
# Tags aplicadas a todos os recursos
# ----------------------------------------------------------------------------
locals {
  # Dominio de disponibilidade baseado no numero informado
  availability_domain = lookup(
    data.oci_identity_availability_domains.ads.availability_domains,
    var.availability_domain - 1,
    null
  )

  # Tags padrao para todos os recursos
  common_tags = {
    Project     = var.project_tag
    Environment = var.environment
    ManagedBy   = "Terraform"
    Components  = "OpenProject+Mattermost"
  }

  # Cloud-init como base64 (referencia ao arquivo externo)
  cloud_init_content = file("${path.module}/cloud-init.yaml")

  cloud_init_encoded = base64encode(
    templatefile(
      "${path.module}/cloud-init.yaml",
      {
        git_repo_url     = var.git_repo_url
        git_branch       = var.git_branch
        admin_password   = var.admin_password
        openproject_domain = var.openproject_domain
        mattermost_domain  = var.mattermost_domain
        environment        = var.environment
        region             = var.region
      }
    )
  )
}

# ----------------------------------------------------------------------------
# Sumario de deploy - exibido apos o apply
# ----------------------------------------------------------------------------
resource "terraform_data" "deployment_summary" {
  # Este recurso e executado sempre apos o apply
  # Serve como sumario visual do deploy

  triggers_replace = {
    vm_id       = oci_core_instance.this.id
    timestamp   = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "============================================================"
      echo "  DEPLOY CONCLUIDO - OpenProject + Mattermost"
      echo "============================================================"
      echo "  VM:             ${oci_core_instance.this.display_name}"
      echo "  IP Publico:     ${oci_core_instance.this.public_ip}"
      echo "  OpenProject:    https://${var.openproject_domain}"
      echo "  Mattermost:     https://${var.mattermost_domain}"
      echo "  SSH:            ssh ubuntu@${oci_core_instance.this.public_ip}"
      echo "  Ambiente:       ${var.environment}"
      echo "  Regiao:         ${var.region}"
      echo "============================================================"
    EOT
  }
}
