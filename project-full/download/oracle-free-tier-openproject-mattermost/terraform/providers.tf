# ============================================================================
# providers.tf - Provedores Terraform para Oracle Cloud Infrastructure
# ============================================================================
# Configura o provedor OCI com autenticacao via variaveis de ambiente.
# As credenciais sao carregadas do arquivo .env (OCI_CLI_* vars).
# ============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 6.0.0"
    }
  }
}

# ----------------------------------------------------------------------------
# Provedor Oracle Cloud Infrastructure
# Autenticacao: Variaveis de ambiente OCI_CLI_TENANCY, OCI_CLI_USER,
#               OCI_CLI_FINGERPRINT, OCI_CLI_KEY_FILE, OCI_CLI_REGION
# Tambem suporta OCI_CLI_COMPARTMENT para definir o compartimento padrao.
# ----------------------------------------------------------------------------
provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
  compartment_id   = var.compartment_ocid

  # Timeout padrao para operacoes de longa duracao (criacao de instancias, etc.)
  # Aumentado para acomodar a disponibilidade do A1 Flex no Free Tier
  retry_duration_seconds = 1200
}
