# Incubadora Platform — Arquitetura do Sistema

Apresentacao interativa da arquitetura do sistema para incubadora de startups. Diagramas C4 interativos, fluxo de uso do usuario e especificacoes tecnicas completas.

## Stack

- **Next.js 14** (Static Export para GitHub Pages)
- **Tailwind CSS** + Framer Motion
- **SVG Interativo** para diagramas C4
- **TypeScript**

## Seções da Apresentação

1. **Visao Geral** — Resumo da plataforma e tecnologias
2. **Problema Atual** — Diagnostico das ferramentas fragmentadas
3. **Solucao Integrada** — Proposta unificada (Mattermost + OpenProject + S3)
4. **C4 System Context** — Diagrama interativo do contexto do sistema
5. **C4 Containers** — Containers e servicos dentro do Kubernetes
6. **C4 Deployment** — Deployment completo em producao
7. **Fluxo do Usuario** — Casos de uso reais (antes vs depois)
8. **Especificacoes Tecnicas** — Detalhes completos da implantacao

## Como Rodar Localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Deploy no GitHub Pages

### Setup Inicial

1. Crie um novo repositorio no GitHub
2. Push este projeto para a branch `main`
3. Va em **Settings > Pages**
4. Em **Source**, selecione **GitHub Actions**

O workflow `.github/workflows/deploy.yml` vai buildar e deployar automaticamente.

### Workflow

Cada push na branch `main` aciona o deploy automatico:

```
Push → GitHub Actions → npm run build → Deploy para GitHub Pages
```

## Arquitetura

A plataforma e composta por:

| Componente | Tecnologia | Descricao |
|---|---|---|
| Orquestracao | K3s (Kubernetes) | Cluster leve single-node, HA-ready |
| Comunicacao | Mattermost Team | Mensageria com canais, threads, webhooks |
| Projetos | OpenProject 15 | Kanban, Gantt, sprints, roadmaps |
| Banco de Dados | PostgreSQL 17 | 2 databases (openproject + mattermost) |
| Documentos | MinIO (S3 API) | Object storage compativel com S3 |
| Infra | Traefik + cert-manager | Ingress + SSL automatico |
| Monitoramento | Prometheus + Grafana | Metricas, dashboards, alertas |

## Licenca

MIT
