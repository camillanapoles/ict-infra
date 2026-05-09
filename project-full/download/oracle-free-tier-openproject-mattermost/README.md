# Incubadora Cloud — OpenProject + Mattermost

## Infraestrutura como Código (IaC) End-to-End | Oracle Cloud Always Free

Deploy completo de **OpenProject Enterprise v15** + **Mattermost Team Edition** na Oracle Cloud Free Tier, com Infrastructure as Code (Terraform), GitHub Actions para CI/CD automatizado, e arquitetura otimizada para o catálogo Always Free da Oracle.

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│              ORACLE CLOUD — Always Free (2026)                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  COMPUTE — A1 Flex ARM                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Ubuntu 22.04 LTS — 4 OCPU / 24 GB RAM               │  │
│  │  Boot: 50 GB + Block: 150 GB = 200 GB Total          │  │
│  │                                                        │  │
│  │  ┌──────────────────┐  ┌─────────────────────────┐    │  │
│  │  │   OpenProject 15 │  │   Mattermost Team Ed.   │    │  │
│  │  │    :8080 (3GB)   │  │    :8065 (2GB)          │    │  │
│  │  └────────┬─────────┘  └──────────┬──────────────┘    │  │
│  │           └───────────┬───────────┘                   │  │
│  │                 ┌─────┴─────┐                          │  │
│  │                 │ PgSQL 17  │ (4 GB RAM)              │  │
│  │                 │  :5432    │ 2 databases:            │  │
│  │                 └───────────┘ openproject + mattermost │  │
│  │                                                        │  │
│  │  ┌─────────────┐  ┌─────────┐  ┌───────────────────┐  │  │
│  │  │  Nginx      │  │Memcached│  │ Certbot (SSL)     │  │  │
│  │  │  :80/:443   │  │ :11211  │  │ Let's Encrypt     │  │  │
│  │  └─────────────┘  └─────────┘  └───────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  REDE — Always Free                                          │
│  ├─ VCN 10.0.0.0/16 + Subnet Pública 10.0.1.0/24           │
│  ├─ Internet Gateway + Route Table                           │
│  ├─ Flexible Load Balancer (10 Mbps) — opcional             │
│  └─ Security Lists (22, 80, 443, 5432 interno)              │
│                                                               │
│  OBSERVABILIDADE — Always Free                               │
│  ├─ Monitoring: 5 alarmes (CPU, RAM, Disco, HTTP, Rede)     │
│  ├─ Logging: 10 GB/mês centralizados                        │
│  ├─ Notifications: webhook + email                           │
│  └─ APM: tracing distribuído                                 │
│                                                               │
│  SEGURANÇA — Always Free                                     │
│  ├─ Vault: 150 secrets + HSM-backed encryption              │
│  ├─ WAF: opcional (Web Application Firewall)                │
│  ├─ Vulnerability Scanning: automático                       │
│  └─ Certificates: 150 TLS certs                             │
│                                                               │
│  STORAGE — Always Free                                       │
│  ├─ Block Volume: 200 GB (boot + data)                      │
│  └─ Object Storage: 20 GB (backups offsite)                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Alocação de Recursos (24 GB RAM / 4 OCPU)

| Serviço       | RAM Limite | CPU Limite | Porta   |
|---------------|-----------|-----------|---------|
| PostgreSQL 17 | 4 GB      | 1.0 OCPU | 5432    |
| OpenProject 15| 3 GB      | 1.5 OCPU | 8080    |
| Mattermost    | 2 GB      | 0.5 OCPU | 8065    |
| Memcached     | 512 MB    | 0.25      | 11211   |
| Nginx         | 256 MB    | 0.25      | 80/443  |
| Certbot       | 128 MB    | 0.1       | —       |
| OCI Monitor   | 256 MB    | 0.25      | —       |
| Healthcheck   | 64 MB     | 0.1       | —       |
| **Total**     | **~14 GB**| **~3.0**  |         |
| **Disponível**| **~10 GB**| **~1.0**  | pico    |

---

## Estrutura do Projeto

