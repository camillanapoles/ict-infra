# ============================================================================
# variables.tf - Variaveis de configuracao da infraestrutura
# ============================================================================
# Todas as variaveis necessarias para o deploy do OpenProject + Mattermost
# no Oracle Cloud Free Tier. Valores padrão otimizados para a camada gratuita.
# ============================================================================

# ----------------------------------------------------------------------------
# Credenciais OCI (carregadas do .env via OCI_CLI_* vars)
# ----------------------------------------------------------------------------
variable "tenancy_ocid" {
  description = "OCID do tenancy da Oracle Cloud"
  type        = string
}

variable "user_ocid" {
  description = "OCID do usuario com acesso a API OCI"
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint da chave de API OCI"
  type        = string
}

variable "private_key_path" {
  description = "Caminho para o arquivo de chave privada da API OCI"
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "compartment_ocid" {
  description = "OCID do compartimento onde os recursos serao criados"
  type        = string
}

# ----------------------------------------------------------------------------
# Regiao e Disponibilidade
# ----------------------------------------------------------------------------
variable "region" {
  description = "Regiao OCI para deploy (sa-saopaulo-1 e a mais proxima do Brasil)"
  type        = string
  default     = "sa-saopaulo-1"
}

variable "availability_domain" {
  description = "Numero do dominio de disponibilidade (1, 2 ou 3)"
  type        = number
  default     = 1

  validation {
    condition     = can(regex("^[1-3]$", tostring(var.availability_domain)))
    error_message = "O dominio de disponibilidade deve ser 1, 2 ou 3."
  }
}

# ----------------------------------------------------------------------------
# Configuracao da Instancia Compute (A1 Flex - Always Free)
# ----------------------------------------------------------------------------
variable "vm_display_name" {
  description = "Nome de exibicao da instancia de VM"
  type        = string
  default     = "openproject-mattermost-vm"
}

variable "vm_shape" {
  description = "Shape da VM (VM.Standard.A1.Flex e o unico do Free Tier com ARM)"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "vm_ocpus" {
  description = "Numero de OCPUs para a instancia A1 Flex (max 4 no Free Tier)"
  type        = number
  default     = 4

  validation {
    condition     = var.vm_ocpus >= 1 && var.vm_ocpus <= 4
    error_message = "O numero de OCPUs deve estar entre 1 e 4 para o Free Tier."
  }
}

variable "vm_memory_in_gbs" {
  description = "Memoria RAM em GB para a instancia A1 Flex (max 24 GB no Free Tier)"
  type        = number
  default     = 24

  validation {
    condition     = var.vm_memory_in_gbs >= 6 && var.vm_memory_in_gbs <= 24
    error_message = "A memoria deve estar entre 6 e 24 GB para o Free Tier."
  }
}

variable "boot_volume_size_in_gbs" {
  description = "Tamanho do volume de boot em GB"
  type        = number
  default     = 50

  validation {
    condition     = var.boot_volume_size_in_gbs >= 47 && var.boot_volume_size_in_gbs <= 200
    error_message = "O volume de boot deve ter entre 47 e 200 GB."
  }
}

variable "block_volume_size_in_gbs" {
  description = "Tamanho do volume de blocos para dados em GB (max 200 GB no Free Tier total)"
  type        = number
  default     = 150

  validation {
    condition     = var.block_volume_size_in_gbs >= 50 && var.block_volume_size_in_gbs <= 200
    error_message = "O volume de blocos deve ter entre 50 e 200 GB."
  }
}

# ----------------------------------------------------------------------------
# Acesso SSH e Senhas
# ----------------------------------------------------------------------------
variable "ssh_public_key" {
  description = "Chave publica SSH para acesso a instancia VM"
  type        = string
}

variable "admin_password" {
  description = "Senha de administrador para configuracao inicial dos servicos"
  type        = string
  sensitive   = true
}

# ----------------------------------------------------------------------------
# Configuracao de Rede (VCN)
# ----------------------------------------------------------------------------
variable "vcn_cidr" {
  description = "Bloco CIDR da Virtual Cloud Network"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_public_cidr" {
  description = "Bloco CIDR da sub-rede publica"
  type        = string
  default     = "10.0.1.0/24"
}

# ----------------------------------------------------------------------------
# Dominios e Certificados SSL
# ----------------------------------------------------------------------------
variable "openproject_domain" {
  description = "Dominio para o OpenProject (ex: projects.example.com)"
  type        = string
}

variable "mattermost_domain" {
  description = "Dominio para o Mattermost (ex: chat.example.com)"
  type        = string
}

# ----------------------------------------------------------------------------
# Configuracao do Ambiente
# ----------------------------------------------------------------------------
variable "environment" {
  description = "Nome do ambiente (production, staging, development)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "O ambiente deve ser 'production', 'staging' ou 'development'."
  }
}

variable "enable_waf" {
  description = "Habilitar Web Application Firewall (nao disponivel no Free Tier)"
  type        = bool
  default     = false
}

variable "enable_vault" {
  description = "Habilitar OCI Vault para gerenciamento de segredos (Always Free)"
  type        = bool
  default     = true
}

# ----------------------------------------------------------------------------
# Configuracao do Repositorio Git (para cloud-init)
# ----------------------------------------------------------------------------
variable "git_repo_url" {
  description = "URL do repositorio Git com os arquivos de configuracao do Docker Compose"
  type        = string
  default     = ""
}

variable "git_branch" {
  description = "Branch do repositorio Git para deploy"
  type        = string
  default     = "main"
}

# ----------------------------------------------------------------------------
# Notificacao e Alertas
# ----------------------------------------------------------------------------
variable "notification_email" {
  description = "Email para receber alertas e notificacoes do OCI Monitoring"
  type        = string
  default     = ""
}

# ----------------------------------------------------------------------------
# Tags para organizacao de recursos
# ----------------------------------------------------------------------------
variable "project_tag" {
  description = "Tag de projeto para organizacao dos recursos OCI"
  type        = string
  default     = "Incubadora"
}
