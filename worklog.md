---
Task ID: 1
Agent: Main Agent
Task: Projeto IaC completo — OpenProject + Mattermost — Oracle Cloud Free Tier

Work Log:
- Analisou requisitos técnicos completos do documento anexado (OpenProject Enterprise v15 + Mattermost + Oracle Always Free)
- Definiu arquitetura otimizada: 1 VM A1 Flex (4 OCPU / 24 GB), PostgreSQL 17 compartilhado, Nginx + Let's Encrypt
- Mapeou todos os serviços Always Free aplicáveis (VCN, LB, Monitoring, Logging, Vault, Object Storage, WAF)
- Criou 42 arquivos de projeto IaC end-to-end
- Gerou ZIP do projeto completo

Stage Summary:
- 42 arquivos criados em 4 módulos principais: Terraform (12), Docker (10), GitHub Actions (6), Scripts (10), Config (4)
- ZIP gerado: oracle-free-tier-openproject-mattermost.zip (129 KB)
- Projeto pronto para deploy: clone → configure .env → terraform apply → deploy-stack
- Arquitetura usa 100% Always Free: custo mensal R$ 0,00