```
oracle-free-tier-openproject-mattermost/
├── .env.example                          # Template de variáveis de ambiente
├── .gitignore                            # Arquivos excluídos do Git
├── .editorconfig                         # Configuração de editores
├── .github/
│   └── workflows/
│       ├── validate.yml                  # Terraform fmt + validate + plan
│       ├── deploy.yml                    # Deploy completo end-to-end
│       ├── destroy.yml                   # Destruição com backup prévio
│       ├── backup.yml                    # Backup diário automático
│       ├── monitoring.yml                # Monitoramento + auto-healing
│       └── update-images.yml             # Atualização semanal de imagens
├── terraform/
│   ├── providers.tf                      # OCI provider + autenticação
│   ├── variables.tf                      # 22 variáveis com defaults
│   ├── main.tf                           # Orquestração dos módulos
│   ├── vcn.tf                            # VCN + subnets + security lists
│   ├── compute.tf                        # Instância A1 Flex + cloud-init
│   ├── networking.tf                     # Flexible Load Balancer
│   ├── monitoring.tf                     # Alarmes + logging + notificações
│   ├── vault.tf                          # Secrets management (HSM)
│   ├── security.tf                       # WAF + IAM policies
│   ├── outputs.tf                        # 20 outputs: IPs, URLs, OCIDs
│   ├── cloud-init.yaml                   # Provisionamento inicial da VM
│   └── terraform.tfvars.example          # Exemplo de valores
├── docker/
│   ├── docker-compose.yml                # Stack completa de produção
│   ├── docker-compose.override.yml       # Override para desenvolvimento
│   ├── .env.example                      # Variáveis Docker
│   ├── deploy.sh                         # Helper de deploy
│   ├── nginx/
│   │   ├── nginx.conf                    # Config principal Nginx
│   │   └── conf.d/
│   │       ├── openproject.conf          # Server block OpenProject
│   │       ├── mattermost.conf           # Server block Mattermost
│   │       └── default.conf              # Catch-all (444)
│   ├── openproject/
│   │   └── custom-config/
│   │       └── init-db.sh                # Init PostgreSQL multi-db
│   └── mattermost/
│       └── config/
│           └── config.json               # Template config Mattermost
├── scripts/
│   ├── init-server.sh                    # Inicialização completa do servidor
│   ├── deploy-stack.sh                   # Deploy do Docker Compose
│   ├── backup.sh                         # Backup completo + OCI Object Storage
│   ├── restore.sh                        # Restauração de backup
│   ├── health-check.sh                   # Diagnóstico completo (JSON ok)
│   ├── update-stack.sh                   # Update com rollback automático
│   ├── cleanup.sh                        # Limpeza de disco
│   ├── setup-ssl.sh                      # SSL com Let's Encrypt
│   ├── setup-env.sh                      # Geração de .env + Vault
│   └── rollback.sh                       # Rollback de emergência
└── README.md                             # Este arquivo
```

---

## Pré-requisitos

### Ferramentas Locais

| Ferramenta    | Versão Mínima | Para quê                  |
|---------------|---------------|---------------------------|
| Terraform     | >= 1.5.0      | IaC - Provisionar infra   |
| OCI CLI       | >= 3.30.0     | Interação com Oracle Cloud|
| Docker        | >= 24.0       | Build/teste local         |
| Git           | >= 2.40       | Controle de versão        |
| Python        | >= 3.10       | Scripts auxiliares        |
| jq            | latest        | Parsear JSON (opcional)   |

### Conta Oracle Cloud

1. **Criar conta gratuita**: https://cloud.oracle.com/free
2. **Configurar API Key**:
   ```bash
   # Opção A: Via OCI Console
   # Profile > User Settings > API Keys > Add API Key

   # Opção B: Via CLI
   bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"
   oci setup config  # Gera ~/.oci/config
   ```
3. **Anotar**:
   - `Tenancy OCID`
   - `User OCID`
   - `Fingerprint`
   - `Private Key` path
   - `Compartment OCID`
   - `Region` (recomendado: `sa-saopaulo-1` para Brasil)

### Domínios DNS

Configure dois registros A apontando para o IP público da VM (obtido após `terraform apply`):

```
projects.seudominio.com  →  A  →  <VM_PUBLIC_IP>
chat.seudominio.com      →  A  →  <VM_PUBLIC_IP>
```

---

## Deploy Rápido

### 1. Clone e Configure

```bash
git clone https://github.com/seu-org/oracle-free-tier-openproject-mattermost.git
cd oracle-free-tier-openproject-mattermost

# Copie e configure o .env
cp .env.example .env
vim .env  # Preencha TODOS os valores

# Copie e configure o tfvars
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
vim terraform/terraform.tfvars
```

### 2. Deploy via GitHub Actions (Recomendado)

Configure os secrets no GitHub repo (Settings > Secrets and variables > Actions):

```bash
# Secrets obrigatórios:
TF_VAR_tenancy_ocid        = ocid1.tenancy.oc1..aaa...
TF_VAR_user_ocid           = ocid1.user.oc1..aaa...
TF_VAR_fingerprint         = aa:bb:cc:dd:...
TF_VAR_private_key         = <conteúdo PEM completo>
TF_VAR_compartment_ocid    = ocid1.compartment.oc1..aaa...
TF_VAR_region              = sa-saopaulo-1
TF_VAR_ssh_public_key      = ssh-rsa AAAA...
VM_SSH_PRIVATE_KEY         = <chave privada SSH>
OPENPROJECT_DOMAIN         = projects.seudominio.com
MATTERMOST_DOMAIN          = chat.seudominio.com
```

