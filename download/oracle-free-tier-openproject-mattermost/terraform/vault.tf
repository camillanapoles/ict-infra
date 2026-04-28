# ============================================================================
# vault.tf - OCI Vault para gerenciamento de segredos
# ============================================================================
# Cria um Vault para armazenar segredos sensíveis (Always Free: 150 segredos).
# Utiliza o KMS (Key Management Service) para criptografia.
#
# Segredos armazenados:
# - Senha do banco de dados PostgreSQL
# - Senha admin do OpenProject
# - Senha admin do Mattermost
# - Credenciais SMTP para email
# ============================================================================

# ----------------------------------------------------------------------------
# Vault - Cofre de segredos (Always Free)
# ----------------------------------------------------------------------------
resource "oci_kms_vault" "this" {
  # Vault condicional - criado apenas se enable_vault = true
  count = var.enable_vault ? 1 : 0

  compartment_id = var.compartment_ocid
  display_name   = "${var.project_tag}-vault-${var.environment}"

  # Tipo do vault: DEFAULT (Always Free com limite de 20 chaves)
  vault_type = "DEFAULT"

  # O vault e criado na VCN para acesso privado
  # Necessita de uma sub-rede para o vault
  # Usamos a sub-rede publica como workaround (em producao usar sub-rede privada)
  subnet_id = oci_core_subnet.public.id

  # Politica de restauracao de backup
  restore_trigger = "IMMEDIATE"

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_tag}-vault"
  })
}

# ----------------------------------------------------------------------------
# Encryption Key - Chave de criptografia master
# ----------------------------------------------------------------------------
resource "oci_kms_key" "this" {
  count = var.enable_vault ? 1 : 0

  compartment_id = var.compartment_ocid
  management_endpoint = oci_kms_vault.this[0].management_endpoint
  display_name   = "${var.project_tag}-master-key"

  # Shape da chave: AES com 256 bits
  key_shape {
    algorithm = "AES"
    length    = 32
  }

  # Protecao contra exclusao
  protection_mode = "SOFTWARE"

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_tag}-master-key"
  })

  # Depende do vault estar ativo
  depends_on = [oci_kms_vault.this]
}

# ----------------------------------------------------------------------------
# Senha do Banco de Dados PostgreSQL
# ----------------------------------------------------------------------------
resource "oci_vault_secret" "db_password" {
  count = var.enable_vault ? 1 : 0

  compartment_id = var.compartment_ocid
  secret_name   = "database-password"
  vault_id       = oci_kms_vault.this[0].id
  key_id         = oci_kms_key.this[0].id

  # Conteudo do segredo (gerado automaticamente)
  secret_content {
    content_type = "BASE64"
    content      = base64encode(random_password.db_password[0].result)
  }

  # Rotacao automatica (opcional - a cada 90 dias)
  current_version {
    version_number = 1
  }

  # Metadata
  description = "Senha do banco de dados PostgreSQL para OpenProject e Mattermost"

  freeform_tags = merge(local.common_tags, {
    Name       = "database-password"
    SecretType = "Database"
  })
}

resource "random_password" "db_password" {
  count = var.enable_vault ? 1 : 0

  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_special      = 3
  min_upper        = 3
  min_lower        = 3
  min_numeric      = 3
}

# ----------------------------------------------------------------------------
# Senha Admin do OpenProject
# ----------------------------------------------------------------------------
resource "oci_vault_secret" "openproject_admin" {
  count = var.enable_vault ? 1 : 0

  compartment_id = var.compartment_ocid
  secret_name   = "openproject-admin-password"
  vault_id       = oci_kms_vault.this[0].id
  key_id         = oci_kms_key.this[0].id

  secret_content {
    content_type = "BASE64"
    content      = base64encode(var.admin_password)
  }

  current_version {
    version_number = 1
  }

  description = "Senha do usuario administrador do OpenProject"

  freeform_tags = merge(local.common_tags, {
    Name       = "openproject-admin-password"
    SecretType = "OpenProject"
  })
}

