# ============================================================================
# vcn.tf - Virtual Cloud Network e componentes de rede
# ============================================================================
# Cria a VCN "incubadora-vcn" com todos os componentes necessarios:
# - Sub-rede publica
# - Internet Gateway
# - NAT Gateway
# - Tabelas de roteamento
# - Security Lists com regras de acesso
# ============================================================================

# ----------------------------------------------------------------------------
# VCN - Virtual Cloud Network
# ----------------------------------------------------------------------------
resource "oci_core_vcn" "this" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "incubadora-vcn"
  dns_label      = "incubadora"

  # Habilita resolucao DNS na VCN para comunicacao entre recursos
  freeform_tags = merge(local.common_tags, {
    Name = "incubadora-vcn"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ----------------------------------------------------------------------------
# Internet Gateway - Permite acesso a internet para a sub-rede publica
# ----------------------------------------------------------------------------
resource "oci_core_internet_gateway" "this" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "incubadora-igw"
  enabled        = true

  freeform_tags = merge(local.common_tags, {
    Name = "incubadora-igw"
  })
}

# ----------------------------------------------------------------------------
# NAT Gateway - Permite saida para internet sem IP publico (para sub-redes privadas)
# Mantido para futuras expansoes com sub-redes privadas
# ----------------------------------------------------------------------------
resource "oci_core_nat_gateway" "this" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "incubadora-nat"

  # Bloqueia trafego por enquanto (apenas para sub-redes privadas futuras)
  freeform_tags = merge(local.common_tags, {
    Name = "incubadora-nat"
  })

  # Depende do IGW para garantir a ordem de criacao
  depends_on = [oci_core_internet_gateway.this]
}

# ----------------------------------------------------------------------------
# Service Gateway - Permite acesso a servicos OCI (Object Storage, etc.)
# ----------------------------------------------------------------------------
resource "oci_core_service_gateway" "this" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "incubadora-sgw"
  services {
    service_id = lookup(
      data.oci_core_services.all_oci_services.services[0],
      "id",
      ""
    )
  }

  freeform_tags = merge(local.common_tags, {
    Name = "incubadora-sgw"
  })
}

data "oci_core_services" "all_oci_services" {
  compartment_id = var.tenancy_ocid
  filter {
    name   = "name"
    values = ["All .* Services In Oracle Services Network"]
    regex  = true
  }
}

# ----------------------------------------------------------------------------
# Route Table - Tabela de roteamento da sub-rede publica
# ----------------------------------------------------------------------------
resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "incubadora-public-rt"

  # Rota padrao: todo trafego de saida vai para o Internet Gateway
  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.this.id
  }

  # Rota para servicos OCI via Service Gateway
  route_rules {
    destination       = lookup(data.oci_core_services.all_oci_services.services[0], "cidr_block", "all-services")
    destination_type  = "SERVICE_CIDR_BLOCK"
    network_entity_id = oci_core_service_gateway.this.id
  }

  freeform_tags = merge(local.common_tags, {
    Name = "incubadora-public-rt"
  })
}

# ----------------------------------------------------------------------------
# Security List - Regras de seguranca para a sub-rede publica
# ----------------------------------------------------------------------------
resource "oci_core_security_list" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "incubadora-public-sl"

  # ---- Regras de Entrada (Ingress) ----

  # SSH - Acesso remoto (porta 22) de qualquer origem
  # RECOMENDACAO: Restringir ao seu IP em producao
  ingress_security_rules {
    protocol  = "6" # TCP
    source    = "0.0.0.0/0"
    direction = "INGRESS"

    tcp_options {
      min = 22
      max = 22
    }

    description = "SSH - Acesso remoto"
  }

  # HTTP - Trafego web (porta 80) para Let's Encrypt e redirect
  ingress_security_rules {
    protocol  = "6" # TCP
    source    = "0.0.0.0/0"
    direction = "INGRESS"

    tcp_options {
      min = 80
      max = 80
    }

    description = "HTTP - Trafego web e certbot"
  }

  # HTTPS - Trafego web seguro (porta 443)
  ingress_security_rules {
    protocol  = "6" # TCP
    source    = "0.0.0.0/0"
    direction = "INGRESS"

    tcp_options {
      min = 443
      max = 443
    }

    description = "HTTPS - Trafego web seguro"
  }

  # Mattermost interno (porta 8065) - apenas da VCN
  ingress_security_rules {
    protocol  = "6" # TCP
    source    = var.vcn_cidr
    direction = "INGRESS"

    tcp_options {
      min = 8065
      max = 8065
    }

    description = "Mattermost - Acesso interno VCN (porta 8065)"
  }

  # OpenProject interno (porta 8080) - apenas da VCN
  ingress_security_rules {
    protocol  = "6" # TCP
    source    = var.vcn_cidr
    direction = "INGRESS"

    tcp_options {
      min = 8080
      max = 8080
    }

    description = "OpenProject - Acesso interno VCN (porta 8080)"
  }

  # PostgreSQL (porta 5432) - apenas da VCN
  ingress_security_rules {
    protocol  = "6" # TCP
    source    = "10.0.0.0/16"
    direction = "INGRESS"

    tcp_options {
      min = 5432
      max = 5432
    }

    description = "PostgreSQL - Acesso interno VCN (porta 5432)"
  }

  # ICMP - Permitir ping para diagnostico
  ingress_security_rules {
    protocol  = "1" # ICMP
    source    = "0.0.0.0/0"
    direction = "INGRESS"

    icmp_options {
      type = 3
      code = 4
    }

    description = "ICMP - Path MTU Discovery"
  }

  # ---- Regras de Saida (Egress) ----

  # Todo trafego de saida permitido
  egress_security_rules {
    protocol      = "all"
    destination   = "0.0.0.0/0"
    direction     = "EGRESS"
    description   = "Permitir todo trafego de saida"
  }

  freeform_tags = merge(local.common_tags, {
    Name = "incubadora-public-sl"
  })
}

# ----------------------------------------------------------------------------
# Sub-rede Publica
# ----------------------------------------------------------------------------
resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.this.id
  cidr_block        = var.subnet_public_cidr
  display_name      = "incubadora-public-subnet"
  dns_label         = "pubsub"
  availability_domain = local.availability_domain.name

  # Habilitar nome de host para a sub-rede
  prohibit_public_ip_on_vnic = false

  # Tabela de roteamento
  route_table_id = oci_core_route_table.public.id

  # Security list
  security_list_ids = [oci_core_security_list.public.id]

  # DHCP options - usar o padrao da VCN
  dhcp_options_id = oci_core_vcn.this.default_dhcp_options_id

  freeform_tags = merge(local.common_tags, {
    Name = "incubadora-public-subnet"
  })
}