Push para `main` e o pipeline de deploy executará automaticamente.

### 3. Deploy Manual (CLI)

```bash
# Inicializar Terraform
cd terraform
terraform init

# Validar configuração
terraform validate

# Planejar (review das mudanças)
terraform plan -out=tfplan

# Aplicar (criar toda infraestrutura)
terraform apply tfplan

# Aguardar VM ficar disponível (~5 min)
# O cloud-init já provisiona Docker, Nginx, etc.

# Copiar arquivos Docker para a VM
scp -i ~/.ssh/oracle_deploy -r ../docker/ ubuntu@<VM_IP>:/opt/app/
scp -i ~/.ssh/oracle_deploy -r ../scripts/ ubuntu@<VM_IP>:/opt/app/scripts/

# Acessar a VM
ssh -i ~/.ssh/oracle_deploy ubuntu@<VM_IP>

# Na VM - setup e deploy
cd /opt/app
chmod +x scripts/*.sh
./scripts/setup-env.sh
./scripts/deploy-stack.sh
./scripts/setup-ssl.sh
```

### 4. Acesso

Após deploy concluído:

| Serviço      | URL                                   | Admin Padrão |
|--------------|---------------------------------------|-------------|
| OpenProject  | `https://projects.seudominio.com`     | admin / (ver .env) |
| Mattermost   | `https://chat.seudominio.com`         | (criado via web) |

---

## Workflows GitHub Actions

| Workflow         | Trigger                             | O que faz |
|------------------|-------------------------------------|-----------|
| `validate.yml`   | push/PR em `terraform/`             | fmt, validate, plan, tflint, checkov |
| `deploy.yml`     | push em `main` / manual             | Terraform apply + Docker deploy + SSL + smoke tests |
| `destroy.yml`    | manual (CONFIRM-DESTROY)            | Backup + Terraform destroy |
| `backup.yml`     | cron diário 02:00 UTC / manual      | pg_dump + tar volumes → OCI Object Storage |
| `monitoring.yml` | cron 15 min / manual                | Health checks + auto-restart + alertas |
| `update-images.yml` | cron semanal dom 03:00 / manual  | Pull + update + rollback se falhar |

---

## Scripts de Automação

Todos em `scripts/`, executáveis com `bash scripts/<nome>.sh --help`.

```bash
# Inicialização completa do servidor (executado pelo cloud-init)
./scripts/init-server.sh --domain-op projects.seudominio.com \
                          --domain-mm chat.seudominio.com \
                          --email admin@seudominio.com

# Deploy da stack Docker Compose
./scripts/deploy-stack.sh

# Health check completo (exit 0=ok, 1=degraded, 2=critical)
./scripts/health-check.sh --json

# Backup manual
./scripts/backup.sh

# Restauração
./scripts/restore.sh --list-available
./scripts/restore.sh --backup-date 2026-04-29

# Atualização segura com rollback automático
./scripts/update-stack.sh

# SSL / Let's Encrypt
./scripts/setup-ssl.sh --staging  # teste primeiro
./scripts/setup-ssl.sh            # produção

# Limpeza de disco
./scripts/cleanup.sh --dry-run

# Rollback de emergência
./scripts/rollback.sh
```

---

## Configuração do OpenProject (Incubadora)

Após o primeiro acesso ao OpenProject, configure conforme o guia do projeto:

### Estrutura de Projetos

```
IncubaScience Hub (Projeto Pai)
├── Deeptech Alfa (Subprojeto - PRIVADO)
├── Deeptech Beta (Subprojeto - PRIVADO)
├── Deeptech Gama (Subprojeto - PRIVADO)
└── ... (dinâmico conforme novas incubadas)
```

### Papéis (RBAC)

| Papel                          | Escopo      | Permissões Chave                         |
|-------------------------------|-------------|-----------------------------------------|
| Admin_Incubadora              | Global      | Acesso total                             |
| Gestor_Portfolio              | Projeto     | Ver/criar/editar WPs em TODOS projetos  |
| Líder_Deeptech                | Projeto     | Gerenciamento completo do seu projeto    |
| Membro_Deeptech               | Projeto     | Ver/editar WPs atribuídos no seu projeto |
| Visualizador_Deeptech         | Projeto     | Somente leitura no seu projeto           |

### Campos Personalizados

- **Nível TRL** (1-9) — Technology Readiness Level
- **Nível MRL** (1-9) — Market Readiness Level
- **Status ESG** — Iniciante / Intermediário / Avançado
- **Fase da Deeptech** — Seleção / Diagnóstico / MVP / Tração / Escala / Graduada
- **Tipo de Atividade** — Mentoria / Consultoria / Formação / Diagnóstico / Evento
- **ODS Relacionados** — Multi-select ODS 1-17
- **Pontuação Ranking** — Número, calculada por script externo