# ----------------------------------------------------------------------------
# Senha Admin do Mattermost
# ----------------------------------------------------------------------------
resource "oci_vault_secret" "mattermost_admin" {
  count = var.enable_vault ? 1 : 0

  compartment_id = var.compartment_ocid
  secret_name   = "mattermost-admin-password"
  vault_id       = oci_kms_vault.this[0].id
  key_id         = oci_kms_key.this[0].id

  secret_content {
    content_type = "BASE64"
    content      = base64encode(random_password.mm_password[0].result)
  }

  current_version {
    version_number = 1
  }

  description = "Senha do usuario administrador do Mattermost"

  freeform_tags = merge(local.common_tags, {
    Name       = "mattermost-admin-password"
    SecretType = "Mattermost"
  })
}

resource "random_password" "mm_password" {
  count = var.enable_vault ? 1 : 0

  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_special      = 3
  min_upper        = 3
  min_lower        = 3
  min_numeric      = 3
}

# ----------------------------------------------------------------------------
# Credenciais SMTP para envio de emails
# ----------------------------------------------------------------------------
resource "oci_vault_secret" "smtp_credentials" {
  count = var.enable_vault ? 1 : 0

  compartment_id = var.compartment_ocid
  secret_name   = "smtp-credentials"
  vault_id       = oci_kms_vault.this[0].id
  key_id         = oci_kms_key.this[0].id

  # JSON com credenciais SMTP
  secret_content {
    content_type = "BASE64"
    content      = base64encode(jsonencode({
      smtp_host     = "smtp.gmail.com"
      smtp_port     = 587
      smtp_user     = "noreply@example.com"
      smtp_password = random_password.smtp_password[0].result
      smtp_tls      = true
    }))
  }

  current_version {
    version_number = 1
  }

  description = "Credenciais SMTP para envio de emails transacionais (OpenProject e Mattermost)"

  freeform_tags = merge(local.common_tags, {
    Name       = "smtp-credentials"
    SecretType = "SMTP"
  })
}

resource "random_password" "smtp_password" {
  count = var.enable_vault ? 1 : 0

  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_special      = 2
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
}

# ----------------------------------------------------------------------------
# Segredo: Chave Secreta do Mattermost (para JWT e integracoes)
# ----------------------------------------------------------------------------
resource "oci_vault_secret" "mattermost_secret_key" {
  count = var.enable_vault ? 1 : 0

  compartment_id = var.compartment_ocid
  secret_name   = "mattermost-secret-key"
  vault_id       = oci_kms_vault.this[0].id
  key_id         = oci_kms_key.this[0].id

  secret_content {
    content_type = "BASE64"
    content      = base64encode(random_password.mm_secret_key[0].result)
  }

  current_version {
    version_number = 1
  }

  description = "Chave secreta do Mattermost para tokens JWT e integridade de sessao"

  freeform_tags = merge(local.common_tags, {
    Name       = "mattermost-secret-key"
    SecretType = "Mattermost"
  })
}

resource "random_password" "mm_secret_key" {
  count = var.enable_vault ? 1 : 0

  length  = 64
  special = false
}

# ----------------------------------------------------------------------------
# Politica IAM - Permite que a instancia acesse o Vault
# ----------------------------------------------------------------------------
resource "oci_identity_policy" "vault_access" {
  count = var.enable_vault ? 1 : 0

  compartment_id = var.compartment_ocid
  name           = "${var.project_tag}-vault-access-policy"
  description    = "Permite que a instancia de computacao acesse segredos do Vault"

  statements {
    effect  = "ALLOW"
    actions = [
      "VAULTS_READ",
      "VAULTS_USE",
      "SECRETS_READ",
      "SECRETS_LIST"
    ]
    resources = [
      oci_kms_vault.this[0].id,
      oci_kms_key.this[0].id,
      "${oci_kms_vault.this[0].id}/secrets/*"
    ]
    # Permite acesso ao dynamic group das instancias de compute
    # Nota: Requer criacao de dynamic group previa
  }

  # Permite a instancia usar a chave de criptografia
  statements {
    effect  = "ALLOW"
    actions = [
      "KEYS_READ",
      "KEYS_DECRYPT",
      "KEYS_ENCRYPT"
    ]
    resources = [oci_kms_key.this[0].id]
  }

  freeform_tags = merge(local.common_tags, {
    Name = "${var.project_tag}-vault-access-policy"
  })
}
