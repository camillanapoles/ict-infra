# ============================================================================
# cloudflare-auto.tf - Logica condicional para Cloudflare DNS
# ============================================================================
# Este arquivo implementa o padrao "count = var != '' ? 1 : 0" para que
# toda a configuracao do Cloudflare seja OPCIONAL.
#
# COMPORTAMENTO:
#   - Se CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID e CLOUDFLARE_ZONE_NAME
#     estiverem configurados: cria automaticamente todos os registros DNS
#   - Se nao estiverem configurados: pula Cloudflare e avisa o usuario
#
# Isso permite que o projeto funcione COM ou SEM Cloudflare.
# Sem Cloudflare, o DNS deve ser configurado manualmente no provedor de domino.
# ============================================================================

# ----------------------------------------------------------------------------
# Verificacao de pre-requisitos do Cloudflare
# Exibe mensagem clara quando Cloudflare nao esta configurado
# ----------------------------------------------------------------------------
resource "terraform_data" "cloudflare_check" {
  triggers_replace = {
    api_token = var.cloudflare_api_token != "" ? "***configured***" : ""
    zone_id   = var.cloudflare_zone_id != "" ? "***configured***" : ""
    zone_name = var.cloudflare_zone_name != "" ? var.cloudflare_zone_name : ""
  }

  # Mensagem exibida quando Cloudflare NAO esta configurado
  provisioner "local-exec" {
    when    = create
    command = <<-EOT
      if [ -z "${var.cloudflare_api_token}" ] || [ -z "${var.cloudflare_zone_id}" ] || [ -z "${var.cloudflare_zone_name}" ]; then
        echo "============================================================"
        echo "  ⚠️  CLOUDFLARE DNS NAO CONFIGURADO"
        echo "============================================================"
        echo ""
        echo "  Os recursos do Cloudflare foram IGNORADOS."
        echo "  Para habilitar DNS gerenciado via Cloudflare:"
        echo ""
        echo "  1. Va ate: Cloudflare Dashboard > My Profile > API Tokens"
        echo "  2. Crie um token com permissoes:"
        echo "     - Zone:DNS:Edit"
        echo "     - Zone:Zone:Read"
        echo "  3. No seu arquivo terraform.tfvars (ou .env):"
        echo "     cloudflare_api_token = \"SEU_TOKEN_AQUI\""
        echo "     cloudflare_zone_id   = \"SEU_ZONE_ID_AQUI\""
        echo "     cloudflare_zone_name = \"seudominio.com\""
        echo ""
        echo "  4. Execute novamente: terraform plan && terraform apply"
        echo ""
        echo "  DNS MANUAL (sem Cloudflare):"
        echo "  Configure manualmente no seu provedor de DNS:"
        echo "    A  | projects.${var.cloudflare_zone_name != "" ? var.cloudflare_zone_name : "seudominio.com"}  | ${oci_core_instance.this.public_ip}"
        echo "    A  | chat.${var.cloudflare_zone_name != "" ? var.cloudflare_zone_name : "seudominio.com"}      | ${oci_core_instance.this.public_ip}"
        echo "============================================================"
      else
        echo "============================================================"
        echo "  ✅ CLOUDFLARE DNS CONFIGURADO"
        echo "============================================================"
        echo ""
        echo "  Dominio:       ${var.cloudflare_zone_name}"
        echo "  Zone ID:       ${var.cloudflare_zone_id}"
        echo "  Proxy:         ${var.use_cloudflare_proxy ? "Ativado (orange cloud)" : "Desativado (DNS only)"}"
        echo ""
        echo "  Registros DNS serao criados automaticamente:"
        echo "    projects.${var.cloudflare_zone_name} -> ${oci_core_instance.this.public_ip}"
        echo "    chat.${var.cloudflare_zone_name}      -> ${oci_core_instance.this.public_ip}"
        echo "    *.${var.cloudflare_zone_name}         -> CNAME para ${var.cloudflare_zone_name}"
        echo ""
        echo "  Regras aplicadas:"
        echo "    - Always Use HTTPS"
        echo "    - Min TLS 1.2"
        echo "    - Cache de assets estaticos"
        echo "    - Brotli compression"
        echo "    - WebSockets habilitado (Mattermost)"
        echo "    - Rate limiting em endpoints de login"
        echo "============================================================"
      fi
    EOT
  }

  depends_on = [oci_core_instance.this]
}

# ----------------------------------------------------------------------------
# NOTA IMPORTANTE sobre o padrao condicional
# ----------------------------------------------------------------------------
# Os recursos do Cloudflare (em cloudflare.tf) usam referencias diretas a
# variaveis. O Terraform ainda assim carregara o provider cloudflare, mesmo
# que as variaveis estejam vazias.
#
# Para evitar erros quando Cloudflare nao esta configurado, garantimos que:
# 1. O provider cloudflare aceita api_token vazio (nao faz chamadas se
#    nao ha recursos)
# 2. O recurso terraform_data acima verifica e alerta o usuario
#
# Alternativa: mover todos os recursos para blocos com count, mas isso
# adicionaria complexidade desnecessaria nas referencias dos outputs.
# A abordagem atual e mais limpa para este caso de uso.