---

## Monitoramento e Observabilidade

### OCI Native (Always Free)

- **Monitoring Dashboard**: CPU, RAM, Disco, Network em tempo real
- **5 Alarmes Configurados**:
  1. CPU > 80% (notificação email + webhook)
  2. RAM > 85% (notificação email + webhook)
  3. Disco > 80% (notificação email + webhook)
  4. HTTP Health Probe (serviço indisponível)
  5. Network throughput (pico de banda)
- **Logging**: 10 GB/mês centralizados (Nginx, Docker, OpenProject, Mattermost)
- **Notifications**: email + HTTPS webhook

### Self-Healing

O workflow `monitoring.yml` executa a cada 15 minutos:
1. Verifica saúde dos serviços
2. Se falhou: tenta `docker compose restart`
3. Se persistiu: cria GitHub Issue + envia alerta

---

## Backup e Recuperação

### Automático (diário às 02:00 UTC)

- PostgreSQL: pg_dump gzip (openproject + mattermost)
- Volumes Docker: tar.gz (OpenProject assets + Mattermost data)
- Nginx configs + SSL certificates
- Upload para OCI Object Storage (20 GB free)
- Retenção: 30 dias
- Limpeza automática de backups antigos

### Manual

```bash
# Backup imediato
./scripts/backup.sh

# Listar backups disponíveis
./scripts/restore.sh --list-available

# Restaurar backup específico
./scripts/restore.sh --backup-date 2026-04-29
```

---

## Segurança

- **TLS 1.3** com Let's Encrypt (renovação automática via certbot)
- **HSTS** (2 anos + preload)
- **Headers de segurança**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **UFW Firewall**: apenas portas 22, 80, 443 abertas externamente
- **Fail2Ban**: proteção contra brute-force SSH
- **OCI Vault**: secrets criptografados com HSM-backed keys
- **OCI WAF**: proteção contra SQLi, XSS (opcional)
- **Docker**: containers isolados, sem privilégios desnecessários
- **PostgreSQL**: apenas acesso via rede interna Docker (172.20.0.0/16)

---

## Custos — Zero

Todos os recursos utilizados estão no **Oracle Cloud Always Free**:

| Recurso                    | Limite Free    | Utilizado     |
|---------------------------|----------------|---------------|
| A1 Flex (CPU)              | 4 OCPU         | 4 OCPU        |
| A1 Flex (RAM)              | 24 GB          | ~14 GB        |
| Block Storage              | 200 GB         | ~200 GB       |
| Object Storage             | 20 GB          | backups       |
| Load Balancer              | 10 Mbps        | opcional      |
| Monitoring                 | 500M points    | ~5 alarmes    |
| Logging                    | 10 GB/mês      | < 2 GB        |
| Notifications              | 1M HTTPS + 1K email | 5 subs  |
| Vault + Secrets            | 150 secrets    | ~6 secrets    |
| Outbound Transfer          | 10 TB/mês      | << 1 TB       |

**Custo total mensal: R$ 0,00**

---

## Troubleshooting

### VM não provisiona (Capacity)

> Oracle frequentemente esgota A1 em US-East. Prefira `sa-saopaulo-1`, `eu-frankfurt-1`, `ap-tokyo-1` ou `ap-singapore-1`.

### SSL Certificate falha

```bash
# Verificar se DNS aponta para o IP correto
dig projects.seudominio.com +short

# Teste com staging primeiro
./scripts/setup-ssl.sh --staging

# Verificar logs do certbot
docker logs incubadora-certbot-1
```

### Container não inicia

```bash
# Verificar status
docker compose ps

# Logs do serviço
docker compose logs openproject --tail=100
docker compose logs mattermost --tail=100
docker compose logs postgresql --tail=100

# Health check completo
./scripts/health-check.sh
```

### Docker Compose recursos insuficientes

```bash
# Verificar limites
docker stats --no-stream

# Ajustar no docker-compose.yml (seção deploy.resources.limits)
```

---

## Contribuição

1. Fork o repositório
2. Crie branch: `git checkout -b feature/minha-feature`
3. Commite: `git commit -m 'feat: descrição'`
4. Push: `git push origin feature/minha-feature`
5. PR para `main`

---

## Licença

Este projeto é distribuído sob a licença MIT. Os softwares OpenProject e Mattermost possuem suas próprias licenças.

---

## Autoria

Infraestrutura como Código para Incubadora de Deeptechs — IncubaScience
Oracle Cloud Always Free | Terraform | Docker Compose | GitHub Actions
