# ============================================================================
# compute.tf - Instancia de computacao (OCI Compute)
# ============================================================================
# Cria a instancia A1 Flex ARM com 4 OCPU / 24 GB RAM (Always Free).
# Utiliza Ubuntu 22.04 LTS como sistema operacional.
# Cloud-init e injetado via metadata para provisionamento automatico.
# ============================================================================

# ----------------------------------------------------------------------------
# Volume de Boot (disco do sistema operacional)
# ----------------------------------------------------------------------------
resource "oci_core_boot_volume" "this" {
  compartment_id      = var.compartment_ocid
  availability_domain = local.availability_domain.name
  display_name        = "${var.vm_display_name}-boot"

  # Tamanho do volume de boot em GB
  size_in_gbs = var.boot_volume_size_in_gbs

  # Perfis de performance
  vpus_per_gb = "10"

  # Criptografia
  kms_key_id = var.enable_vault ? oci_kms_key.this[0].id : null

  # Backup automatico habilitado (Always Free inclui 1 backup)
  boot_volume_backup_policy {
    policy_type = "ENABLED"
  }

  freeform_tags = merge(local.common_tags, {
    Name = "${var.vm_display_name}-boot"
  })
}

# ----------------------------------------------------------------------------
# Volume de Blocos (dados persistentes - Docker volumes, BD, etc.)
# ----------------------------------------------------------------------------
resource "oci_core_volume" "data" {
  compartment_id      = var.compartment_ocid
  availability_domain = local.availability_domain.name
  display_name        = "${var.vm_display_name}-data"

  # Tamanho do volume de dados
  size_in_gbs = var.block_volume_size_in_gbs

  # Perfis de performance (balanceado para workload geral)
  vpus_per_gb = "10"

  # Criptografia com Vault (se habilitado)
  kms_key_id = var.enable_vault ? oci_kms_key.this[0].id : null

  # Backup automatico
  backup_policy {
    policy_type = "ENABLED"
  }

  freeform_tags = merge(local.common_tags, {
    Name      = "${var.vm_display_name}-data"
    Component = "Data"
  })
}

# ----------------------------------------------------------------------------
# Instancia Compute - A1 Flex ARM (Always Free)
# ----------------------------------------------------------------------------
resource "oci_core_instance" "this" {
  # ATENCAO: Timeout aumentado pois instancias A1 Flex podem demorar
  # ate 15-20 minutos para ficar disponivel no Free Tier
  availability_domain = local.availability_domain.name
  compartment_id      = var.compartment_ocid
  display_name        = var.vm_display_name
  shape               = var.vm_shape

  # Shape config e OBRIGATORIO para shapes Flex (A1, E4)
  shape_config {
    ocpus         = var.vm_ocpus
    memory_in_gbs = var.vm_memory_in_gbs
  }

  # Configuracao de rede - VNIC na sub-rede publica
  create_vnic_details {
    subnet_id                 = oci_core_subnet.public.id
    assign_public_ip          = true
    display_name              = "${var.vm_display_name}-vnic"
    hostname_label            = "incubadora"
    nsg_ids                   = [] # Security Lists ja aplicados na sub-rede
    skip_source_dest_check    = false
  }

  # Imagem do Ubuntu 22.04 LTS (mais recente disponivel)
  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_size_in_gbs

    # Nao usar volume de boot existente, criar novo com a imagem
    # (o boot_volume separado acima e referenciado pela policy)
  }

  # Metadata para cloud-init
  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = local.cloud_init_encoded

    # Tags de infraestrutura visiveis dentro da instancia
    "environment"          = var.environment
    "openproject_domain"   = var.openproject_domain
    "mattermost_domain"    = var.mattermost_domain
    "vcn_cidr"             = var.vcn_cidr
  }

  # Definicoes de preservacao
  preserve_boot_volume = false
  is_pv_encryption_in_transit_enabled = true

  # Definicoes de recovery (Always Free: pode nao estar disponivel)
  recovery_action = "RESTORE_INSTANCE"

  # Tags do provedor OCI
  freeform_tags = merge(local.common_tags, {
    Name      = var.vm_display_name
    Shape     = var.vm_shape
    OCPUs     = tostring(var.vm_ocpus)
    MemoryGB  = tostring(var.vm_memory_in_gbs)
  })

  # Definicoes do Oracle Cloud Agent
  agent_config {
    is_monitoring_disabled  = false
    is_management_disabled  = false
    plugins_config {
      name          = "Bastion"
      desired_state = "DISABLED"
    }
    plugins_config {
      name          = "Compute Instance Monitoring"
      desired_state = "ENABLED"
    }
    plugins_config {
      name          = "Oracle Cloud Agent"
      desired_state = "ENABLED"
    }
    plugins_config {
      name          = "OS Management Service Agent"
      desired_state = "ENABLED"
    }
    plugins_config {
      name          = "Custom Logs Monitoring"
      desired_state = "ENABLED"
    }
    plugins_config {
      name          = "Management Dashboard"
      desired_state = "ENABLED"
    }
    plugins_config {
      name          = "Remote Execution"
      desired_state = "ENABLED"
    }
  }

  # Tempo de espera para o provisionamento
  timeouts {
    create = "60m"
    update = "40m"
    delete = "20m"
  }

  # Depende do vault para a chave de criptografia (se habilitado)
}

# ----------------------------------------------------------------------------
# Volume Attachment - Conecta o volume de dados a instancia
# ----------------------------------------------------------------------------
resource "oci_core_volume_attachment" "data" {
  attachment_type = "paravirtualized"
  instance_id     = oci_core_instance.this.id
  volume_id       = oci_core_volume.data.id
  display_name    = "${var.vm_display_name}-data-attachment"

  # Usar paravirtualizado por ser mais simples e compativel com Ubuntu
}

# ----------------------------------------------------------------------------
# IP Reservado (opcional) - Garante que o IP publico nao muda
# ----------------------------------------------------------------------------
resource "oci_core_public_ip" "this" {
  compartment_id = var.compartment_ocid
  lifetime       = "RESERVED"
  display_name   = "${var.vm_display_name}-reserved-ip"

  # Associar ao VNIC da instancia (criado apos a instancia)
  # Usamos um modulo null_resource para associar o IP reservado
}
