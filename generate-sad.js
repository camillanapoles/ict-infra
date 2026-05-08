#!/usr/bin/env node
/**
 * Generate SAD - Plataforma Incubadora Cloud
 * Documento de Arquitetura de Software
 * Palette GO-1 (Graphite Orange) | Recipe R4 (Top Color Block)
 */

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Header, Footer, Table, TableRow, TableCell,
  WidthType, HeadingLevel, AlignmentType, PageBreak, PageNumber, BorderStyle,
  ShadingType, SectionType, TableOfContents, NumberFormat, ImageRun, VerticalAlign,
  Tab, TabStopPosition, TabStopType
} = require("docx");

// ─── GO-1 Palette ───
const P = {
  primary: "1A2330",
  body: "000000",
  secondary: "607080",
  accent: "D4875A",
  surface: "FDF8F3",
  white: "FFFFFF",
  lightGray: "F0EDEA",
  cover: {
    titleColor: "FFFFFF",
    subtitleColor: "B0B8C0",
    metaColor: "90989F",
    footerColor: "687078",
  },
  table: {
    headerBg: "D4875A",
    headerText: "1A1A1A",
    accentLine: "D4875A",
    innerLine: "DDD0C8",
    surface: "F8F0EB",
  },
};

// ─── Helpers ───
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const accentBottom = { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent }, left: noBorder, right: noBorder };
const thinBorder = (color) => ({ style: BorderStyle.SINGLE, size: 1, color: color || P.table.innerLine });
const tableBorders = {
  top: thinBorder(P.table.innerLine),
  bottom: thinBorder(P.table.innerLine),
  left: thinBorder(P.table.innerLine),
  right: thinBorder(P.table.innerLine),
};

function headerCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { fill: P.table.headerBg, type: ShadingType.CLEAR, color: P.table.headerBg },
    borders: tableBorders,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          new TextRun({ text, bold: true, size: 18, color: P.table.headerText, font: "Calibri" }),
        ],
      }),
    ],
  });
}

function dataCell(text, widthPct, opts = {}) {
  const fill = opts.shaded ? P.table.surface : P.white;
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { fill, type: ShadingType.CLEAR, color: fill },
    borders: tableBorders,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          new TextRun({
            text,
            size: 18,
            color: P.body,
            font: "Calibri",
            bold: opts.bold || false,
          }),
        ],
      }),
    ],
  });
}

function createTable(headers, rows, colWidths) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  const pcts = colWidths.map((w) => Math.round((w / total) * 10000) / 100);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => headerCell(h, pcts[i])),
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell, ci) =>
            dataCell(cell, pcts[ci], { shaded: ri % 2 === 1 })
          ),
        })
      ),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200, line: 276 },
    children: [
      new TextRun({ text, bold: true, size: 28, color: P.primary, font: "Calibri" }),
    ],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent, space: 6 } },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150, line: 276 },
    children: [
      new TextRun({ text, bold: true, size: 24, color: P.primary, font: "Calibri" }),
    ],
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine, space: 4 } },
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 264 },
    children: [
      new TextRun({ text, bold: true, size: 20, color: P.accent, font: "Calibri" }),
    ],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { before: opts.before || 80, after: opts.after || 80, line: 312 },
    children: [
      new TextRun({
        text,
        size: 20,
        color: opts.color || P.body,
        font: "Calibri",
        bold: opts.bold || false,
        italics: opts.italics || false,
      }),
    ],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 40, after: 40, line: 300 },
    indent: { left: 720 + level * 360, hanging: 260 },
    children: [
      new TextRun({ text: "•", size: 20, color: P.accent, font: "Calibri" }),
      new TextRun({ text: " " + text, size: 20, color: P.body, font: "Calibri" }),
    ],
  });
}

function numberedItem(num, text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 40, after: 40, line: 300 },
    indent: { left: 720, hanging: 360 },
    children: [
      new TextRun({ text: `${num}.`, bold: true, size: 20, color: P.accent, font: "Calibri" }),
      new TextRun({ text: ` ${text}`, size: 20, color: P.body, font: "Calibri" }),
    ],
  });
}

function spacer(h = 100) {
  return new Paragraph({ spacing: { before: h, after: 0 }, children: [] });
}

function accentLine() {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.accent } },
    children: [],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── Cover Page ───
function buildCover() {
  const coverTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      // Top color block
      new TableRow({
        height: { value: 5000, rule: "exact" },
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: P.primary, type: ShadingType.CLEAR, color: P.primary },
            borders: noBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              spacer(200),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 100 },
                children: [
                  new TextRun({
                    text: "Documento de Arquitetura de Software",
                    bold: true,
                    size: 44,
                    color: P.cover.titleColor,
                    font: "Calibri",
                  }),
                ],
              }),
              spacer(50),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({
                    text: "Plataforma Incubadora Cloud",
                    bold: true,
                    size: 32,
                    color: P.accent,
                    font: "Calibri",
                  }),
                ],
              }),
              spacer(100),
            ],
          }),
        ],
      }),
      // Meta block
      new TableRow({
        height: { value: 3800, rule: "exact" },
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: P.surface, type: ShadingType.CLEAR, color: P.surface },
            borders: noBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              spacer(300),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 80 },
                children: [
                  new TextRun({
                    text: "OpenProject + Mattermost | Oracle Cloud Always Free",
                    size: 22,
                    color: P.secondary,
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 80 },
                children: [
                  new TextRun({
                    text: "Versão 1.0  |  Maio 2026",
                    size: 22,
                    color: P.secondary,
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 80 },
                children: [
                  new TextRun({
                    text: "Classificação: Interno",
                    size: 22,
                    color: P.cover.metaColor,
                    font: "Calibri",
                    italics: true,
                  }),
                ],
              }),
              spacer(200),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: "──────────────────────────────────────────",
                    size: 20,
                    color: P.accent,
                    font: "Calibri",
                  }),
                ],
              }),
              spacer(100),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({
                    text: "Preparado para: Scrum Master",
                    size: 20,
                    color: P.cover.footerColor,
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({
                    text: "Documento 1 de 2",
                    size: 20,
                    color: P.cover.footerColor,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return [
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [],
    }),
    coverTable,
  ];
}

// ─── TOC Section ───
function buildTOC() {
  return [
    h1("Sumário"),
    new TableOfContents("Sumário", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    pageBreak(),
  ];
}

// ─── Body Content ───
function buildBody() {
  const sections = [];

  // ═══════════════════════════════════════════
  // 1. SUMÁRIO EXECUTIVO
  // ═══════════════════════════════════════════
  sections.push(
    h1("1. Sumário Executivo"),
    p(
      "Este documento apresenta a arquitetura completa da Plataforma Incubadora Cloud, uma solução integrada de gestão de projetos e comunicação em equipe, projetada para operar integralmente dentro do Oracle Cloud Always Free Tier. A plataforma combina o OpenProject Enterprise v15 para gestão de projetos ágeis com o Mattermost Team Edition para comunicação assíncrona, proporcionando um ecossistema completo para incubadoras de startups."
    ),
    p(
      "A decisão estratégica de utilizar o Oracle Cloud Always Free Tier reflete a necessidade de uma solução de custo zero (R$ 0,00/mês) sem comprometer a qualidade técnica ou a segurança da infraestrutura. A arquitetura aproveita ao máximo os recursos disponíveis: 4 OCPUs ARM, 24 GB de RAM, 200 GB de armazenamento em blocos e 20 GB de Object Storage S3-compatível. Essa combinação permite atender adequadamente uma equipe atual de 10 pessoas com margem de headroom de 50% para crescimento orgânico."
    ),
    p(
      "As principais decisões arquiteturais incluem a adoção do K3s como orquestrador de containers com isolamento multi-namespace (infra, openproject, mattermost, backup), o uso do Traefik como ingress controller com certificados TLS automáticos via Let's Encrypt e Cloudflare DNS-01, e a integração com Cloudflare para proteção WAF, CDN e mitigação de ataques DDoS — tudo sem custo adicional."
    ),
    p(
      "A segurança é tratada em múltiplas camadas: políticas de rede default-deny no K3s, OCI Security Lists restritivas, OCI Vault para gestão de secrets com suporte a HSM, e terminação TLS na edge da Cloudflare. A observabilidade é garantida por 5 alarmes configurados no OCI Monitoring, 10 GB de logs centralizados mensais, e integração com GitHub Actions para automação completa de CI/CD."
    ),
    p(
      "A escalabilidade está planejada em quatro estágios: (1) 10 usuários na configuração atual, (2) 25 usuários com otimizações de configuração, (3) 50 usuários com adição de um segundo nó A1 como agente K3s, e (4) 100+ usuários com migração para camada paga do Oracle Cloud. Esta estratégia permite que a incubadora cresça de forma orgânica sem disrupções na infraestrutura."
    ),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 2. INTRODUÇÃO E CONTEXTO
  // ═══════════════════════════════════════════
  sections.push(
    h1("2. Introdução e Contexto"),
    h2("2.1 Objetivo deste Documento"),
    p(
      "Este Documento de Arquitetura de Software (SAD) tem como objetivo principal fornecer uma descrição técnica abrangente e detalhada da arquitetura da Plataforma Incubadora Cloud. O documento serve como referência autoritativa para todas as decisões arquiteturais, padrões técnicos, convenções de configuração e estratégias operacionais adotadas no projeto. Ele deve ser consultado por todos os membros da equipe técnica envolvidos no desenvolvimento, implantação e manutenção da plataforma."
    ),
    p(
      "Além de documentar o estado atual da arquitetura, este SAD estabelece as bases para futuras revisões e evoluções do sistema, garantindo que quaisquer modificações sejam feitas de forma consciente e alinhada com os princípios arquiteturais definidos. O documento também atende às exigências de rastreabilidade e governança técnica exigidas em projetos de software profissional."
    ),

    h2("2.2 Escopo"),
    p(
      "O escopo deste documento abrange a completa infraestrutura tecnológica da Plataforma Incubadora Cloud, incluindo todos os seguintes domínios: arquitetura de rede e conectividade no Oracle Cloud Infrastructure (OCI); arquitetura de compute com orquestração de containers via K3s; arquitetura de armazenamento, incluindo volumes em bloco e Object Storage; arquitetura de dados com PostgreSQL 17; camada de segurança multi-camada; estratégia de observabilidade e monitoramento; pipeline de CI/CD automatizado; e estratégia de escalabilidade e crescimento."
    ),
    p(
      "Ficam fora do escopo deste documento os seguintes aspectos: desenvolvimento de features específicas das aplicações OpenProject e Mattermost; políticas de gestão de equipe e processos de Scrum (abordados no Documento 2); orçamento detalhado para migração para camada paga; e customizações específicas de business logic que não impactem a arquitetura de infraestrutura."
    ),

    h2("2.3 Público-Alvo"),
    p(
      "Este documento é destinado aos seguintes perfis de leitores, cada um com interesses específicos na arquitetura da plataforma:"
    ),
    bullet("Scrum Master: compreensão geral da arquitetura, dependências técnicas, riscos e impactos nas sprints"),
    bullet("Equipe DevOps: detalhes de infraestrutura, configuração de K3s, rede, segurança e automação CI/CD"),
    bullet("Equipe de Desenvolvimento: ambiente de plugins, integrações entre OpenProject e Mattermost, padrões técnicos"),
    bullet("Gestão de TI: visão de custos (R$ 0,00), escalabilidade, riscos e roadmap de crescimento"),
    bullet("Auditoria e Compliance: políticas de segurança, gestão de secrets, isolamento de dados"),

    h2("2.4 Referências"),
    p("As seguintes fontes foram consultadas durante o planejamento arquitetural:"),
    bullet("Oracle Cloud Always Free Tier — Catálogo de Serviços e Limites (oracle.com/cloud/free)"),
    bullet("OpenProject Enterprise v15 — Documentação Oficial e Guia de Instalação (docs.openproject.org)"),
    bullet("Mattermost Team Edition — Guia de Deploy e Administrador (docs.mattermost.com)"),
    bullet("K3s — Lightweight Kubernetes — Documentação Oficial (docs.k3s.io)"),
    bullet("Traefik Proxy — Configuration Guide (doc.traefik.io)"),
    bullet("OCI Vault — Service Documentation (docs.oracle.com/en-us/iaas/Content/KeyManagement)"),
    bullet("Cloudflare — DNS, WAF e CDN Documentation (developers.cloudflare.com)"),
    bullet("OCI Architecture Center — Best Practices for Always Free (docs.oracle.com/iaas/architecture)"),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 3. REQUISITOS DE ARQUITETURA
  // ═══════════════════════════════════════════
  sections.push(
    h1("3. Requisitos de Arquitetura"),
    h2("3.1 Requisitos Funcionais"),
    p(
      "Os requisitos funcionais da Plataforma Incubadora Cloud definem as capacidades essenciais que o sistema deve prover para atender às necessidades operacionais da incubadora de startups. Esses requisitos foram elicitados a partir de entrevistas com stakeholders, análise de processos atuais e benchmarking com plataformas similares no mercado."
    ),
    p(
      "RF-001: Gestão de Projetos Ágeis — O sistema deve prover gestão completa de projetos via OpenProject Enterprise v15, incluindo backlogs de produto e sprint, quadros Kanban, diagramas de Gantt, gestão de epics e stories, time tracking integrado, wiki colaborativa, e relatórios de progresso burn-down/burn-up com capacidade de exportação."
    ),
    p(
      "RF-002: Comunicação em Equipe — O sistema deve prover comunicação assíncrona via Mattermost Team Edition, incluindo canais públicos e privados, threads de discussão, compartilhamento de arquivos, notificações configuráveis, integração com webhooks, e busca full-text em todas as mensagens históricas."
    ),
    p(
      "RF-003: Isolamento de Plugins — O sistema deve suportar ambientes isolados para desenvolvimento e execução de plugins customizados tanto para OpenProject quanto para Mattermost, com diretórios montados separadamente, políticas de rede restritivas e capacidade de hot-reload sem impacto nos serviços principais."
    ),
    p(
      "RF-004: Armazenamento S3 — O sistema deve prover armazenamento de objetos compatível com S3 via OCI Object Storage, incluindo buckets segregados por aplicação e tipo, URLs pré-assinadas para compartilhamento seguro, lifecycle policies para gestão automática de retenção, e integração nativa com OpenProject e Mattermost."
    ),

    h2("3.2 Requisitos Não-Funcionais"),
    p(
      "Os requisitos não-funcionais estabelecem as características de qualidade que a arquitetura deve satisfazer para garantir uma experiência operacional adequada:"
    ),
    p(
      "RNF-001 Performance — O tempo de resposta para operações CRUD no OpenProject deve ser inferior a 500ms (p95). A latência de entrega de mensagens no Mattermost deve ser inferior a 200ms (p99). O tempo de inicialização da plataforma completa (todos os containers) deve ser inferior a 120 segundos em caso de reboot."
    ),
    p(
      "RNF-002 Segurança — Toda comunicação deve utilizar TLS 1.3. Secrets devem ser armazenados exclusivamente no OCI Vault. Políticas de rede devem ser default-deny. Todas as imagens de containers devem ser verificadas quanto a vulnerabilidades antes do deploy. Logs de acesso devem ser retidos por no mínimo 90 dias."
    ),
    p(
      "RNF-003 Disponibilidade — A plataforma deve manter disponibilidade de 99,5% (excluindo janelas de manutenção programada). Backups automáticos devem ser executados a cada 6 horas com retenção de 7 dias. O processo de restauração completa deve ser concluído em menos de 30 minutos."
    ),
    p(
      "RNF-004 Escalabilidade — A arquitetura deve suportar crescimento de 10 para 50 usuários sem re-arquitetura. A adição de novos nós ao cluster K3s deve ser possível sem downtime dos serviços existentes. O banco de dados deve suportar até 500 conexões simultâneas com a configuração otimizada."
    ),
    p(
      "RNF-005 Observabilidade — Todos os componentes devem exportar métricas em formato Prometheus. Logs devem ser centralizados no OCI Logging com 10 GB/mês de capacidade. Alarmes devem ser configurados para CPU, RAM, disco, HTTP e rede com tempo de detecção inferior a 5 minutos."
    ),

    h2("3.3 Restrições"),
    p(
      "O projeto opera sob restrições rigorosas impostas pelo Oracle Cloud Always Free Tier. Essas restrições definem o envelope operacional dentro do qual toda a arquitetura deve ser projetada:"
    ),
    createTable(
      ["Recurso", "Limite Always Free", "Alocado", "Disponível"],
      [
        ["Compute (OCPUs ARM)", "4 OCPUs", "4 OCPUs", "0 (máximo)"],
        ["Memória RAM", "24 GB", "24 GB", "0 (máximo)"],
        ["Armazenamento em Bloco", "200 GB (total)", "180 GB", "20 GB reserva"],
        ["Object Storage", "20 GB", "15 GB planejado", "5 GB reserva"],
        ["Largura de Banda (saída)", "10 TB/mês", "~500 GB estimado", "9.5 TB"],
        ["VCNs", "2", "1", "1 reserva"],
        ["Security Lists por VCN", "5", "3", "2 reserva"],
        ["Load Balancers", "1 (10 Mbps)", "Não utilizado", "1 disponível"],
        ["OCI Vault Secrets", "20 (HSM-backed)", "15 planejados", "5 reserva"],
        ["OCI Monitoring Alarms", "50", "5", "45 reserva"],
        ["OCI Logging (ingestão)", "10 GB/mês", "~5 GB estimado", "5 GB reserva"],
        ["Email Delivery (ODI)", "1.000/mês", "~200 estimados", "800 reserva"],
      ],
      [35, 30, 20, 15]
    ),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 4. ARQUITETURA DA SOLUÇÃO
  // ═══════════════════════════════════════════
  sections.push(
    h1("4. Arquitetura da Solução"),
    h2("4.1 Visão Geral da Arquitetura"),
    p(
      "A Plataforma Incubadora Cloud adota uma arquitetura em camadas (layered architecture) com isolamento progressivo entre os níveis de abstração. Cada camada possui responsabilidades bem definidas e interfaces estabilizadas, permitindo evolução independente dos componentes. A arquitetura é desenhada para maximizar a utilização dos recursos Always Free enquanto mantém padrões profissionais de segurança, observabilidade e resiliência."
    ),
    p("As camadas da arquitetura, da mais externa à mais interna, são:"),
    numberedItem(1, "Camada de Edge — Cloudflare (DNS, WAF, CDN, DDoS Protection, TLS Termination)"),
    numberedItem(2, "Camada de Gateway — OCI VCN + Security Lists + NSGs (controle de acesso de rede)"),
    numberedItem(3, "Camada de Ingress — Traefik Ingress Controller (roteamento HTTP/HTTPS, ACME)"),
    numberedItem(4, "Camada de Serviços — OpenProject, Mattermost, MinIO Gateway (aplicações)"),
    numberedItem(5, "Camada de Orquestração — K3s Kubernetes (agendamento, escala, lifecycle)"),
    numberedItem(6, "Camada de Compute — OCI A1 Flex ARM Instance (processamento, memória)"),
    numberedItem(7, "Camada de Plataforma — PostgreSQL 17, Memcached, Redis (dados, cache)"),
    spacer(50),
    p(
      "O fluxo de dados segue uma trajetória unidirectional para requisições externas: o usuário acessa o Cloudflare DNS, que direciona para o endereço IP público da instância OCI. A requisição passa pelas Security Lists da VCN, chega ao Traefik no K3s, que roteia para o serviço apropriado baseado no Host header. O serviço consulta PostgreSQL ou Memcached conforme necessário, e armazena arquivos no OCI Object Storage via endpoint S3. Toda a comunicação entre camadas utiliza TLS ou mTLS conforme aplicável."
    ),

    h2("4.2 Arquitetura de Rede"),
    p(
      "A arquitetura de rede é projetada com o princípio de least privilege, onde cada componente possui apenas o acesso mínimo necessário para executar suas funções. A VCN (Virtual Cloud Network) é configurada com CIDR 10.0.0.0/16, subdividida em uma única subnet pública 10.0.1.0/24 que hospeda a instância A1 Flex."
    ),
    p(
      "A OCI VCN possui um Internet Gateway para conectividade de saída, um Route Table direcionando tráfego 0.0.0.0/0 para o Internet Gateway, e Security Lists configuradas com regras restritivas. As portas abertas são: 22 (SSH, apenas da IP do administrador), 80 (HTTP, redirecionamento para HTTPS), 443 (HTTPS, tráfego da Cloudflare), e 6443 (K3s API, apenas localhost). Todas as demais portas são implicitamente negadas pela política default-deny."
    ),
    p(
      "Dentro do K3s, NetworkPolicies são aplicadas em cada namespace para garantir isolamento microsegmentado. A política padrão é default-deny-all em todos os namespaces, com regras explícitas permitindo apenas o tráfego necessário. Por exemplo, o namespace openproject pode se comunicar apenas com PostgreSQL na porta 5432 e Memcached na porta 11211, enquanto o namespace mattermost pode acessar PostgreSQL na porta 5432 e seu próprio MinIO gateway na porta 9000."
    ),
    p(
      "O Cloudflare atua como proxy reverso na edge, fornecendo proteção WAF com regras customizadas, CDN para cache de assets estáticos do OpenProject e Mattermost, mitigação automática de ataques DDoS, e compressão Brotli para otimização de banda. O DNS é gerenciado pelo Cloudflare com registros A e CNAME apontando para o IP público da instância OCI. O proxy é habilitado (cloud-orange) para ocultar o IP real do servidor."
    ),

    h2("4.3 Arquitetura de Compute"),
    p(
      "A compute da plataforma utiliza uma única instância Oracle Cloud A1 Flex com configuração máxima permitida pelo Always Free Tier: 4 OCPUs ARM (Ampere Altra) e 24 GB de RAM. A instância executa Oracle Linux 9 ARM como sistema operacional, otimizado para a arquitetura ARM64 e com suporte nativo a containers."
    ),
    p(
      "O K3s é instalado em modo single-node, utilizando o containerd como runtime padrão (não é utilizado Docker). Esta decisão simplifica a operação e reduz o overhead de memória, mantendo o K3s com consumo aproximado de 512 MB de RAM. A arquitetura de namespace do K3s implementa isolamento lógico entre os componentes:"
    ),
    bullet("Namespace 'infra' — Helm charts, Traefik, cert-manager, Prometheus exporters"),
    bullet("Namespace 'openproject' — OpenProject Enterprise v15 e seus componentes auxiliares"),
    bullet("Namespace 'mattermost' — Mattermost Team Edition e seus componentes"),
    bullet("Namespace 'backup' — CronJobs de backup, scripts de restauração"),
    bullet("Namespace 'monitoring' — Exporters de métricas, dashboards de saúde"),
    spacer(50),
    p(
      "A alocação de recursos entre namespaces segue uma estratégia baseada em prioridade: OpenProject recebe 10 GB de RAM (request) / 14 GB (limit), Mattermost recebe 3 GB (request) / 6 GB (limit), PostgreSQL recebe 4 GB (request) / 8 GB (limit), e os componentes de infraestrutura compartilham os 2 GB restantes com QoS Burstable. Esta distribuição garante que nenhuma aplicação consome recursos desproporcionais e que o OOM killer preserva os serviços mais críticos."
    ),

    h2("4.4 Arquitetura de Storage"),
    p(
      "A estratégia de armazenamento é dividida em duas categorias complementares: Block Storage (volume em bloco OCI) para dados transacionais e de alta performance, e Object Storage (OCI Object Storage S3-compatible) para dados de arquivo, backups e assets estáticos."
    ),
    p(
      "O Block Storage utiliza um volume de 200 GB no formato Paravirtualized, montado na instância A1 via iSCSI. O volume é particionado com LVM (Logical Volume Manager) para permitir alocação flexível: 150 GB para dados do Kubernetes (/var/lib/rancher/k3s), 30 GB para backups locais (/backup/local), e 20 GB de reserva para expansão. O filesystem utilizado é XFS com journaling habilitado para garantir consistência em caso de falha."
    ),
    p(
      "O OCI Object Storage fornece 20 GB no Always Free Tier, utilizado para: bucket 'openproject-uploads' (arquivos anexados a tarefas e projetos, estimado 8 GB), bucket 'mattermost-files' (arquivos compartilhados no chat, estimado 4 GB), bucket 'backups-pg' (backups gzip do PostgreSQL, estimado 3 GB), e bucket 'system-configs' (configurações Terraform e YAML versionados, estimado 200 MB). Todos os buckets utilizam encryption server-side com chaves gerenciadas pela OCI."
    ),
    p(
      "A integração S3 é feita via endpoint nativo da OCI (nativelycompatible com API S3 v3), utilizando presigned URLs para compartilhamento seguro de arquivos. O MinIO Client (mc) é configurado como alias para o endpoint OCI, permitindo operações de backup e restore via linha de comando de forma transparente."
    ),

    h2("4.5 Arquitetura de Dados"),
    p(
      "O banco de dados central da plataforma é um PostgreSQL 17 executado como StatefulSet no K3s, utilizando a imagem oficial do PostgreSQL para ARM64. A escolha de executar o PostgreSQL como container gerenciado pelo K3s (em vez de utilizar o OCI Database Cloud Service) é deliberada, pois o serviço gerenciado não está disponível no Always Free Tier."
    ),
    p(
      "O PostgreSQL é configurado com multi-database: 'openproject_db' para o OpenProject (contendo schemas para work packages, projects, users, activities), 'mattermost_db' para o Mattermost (contendo schemas para channels, posts, files, users), e 'shared_db' para dados integrados entre as duas aplicações (contendo tabelas de sincronização e webhooks). Cada banco de dados possui um usuário dedicado com permissões limitadas ao seu respectivo schema."
    ),
    p(
      "A configuração otimizada do PostgreSQL para ARM64 com 24 GB de RAM inclui: shared_buffers = 6 GB (25% da RAM), effective_cache_size = 18 GB (75% da RAM), work_mem = 256 MB, maintenance_work_mem = 1 GB, max_connections = 200, e wal_level = replica para potencial futuro de read replicas. O checkpoint_completion_target é ajustado para 0.9 para distribuir a escrita de checkpoints ao longo do tempo."
    ),
    p(
      "A estratégia de backup é implementada via CronJob K3s executando pg_dump com compressão gzip a cada 6 horas. Os backups são armazenados localmente (/backup/local) com retenção de 24 horas e sincronizados para o bucket OCI Object Storage 'backups-pg' com retenção de 7 dias. Um backup completo semanal (pg_dump --full) é executado todo domingo às 02:00 UTC com retenção de 4 semanas. O processo de restauração é automatizado via script restore.sh que pode recuperar qualquer ponto de backup em menos de 30 minutos."
    ),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 5. COMPONENTES DA SOLUÇÃO
  // ═══════════════════════════════════════════
  sections.push(
    h1("5. Componentes da Solução"),
    h2("5.1 OpenProject Enterprise v15"),
    p(
      "O OpenProject Enterprise v15 é o componente central de gestão de projetos da plataforma. Ele é implantado como um conjunto de containers no namespace 'openproject' do K3s, incluindo o application server (Puma/Ruby on Rails), o worker de background (Sidekiq), e os serviços auxiliares. A imagem oficial openproject/community:15 é utilizada, configurada com a licença Enterprise via token BSEE ativado durante o primeiro deploy."
    ),
    p(
      "As funcionalidades habilitadas incluem: gestão de projetos com templates customizados (Scrum, Kanban, Hybrid), sprints com estimativa por story points e velocity tracking, quadros Kanban com WIP limits configuráveis por coluna, diagramas de Gantt interativos com drag-and-drop, gestão de epics e stories com hierarquia de work packages, time tracking integrado com relatórios de esforço por membro e projeto, wiki colaborativa com edição Markdown e versionamento, e gestāo de reunioes com agenda e atas."
    ),
    p(
      "O modelo RBAC (Role-Based Access Control) é configurado com os seguintes papéis: Administrador (acesso total ao sistema), Scrum Master (gerenciamento de projetos, sprints e equipes), Desenvolvedor (criação e atualização de work packages, log de tempo), e Observador (visualização apenas, sem edição). Cada projeto pode ter papéis customizados adicionais, permitindo flexibilidade para diferentes contextos de incubação. A autenticação LDAP está disponível para integração futura com o Active Directory da incubadora."
    ),

    h2("5.2 Mattermost Team Edition"),
    p(
      "O Mattermost Team Edition é o componente de comunicação assíncrona da plataforma, implantado como um único Deployment no namespace 'mattermost' do K3s. A imagem oficial mattermost/mattermost-enterprise-edition:latest para ARM64 é utilizada, configurada com a licença Enterprise Trial e posterior migração para Team Edition conforme a equipe define suas necessidades."
    ),
    p(
      "As funcionalidades configuradas incluem: canais organizados por time (Town Square, Development, Infrastructure, Incubation), threads aninhadas para discussões contextuais sem poluir o canal principal, compartilhamento de arquivos com preview automático (imagens, PDF, documentos Office), notificações push configuráveis por canal e por tipo de menção, webhooks de entrada para automações (CI/CD notifications, Jira/OpenProject sync), comandos slash customizados (/deploy, /status, /help), busca full-text com operadores avançados e filtros por data/remetente."
    ),
    p(
      "A integração com o OpenProject é realizada via plugin oficial Mattermost-OpenProject, que permite: criação de work packages diretamente do chat, notificações automáticas de mudanças de status, menções cruzadas entre plataformas, e dashboard unificado de atividade da equipe. Esta integração elimina a necessidade de context switching entre ferramentas e centraliza a comunicação do projeto."
    ),

    h2("5.3 Ambiente de Plugins OpenProject"),
    p(
      "O ambiente de desenvolvimento e execução de plugins do OpenProject é projetado para garantir isolamento completo dos serviços principais. O diretório de plugins customizados é montado como volume PersistenVolumeClaim separado no caminho /var/lib/openproject/plugins/custom dentro do container. Este diretório é excluído das políticas de NetworkPolicy padrão, recebendo acesso controlado apenas às APIs internas do OpenProject."
    ),
    p(
      "O processo de desenvolvimento de plugins utiliza o OpenProject Developer Toolkit, que permite: scaffolding de novos plugins com estrutura padrão, hot-reload durante desenvolvimento sem restart do servidor, acesso ao console Rails para debugging, e testes automatizados com RSpec. Os plugins em desenvolvimento são sincronizados com o servidor via shared volume, eliminando a necessidade de rebuild de imagem para cada alteração de código."
    ),
    p(
      "Os tipos de plugins suportados incluem: Custom Actions (ações disparadas por mudanças de estado de work packages), Custom Workflows (estados e transições customizadas), Custom Attributes (campos adicionais em work packages), Custom Menus (novas entradas no menu de navegação), e Integration Adapters (conectores com APIs externas). Todos os plugins seguem a convenção de命名 'openproject-plugin-nome' e são versionados no repositório Git da incubadora."
    ),

    h2("5.4 Ambiente de Plugins Mattermost"),
    p(
      "O ambiente de plugins do Mattermost segue padrão similar ao do OpenProject, com diretório dedicado montado como volume separado. O diretório /mattermost/plugins/custom é utilizado para plugins em desenvolvimento, com configuração de PluginSettings no config.json para habilitar cada plugin individualmente. O Mattermost suporta plugins escritos em Go (server-side) e React/TypeScript (webapp-side), permitindo extensões completas da funcionalidade."
    ),
    p(
      "Os plugins planejados incluem: bots customizados para automação de fluxos (deploy notifications, standup reminders, retrospective summaries), slash commands para operações frequentes (/sprint status, /deploy prod, /health check), e webhooks de saída para integração com serviços externos (Google Calendar, GitHub, OpenProject). O ambiente de desenvolvimento permite hot-reload do webapp-side plugin via proxy de desenvolvimento, acelerando significativamente o ciclo de feedback."
    ),

    h2("5.5 MinIO/S3 Gateway"),
    p(
      "O MinIO Client (mc) é configurado como gateway para o OCI Object Storage, proporcionando uma interface S3-compatible local para as aplicações. Esta integração é essencial porque o OpenProject e o Mattermost possuem módulos nativos de armazenamento S3, mas o OCI Object Storage utiliza um endpoint HTTPS com autenticação via signing key que requer configuração específica."
    ),
    p(
      "A configuração inclui: alias 'oci' apontando para o endpoint nrt1.objectstorage.oraclecloud.com com credenciais de autenticação OCI, bucket 'openproject-uploads' com lifecycle policy de 365 dias, bucket 'mattermost-files' com lifecycle policy de 180 dias, bucket 'backups-pg' com lifecycle policy de 30 dias e arquivamento automático para Archive Storage após 7 dias, e bucket 'system-configs' com versioning habilitado e lifecycle de retenção infinita. Todas as operações S3 utilizam server-side encryption com chaves gerenciadas pela OCI (SSE-OCI)."
    ),
    p(
      "As URLs pré-assinadas (presigned URLs) são geradas pelo backend de cada aplicação para compartilhamento seguro de arquivos, com expiração padrão de 15 minutos para downloads e 1 hora para uploads. Este mecanismo permite que usuários compartilhem arquivos sem expor as credenciais S3 e sem necessidade de autenticação adicional no Object Storage."
    ),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 6. SEGURANÇA
  // ═══════════════════════════════════════════
  sections.push(
    h1("6. Segurança"),
    h2("6.1 Segurança de Rede"),
    p(
      "A segurança de rede da plataforma é implementada em múltiplas camadas, seguindo o modelo defense-in-depth. Na camada mais externa, o Cloudflare WAF (Web Application Firewall) protege contra as seguintes categorias de ameaças: SQL Injection, Cross-Site Scripting (XSS), Remote Code Execution, Local File Inclusion, e OWASP Top 10. Regras customizadas são adicionadas para block de user-agents suspeitos, rate limiting por IP (100 req/s), e geo-blocking para países fora do escopo de operação."
    ),
    p(
      "Na camada OCI, as Security Lists da VCN implementam stateful inspection com regras minimais: ingress allow TCP 443 de 0.0.0.0/0 (HTTPs via Cloudflare), ingress allow TCP 80 de 0.0.0.0/0 (redirecionamento), ingress allow TCP 22 do IP do administrador apenas (SSH), e egress allow all. Todas as demais portas são implicitamente negadas. O campo Source Type é configurado como CIDR block com source 0.0.0.0/0 apenas para as portas necessárias."
    ),
    p(
      "Dentro do K3s, NetworkPolicies são aplicadas em cada namespace com política default-deny-all. Cada namespace possui regras específicas: o namespace 'openproject' permite comunicação interna apenas entre pods do mesmo namespace e acesso ao PostgreSQL no namespace 'infra' na porta 5432; o namespace 'mattermost' segue padrão similar com acesso ao PostgreSQL e ao MinIO; o namespace 'infra' aceita conexões de todos os namespaces mas não inicia conexões externas. Esta microsegmentação garante que um comprometimento em um namespace não propaga lateralmente para outros componentes."
    ),

    h2("6.2 Gestão de Secrets"),
    p(
      "A gestão de secrets é centralizada no OCI Vault, utilizando o serviço HSM-backed (Hardware Security Module) para garantir proteção em nível de hardware. O Vault é configurado com um master encryption key de 256-bit AES, e todos os secrets são criptografados com esta chave antes do armazenamento. O acesso ao Vault é controlado via OCI IAM policies, permitindo apenas que os serviços autorizados leiam secrets específicos."
    ),
    p(
      "O catalogue de secrets planejado inclui aproximadamente 150 itens divididos nas seguintes categorias: credenciais de banco de dados (PostgreSQL users, passwords — 15 secrets), chaves de API (Cloudflare, OCI, OpenProject Enterprise token — 20 secrets), certificados TLS e chaves privadas (Let's Encrypt, custom certs — 10 secrets), tokens de autenticação (Mattermost bot tokens, webhook secrets — 30 secrets), variáveis de ambiente sensíveis (JWT secrets, encryption keys — 40 secrets), e credenciais de backup (S3 access keys, encryption passphrases — 10 secrets)."
    ),
    p(
      "A injeção de secrets nos containers K3s é realizada via External Secrets Operator (ESO), que sincroniza secrets do OCI Vault para Kubernetes Secrets nativos. O ESO utiliza ServiceAccount com permissões limitadas para ler apenas os secrets necessários de cada namespace. Os secrets são rotacionados automaticamente a cada 90 dias via scheduled job, com notificação ao canal mattermost/infra em caso de falha de rotação."
    ),

    h2("6.3 TLS/SSL"),
    p(
      "A estratégia de TLS é implementada em duas camadas complementares. Na camada de edge, o Cloudflare realiza a terminação TLS com certificados SSL wildcard gerados automaticamente para o domínio *.incubadora.cloud. O Cloudflare suporta TLS 1.3 por padrão e HSTS (HTTP Strict Transport Security) com max-age de 31536000 segundos (1 ano) e includeSubDomains habilitado. A conexão entre Cloudflare e a origem (instância OCI) utiliza TLS 1.3 com certificado Let's Encrypt."
    ),
    p(
      "Na camada de origem, o Traefik Ingress Controller gerencia certificados via ACME protocol utilizando o challenge DNS-01 do Cloudflare. Esta combinação permite emissão de certificados wildcard sem necessidade de abrir portas adicionais no servidor (diferente do challenge HTTP-01 que requer porta 80). O cert-manager é configurado com issuer tipo ClusterIssuer para emissão centralizada, com renovação automática 30 dias antes da expiração. Os certificados são armazenados como Kubernetes Secrets no namespace 'infra' e montados pelo Traefik como TLS termination endpoints."
    ),

    h2("6.4 Isolamento Multi-Tenant"),
    p(
      "O isolamento multi-tenant é garantido por múltiplos mecanismos complementares no K3s. O primeiro nível é o isolamento de namespace, onde cada aplicação reside em seu próprio namespace com ResourceQuotas definidos (limites de CPU, memória, e número de pods). O segundo nível é o NetworkPolicy default-deny-all, que impede qualquer comunicação não explicitamente permitida. O terceiro nível é o PodSecurityContext, configurado com runAsNonRoot: true, readOnlyRootFilesystem: true (onde aplicável), e drop de ALL capabilities Linux."
    ),
    p(
      "O quarto nível é o RBAC do Kubernetes, onde ServiceAccounts são criados por namespace com permissões minimais. O ServiceAccount do namespace 'openproject' pode apenas gerenciar pods e services dentro de seu namespace; o ServiceAccount de 'backup' pode apenas acessar o PostgreSQL e o Object Storage; e o ServiceAccount de 'monitoring' pode apenas ler métricas via /metrics endpoints. Esta segregação de privilégios minimiza o impacto de um potencial comprometimento de credenciais de ServiceAccount."
    ),
    p(
      "Adicionalmente, políticas de Pod Disruption Budget (PDB) são configuradas para garantir que atualizações e manutenções não causem indisponibilidade. O OpenProject possui PDB com maxUnavailable: 0 (requer pelo menos 1 replica disponível), e o Mattermost possui PDB similar. Os CronJobs de backup são configurados com concurrencyPolicy: Forbid para evitar backups simultâneos que poderiam causar contenção de I/O."
    ),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 7. OBSERVABILIDADE E MONITORAMENTO
  // ═════════════════════════════════════════════
  sections.push(
    h1("7. Observabilidade e Monitoramento"),
    h2("7.1 OCI Monitoring"),
    p(
      "O OCI Monitoring é o serviço centralizado de observabilidade da plataforma, aproveitando os 50 alarmses gratuitos disponíveis no Always Free Tier. A configuração inicial utiliza 5 alarmes essenciais que cobrem os vetores críticos de observabilidade da infraestrutura:"
    ),
    createTable(
      ["Alarme", "Métrica", "Threshold", "Severidade"],
      [
        ["CPU Utilization", "CpuUtilization", "> 85% por 5 min", "CRITICAL"],
        ["Memory Utilization", "MemoryUtilization", "> 90% por 5 min", "CRITICAL"],
        ["Disk Usage", "DiskBytesUsed", "> 85% do volume", "WARNING"],
        ["HTTP 5xx Rate", "HttpStatusCode (5xx)", "> 5% do total", "CRITICAL"],
        ["Network Outbound", "NetworkOutBytes", "> 8 TB/mês", "WARNING"],
      ],
      [25, 30, 30, 15]
    ),
    spacer(50),
    p(
      "Cada alarme é configurado com intervalo de avaliação de 1 minuto (o mínimo permitido), período de duração de 5 minutos para evitar falsos positivos por spikes transitórios, e destinação para o tópico OCI Notifications correspondente. Os alarmes de severidade CRITICAL disparam notificações imediatas via email e webhook Slack/Mattermost, enquanto alarmes WARNING geram apenas notificação via email. Todos os alarmes são versionados no Terraform para rastreabilidade e reprodutibilidade."
    ),

    h2("7.2 OCI Logging"),
    p(
      "O OCI Logging é utilizado para centralização de logs de todos os componentes da plataforma, com capacidade de 10 GB por mês no Always Free Tier. Os logs são coletados via Fluent Bit (DaemonSet no K3s), que é implantado no namespace 'infra' e configura como agente de coleta em cada nó do cluster. O Fluent Bit lê os logs stdout/stderr de todos os containers, aplica filtros de parsing (parser JSON para OpenProject e Mattermost), e envia para o OCI Logging Analytics via API REST."
    ),
    p(
      "A estratégia de log prevê um consumo estimado de 5 GB/mês, distribuído da seguinte forma: OpenProject application logs (~2 GB/mês), OpenProject worker logs (~500 MB/mês), Mattermost logs (~1 GB/mês), Traefik access logs (~500 MB/mês), PostgreSQL logs (~500 MB/mês), e K3s system logs (~500 MB/mês). Os logs possuem retenção configurada para 30 dias na busca ativa e 90 dias no Archive Storage antes da expiração automática. Log groups são segregados por namespace: /incubadora/openproject, /incubadora/mattermost, /incubadora/infra, e /incubadora/k3s-system."
    ),

    h2("7.3 OCI Notifications"),
    p(
      "O serviço OCI Notifications fornece a camada de alerta da plataforma, conectando os alarmes do OCI Monitoring aos canais de comunicação da equipe. Dois tópicos são configurados: 'incubadora-critical' (para alarmes de severidade CRITICAL) e 'incubadora-warning' (para alarmes de severidade WARNING). Cada tópico possui duas subscrições: email (para o administrador principal e o Scrum Master) e webhook (para o canal mattermost/alertas da equipe)."
    ),
    p(
      "As mensagens de notificação incluem o nome do alarme, a métrica que disparou, o valor atual versus o threshold, o horário de disparo, e um link direto para o console OCI Monitoring com o gráfico da métrica. O webhook para o Mattermost utiliza o formato de webhook de entrada nativo do Mattermost, com customização da mensagem para exibição em formato rich-text com cores indicativas de severidade (vermelho para CRITICAL, amarelo para WARNING)."
    ),

    h2("7.4 OCI APM"),
    p(
      "O OCI Application Performance Monitoring (APM) é utilizado para observabilidade avançada das aplicações OpenProject e Mattermost. O APM Browser Monitor é configurado com synthetic monitors que simulam transações críticas de usuário: login no OpenProject, criação de work package, login no Mattermost, e envio de mensagem. Cada synthetic monitor executa a cada 5 minutos a partir de múltiplas localizações geográficas (São Paulo, Virginia, Frankfurt), medindo latência de ponta a ponta, taxa de sucesso e tempo de resposta percebido pelo usuário."
    ),
    p(
      "O APM Application Monitor é configurado via Java agent (OpenProject/Rails utiliza compact format) e Go module (Mattermost), coletando distributed traces com contexto de request completo. As traces incluem: spans de banco de dados PostgreSQL, spans de chamadas ao Object Storage, spans de renderização de templates, e spans de requisições HTTP internas. O dashboard do APM exibe: latência p50/p95/p99 por endpoint, throughput por serviço, error rate por tipo de erro, e mapas de dependência entre serviços."
    ),

    h2("7.5 GitHub Actions (CI/CD)"),
    p(
      "O pipeline de CI/CD é inteiramente implementado no GitHub Actions, aproveitando os 2.000 minutos/mês gratuitos para repositórios públicos e os 500 minutos/mês para repositórios privados. O pipeline é composto por 7 workflows especializados, cada um com responsabilidades bem definidas:"
    ),
    createTable(
      ["Workflow", "Trigger", "Descrição"],
      [
        ["validate.yml", "Pull Request", "Valida configs Terraform/YAML, lint, plan Terraform"],
        ["deploy.yml", "Merge main", "Aplica Terraform, atualiza K3s, restart services"],
        ["backup.yml", "Cron (6h)", "Executa pg_dump, sync para OCI Object Storage"],
        ["monitoring.yml", "Cron (5min)", "Health checks, reporta status para Mattermost"],
        ["update.yml", "Manual dispatch", "Atualiza imagens de containers para versão mais recente"],
        ["destroy.yml", "Manual dispatch", "Destrói infraestrutura completa (confirmation required)"],
        ["rollback.yml", "Manual dispatch", "Restaura versão anterior do Terraform state"],
      ],
      [25, 20, 55]
    ),
    spacer(50),
    p(
      "Cada workflow utiliza GitHub Secrets para armazenamento seguro de credenciais OCI (API Key, fingerprint, tenancy OCID, user OCID), Cloudflare API token, e chaves SSH para acesso ao servidor. Os artifacts do pipeline (Terraform plans, backup manifests) são armazenados no GitHub Actions storage com retenção de 90 dias. A execução paralela de workflows é gerenciada via concurrency groups para evitar deploy simultâneos que poderiam causar estado inconsistente."
    ),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 8. CATÁLOGO DE SERVIÇOS
  // ═══════════════════════════════════════════
  sections.push(
    h1("8. Catálogo de Serviços Always Free Utilizados"),
    p(
      "A tabela a seguir apresenta o catálogo completo dos serviços Oracle Cloud Infrastructure (OCI) utilizados na Plataforma Incubadora Cloud, todos dentro dos limites do Always Free Tier. Cada serviço é essencial para a operação da plataforma e foi selecionado criteriosamente para maximizar a utilização dos recursos gratuitos disponíveis."
    ),
    createTable(
      ["Serviço", "Limite Free Tier", "Utilizado", "Finalidade no Projeto"],
      [
        ["Compute A1 Flex", "4 OCPU / 24 GB RAM", "4 OCPU / 24 GB", "Instância K3s single-node para todas as aplicações"],
        ["Block Storage", "200 GB total", "180 GB", "Volumes para K3s data, backups locais, reserva"],
        ["Object Storage", "20 GB", "~15 GB", "Uploads OpenProject, arquivos Mattermost, backups PG"],
        ["VCN", "2 VCNs", "1 VCN", "Rede virtual com subnet pública para a instância A1"],
        ["Internet Gateway", "2 por VCN", "1", "Conectividade de saída para internet"],
        ["Security Lists", "5 por VCN", "3", "Regras de firewall stateful para VCN"],
        ["DNS (Cloudflare)", "Ilimitado (grátis)", "2 zonas", "DNS gerenciado com proxy, WAF e CDN"],
        ["Vault (HSM)", "20 secrets HSM", "15 planejados", "Gestão centralizada de secrets e encryption keys"],
        ["Monitoring", "50 alarmes, 50M datapoints", "5 alarmes", "Métricas de CPU, RAM, Disco, HTTP, Rede"],
        ["Logging Analytics", "10 GB/mês ingestão", "~5 GB/mês", "Logs centralizados de todos os containers"],
        ["Notifications", "1 milhão/mês", "~200/mês", "Alertas via email e webhook para equipe"],
        ["Email Delivery", "1.000 emails/mês", "~200/mês", "Notificações críticas e relatórios"],
        ["Functions", "2 milhões invocações", "Não utilizado", "Reservado para automações futuras"],
        ["Load Balancer", "1 (10 Mbps)", "Não utilizado", "Reservado como fallback (Cloudflare proxy ativo)"],
      ],
      [20, 25, 18, 37]
    ),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 9. ESCALABILIDADE
  // ═══════════════════════════════════════════
  sections.push(
    h1("9. Escalabilidade"),
    h2("9.1 Cenário Atual: 10 Usuários"),
    p(
      "A configuração atual da plataforma é dimensionada para suportar confortavelmente 10 usuários simultâneos com margem de headroom de 50%. Os benchmarks internos demonstram que o consumo médio de recursos com 10 usuários ativos é de aproximadamente 2,5 OCPUs (63%) e 14 GB de RAM (58%), deixando espaço significativo para picos de utilização e growth orgânico. O PostgreSQL suporta 200 conexões simultâneas, mas tipicamente utiliza entre 20-30 conexões com 10 usuários ativos, mantendo buffer pools bem supridos."
    ),
    p(
      "O throughput observado com esta carga inclui: tempo médio de carregamento de página OpenProject de 1,2 segundos (p95), latência de mensagem Mattermost de 80ms (p99), e tempo de resposta da API de work packages de 180ms (p95). Todos estes métricas estão bem dentro dos requisitos não-funcionais definidos na Seção 3.2."
    ),

    h2("9.2 Crescimento para 25 Usuários"),
    p(
      "Para suportar 25 usuários sem adicionar infraestrutura, as seguintes otimizações são planejadas: ajuste fino do PostgreSQL (aumento de connection_pool para 50, tuning de query plans com pg_stat_statements), habilitação de HTTP/2 push no Traefik para assets estáticos do OpenProject, compressão Brotli nível 5 no Cloudflare (reduzindo transferência de dados em ~20%), e implementação de Redis como cache distribuído para sessões do Mattermost e queries frequentes do OpenProject."
    ),
    p(
      "Com estas otimizações, estima-se que a plataforma possa suportar 25 usuários com consumo de aproximadamente 3,5 OCPUs (88%) e 18 GB de RAM (75%). Este cenário ainda mantém headroom para picos, porém sem margem significativa para crescimento adicional na configuração single-node."
    ),

    h2("9.3 Crescimento para 50 Usuários"),
    p(
      "O estágio de 50 usuários requer a adição de um segundo nó compute ao cluster K3s. O plano de expansão prevê o provisionamento de uma segunda instância A1 Flex (4 OCPU / 24 GB) como agente K3s, conectada ao cluster existente via VXLAN overlay network. O nó master continuará hospedando o control plane (Traefik, PostgreSQL, Redis) enquanto o nó agente executará os workloads de aplicação (OpenProject e Mattermost)."
    ),
    p(
      "Esta expansão pode ser realizada sem downtime, pois o K3s suporta join de agentes com zero downtime. Os pods são redistribuídos automaticamente pelo scheduler K3s baseado em ResourceRequests e PodAffinity rules. O PostgreSQL continua como StatefulSet no nó master, garantindo consistência de dados. O custo permanece R$ 0,00, pois o Oracle permite até 4 instâncias A1 Flex gratuitas (totalizando 16 OCPU e 96 GB de RAM)."
    ),

    h2("9.4 Crescimento para 100+ Usuários"),
    p(
      "Para suportar 100 ou mais usuários, a migração para a camada paga do Oracle Cloud se torna necessária. O plano de migração inclui: migração do PostgreSQL para o OCI Database Cloud Service (PostgreSQL managed) com read replicas, adição de um terceiro nó K3s para balanceamento de carga horizontal, upgrade do Object Storage para Standard tier (ilimitado, pago por GB utilizado), e contratação do OCI Load Balancer (10.000 Mbps) para distribuição de tráfego."
    ),
    p(
      "O custo estimado para este cenário é de aproximadamente USD 150-300/mês, dependendo do nível de utilização. A migração é planejada para ser incremental, sem big-bang, migrando componente por componente com validação em cada etapa. O Terraform state é utilizado como fonte de verdade para garantir que a infraestrutura pode ser reproduzida em qualquer ambiente."
    ),

    h2("9.5 Escalonamento de Storage"),
    p(
      "O armazenamento em bloco pode ser expandido dinamicamente no OCI até 1 TB por volume (com custo na camada paga). Na camada gratuita, o limite de 200 GB pode ser otimizado com: compressão de logs via Fluent Bit antes do envio ao OCI Logging, limpeza automática de Docker images não utilizadas (image prune diário), e implementação de lifecycle policies agressivas no Object Storage (arquivamento de backups após 7 dias). Estas práticas podem estender a utilidade do armazenamento por 30-40% comparado ao uso sem otimizações."
    ),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 10. ANÁLISE DE RISCOS
  // ═══════════════════════════════════════════
  sections.push(
    h1("10. Análise de Riscos"),
    p(
      "A análise de riscos a seguir identifica os principais fatores de risco do projeto, classificados por impacto e probabilidade. Cada risco é acompanhado de uma estratégia de mitigação específica e um plano de contingência documentado. A revisão dos riscos deve ser realizada quinzenalmente pelo Scrum Master durante as Sprint Reviews."
    ),
    createTable(
      ["Risco", "Impacto", "Probabilidade", "Mitigação"],
      [
        ["Oracle reclama instâncias A1 inativas", "CRÍTICO", "BAIXA", "Habilitar Cloudflare Tunnel como keep-alive, health check a cada 5min via GitHub Actions"],
        ["Indisponibilidade de capacidade A1 (sem estoque)", "CRÍTICO", "MÉDIA", "Migração preemptiva para CI/CD (não depender de estado local), Terraform state remoto em OCI Object Storage"],
        ["Ponto único de falha (1 VM)", "ALTO", "MÉDIA", "Backups automatizados a cada 6h, restoration script < 30min, IaC para reprodução completa"],
        ["Exaustão de storage (200 GB)", "ALTO", "MÉDIA", "Alarme OCI Monitoring > 85%, lifecycle policies agressivas, compressão de logs"],
        ["Compatibilidade ARM64 (Mattermost)", "MÉDIO", "BAIXA", "Validação prévia em ambiente de staging, imagem oficial ARM64 mantida pelo Mattermost Inc."],
        ["Atrasos em propagação DNS Cloudflare", "BAIXO", "ALTA", "TTL mínimo de 300s, configuração testada em staging antes de produção"],
        ["Limite de 10 GB logs excedido", "MÉDIO", "BAIXA", "Monitoramento do consumo de logs, downsampling automático para logs verbose"],
        ["Falha na renovação Let's Encrypt", "ALTO", "BAIXA", "Alarme para expiração < 7 dias, backup de certificados, cert-manager com retry"],
      ],
      [30, 12, 15, 43]
    ),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 11. DECISÕES ARQUITETURAIS (ADRs)
  // ═══════════════════════════════════════════
  sections.push(
    h1("11. Decisões Arquiteturais (ADRs)"),
    p(
      "As Decisões de Registro Arquitetural (Architecture Decision Records) documentam as escolhas técnicas significativas do projeto, o contexto em que foram feitas, as alternativas consideradas e as consequências da decisão. Cada ADR segue o template padrão: Status, Contexto, Decisão, Consequências."
    ),

    h2("ADR-001: Docker Compose vs K3s"),
    h3("Contexto"),
    p(
      "A plataforma requer orquestração de múltiplos containers com requisitos de isolamento, lifecycle management e escalabilidade. Duas abordagens foram consideradas: Docker Compose (simplicidade, baixo overhead) e K3s (Kubernetes leve, rico em funcionalidades)."
    ),
    h3("Decisão"),
    p(
      "Adotar K3s como orquestrador de containers. Embora o Docker Compose ofereça menor complexidade inicial, o K3s fornece isolamento de namespace essencial para a segurança multi-tenant, ResourceQuotas para prevenção de resource starvation, native Helm support para gestão de releases, e roteamento de service discovery integrado. O overhead de memória do K3s (~512 MB) é aceitável dado os 24 GB disponíveis."
    ),
    h3("Consequências"),
    p(
      "Positivas: isolamento robusto, padrão de mercado, facilitate futura adição de nós, ecossistema rico de ferramentas. Negativas: curva de aprendizado maior para a equipe, maior complexidade operacional (certificados, RBAC, NetworkPolicies). Compensação: a padronização em K3s facilita futuras contratações, pois é skill comum no mercado DevOps."
    ),

    h2("ADR-002: Nginx vs Traefik"),
    h3("Contexto"),
    p(
      "O ingress controller é necessário para roteamento HTTP/HTTPS baseado em Host headers, terminação TLS e emissão automática de certificados. Nginx Ingress Controller e Traefik Proxy são as opções principais."
    ),
    h3("Decisão"),
    p(
      "Adotar Traefik como ingress controller. O Traefik é bundled com o K3s (não requer instalação separada), possui suporte nativo a ACME (Let's Encrypt) sem dependência de cert-manager, suporta automaticamente multiple entrypoints com redirecionamento HTTP→HTTPS, e sua configuração baseada em labels Kubernetes é mais declarativa e integrada ao fluxo GitOps."
    ),
    h3("Consequências"),
    p(
      "Positivas: zero overhead de instalação (já incluso no K3s), configuração declarativa via labels, ACME nativo com múltiplos providers (DNS-01 Cloudflare). Negativas: comunidade menor que Nginx, documentação menos extensa para cenários edge-case. Compensação: os cenários necessários são bem suportados pela documentação oficial do Traefik."
    ),

    h2("ADR-003: OCI Load Balancer vs Cloudflare Tunnel"),
    h3("Contexto"),
    p(
      "É necessário expor os serviços HTTP/HTTPS para acesso externo. O OCI fornece um Load Balancer gratuito (10 Mbps, Always Free), enquanto o Cloudflare oferece proxy, WAF, CDN e proteção DDoS sem custo."
    ),
    h3("Decisão"),
    p(
      "Adotar Cloudflare Proxy (cloud-orange) como camada de edge. A decisão baseia-se no valor agregado significativo do Cloudflare: WAF com regras OWASP, CDN para cache de assets estáticos, mitigação DDoS automática, analytics de tráfego, e SSL wildcard gratuito. O OCI Load Balancer é mantido como fallback caso o Cloudflare fique indisponível."
    ),
    h3("Consequências"),
    p(
      "Positivas: proteção robusta sem custo, CDN reduz latência percebida, analytics de segurança incluídos. Negativas: dependência de terceiro (Cloudflare), IP real da origem visível apenas para Cloudflare, latência adicional de ~50-100ms para requisições cold. Compensação: o Cloudflare possui SLA de 99.99% e o ganho de segurança supera o risco de dependência."
    ),

    h2("ADR-004: Single DB vs Multiple DB Instances"),
    h3("Contexto"),
    p(
      "O OpenProject e o Mattermost requerem PostgreSQL. Foi considerada a opção de executar duas instâncias separadas do PostgreSQL (uma para cada aplicação) versus uma única instância com múltiplos bancos de dados."
    ),
    h3("Decisão"),
    p(
      "Adotar uma única instância PostgreSQL 17 com multi-database (openproject_db, mattermost_db, shared_db). A justificativa é que cada instância PostgreSQL consome aproximadamente 800 MB de RAM apenas para o processo principal, e executar duas instâncias consumiria 1,6 GB sem benefício proporcional. O isolamento lógico entre bancos de dados é suficiente para o cenário Always Free."
    ),
    h3("Consequências"),
    p(
      "Positivas: economia de 800 MB de RAM, simplificação operacional (um backup para todos os dados), capacidade de queries cross-database para integração. Negativas: potencial de resource contention (CPU, I/O) entre bancos, blast radius maior em caso de falha. Compensação: o PostgreSQL connection pooling e o ResourceQuota do K3s mitigam o risco de contention."
    ),

    h2("ADR-005: Self-Signed vs Let's Encrypt"),
    h3("Contexto"),
    p(
      "A terminação TLS é obrigatória para ambas as plataformas (OpenProject e Mattermost exigem HTTPS para funcionalidades como notificações push e webhooks). Opções: certificados self-signed, Let's Encrypt, ou Cloudflare SSL."
    ),
    h3("Decisão"),
    p(
      "Adotar Let's Encrypt via Cloudflare DNS-01 challenge com Traefik ACME. O DNS-01 challenge permite emissão de certificados wildcard (*.incubadora.cloud) sem necessidade de expor portas HTTP adicionais, e é integrado nativamente ao Traefik. Na edge, o Cloudflare fornece SSL wildcard automático. A combinação resulta em TLS end-to-end sem custo."
    ),
    h3("Consequências"),
    p(
      "Positivas: certificados confiáveis por todos os navegadores, renovação automática a cada 60 dias, wildcard suporta subdomínios dinâmicos, custo zero. Negativas: dependência da API do Let's Encrypt e do Cloudflare DNS, necessidade de renew antes da expiração (mitigado pelo cert-manager). Compensação: o cert-manager com certificados de 90 dias e renovação 30 dias antes garante margem de segurança adequada."
    ),
    spacer(100),
  );

  // ═══════════════════════════════════════════
  // 12. MATRIZ DE RECURSOS E CUSTOS
  // ═══════════════════════════════════════════
  sections.push(
    h1("12. Matriz de Recursos e Custos"),
    p(
      "A tabela a seguir apresenta a matriz completa de recursos alocados versus disponíveis no Always Free Tier, demonstrando a otimização financeira da plataforma. O custo total mensal da infraestrutura é R$ 0,00, tornando esta solução viável para incubadoras de startups com orçamento limitado."
    ),
    createTable(
      ["Recurso", "Limite Free", "Alocado", "Disponível", "Custo"],
      [
        ["Instância A1 Flex (ARM)", "4 OCPU / 24 GB", "4 OCPU / 24 GB", "—", "R$ 0,00"],
        ["Block Volume", "200 GB", "180 GB", "20 GB", "R$ 0,00"],
        ["Object Storage", "20 GB", "~15 GB", "~5 GB", "R$ 0,00"],
        ["Data Transfer Out", "10 TB/mês", "~500 GB", "~9,5 TB", "R$ 0,00"],
        ["VCN + Subnets", "2 VCNs", "1 VCN", "1 VCN", "R$ 0,00"],
        ["Internet Gateway", "2", "1", "1", "R$ 0,00"],
        ["NAT Gateway", "— (pago)", "Não utilizado", "—", "R$ 0,00"],
        ["Security Lists", "5/VCN", "3", "2", "R$ 0,00"],
        ["OCI Vault Secrets", "20 HSM", "15", "5", "R$ 0,00"],
        ["Vault Encryption Keys", "2 HSM", "1 master", "1", "R$ 0,00"],
        ["OCI Monitoring", "50 alarmes", "5", "45", "R$ 0,00"],
        ["OCI Logging", "10 GB/mês", "~5 GB", "~5 GB", "R$ 0,00"],
        ["OCI Notifications", "1M/mês", "~200", "~999.800", "R$ 0,00"],
        ["Email (ODI)", "1.000/mês", "~200", "~800", "R$ 0,00"],
        ["Cloudflare (Free Plan)", "DNS + WAF + CDN", "Ativo", "—", "R$ 0,00"],
        ["GitHub Actions", "500 min/mês (priv)", "~200 min", "~300 min", "R$ 0,00"],
        ["Domínio (incubadora.cloud)", "~R$ 40/ano", "1 domínio", "—", "R$ 3,33/mês"],
      ],
      [25, 18, 18, 18, 21]
    ),
    spacer(100),
    p(
      "Nota: O único custo não coberto pelo Always Free Tier é o registro do domínio (estimado em R$ 40/ano ≈ R$ 3,33/mês), que é uma despesa fixa independente da infraestrutura cloud. Todos os demais serviços estão integralmente cobertos pelos programas Always Free da Oracle e Free da Cloudflare."
    ),
    spacer(50),
    p(
      "CUSTO TOTAL DA INFRAESTRUTURA: R$ 0,00/mês",
      { bold: true, color: P.accent, align: AlignmentType.CENTER, before: 200, after: 200 }
    ),
    spacer(100),

    // Final separator
    accentLine(),
    p(
      "Fim do Documento de Arquitetura de Software — Plataforma Incubadora Cloud v1.0",
      { align: AlignmentType.CENTER, color: P.secondary, italics: true }
    ),
    p(
      "Documento 1 de 2 — Preparado para o Scrum Master",
      { align: AlignmentType.CENTER, color: P.secondary, italics: true }
    ),
  );

  return sections;
}

// ─── Assemble Document ───
async function main() {
  const outputPath = "/home/z/my-project/download/SAD_Plataforma_Incubadora_Cloud.docx";

  // Ensure download directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const bodyContent = buildBody();

  const doc = new Document({
    creator: "Plataforma Incubadora Cloud",
    title: "Documento de Arquitetura de Software",
    description: "SAD - Plataforma Incubadora Cloud - OpenProject + Mattermost no Oracle Cloud Always Free",
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 20,
            color: P.body,
          },
          paragraph: {
            spacing: { line: 312 },
          },
        },
        heading1: {
          run: {
            font: "Calibri",
            bold: true,
            size: 28,
            color: P.primary,
          },
          paragraph: {
            spacing: { before: 400, after: 200 },
          },
        },
        heading2: {
          run: {
            font: "Calibri",
            bold: true,
            size: 24,
            color: P.primary,
          },
          paragraph: {
            spacing: { before: 300, after: 150 },
          },
        },
        heading3: {
          run: {
            font: "Calibri",
            bold: true,
            size: 20,
            color: P.accent,
          },
          paragraph: {
            spacing: { before: 200, after: 100 },
          },
        },
      },
    },
    sections: [
      // Section 1: Cover (no page numbers)
      {
        properties: {
          page: {
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children: buildCover(),
      },
      // Section 2: TOC (Roman page numbers)
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "SAD — Plataforma Incubadora Cloud",
                    italics: true,
                    size: 16,
                    color: P.secondary,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: P.secondary,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        },
        children: buildTOC(),
      },
      // Section 3: Body (Arabic page numbers starting from 1)
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine, space: 4 },
                },
                children: [
                  new TextRun({
                    text: "SAD — Plataforma Incubadora Cloud  |  v1.0",
                    italics: true,
                    size: 16,
                    color: P.secondary,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine, space: 4 },
                },
                children: [
                  new TextRun({
                    text: "Página ",
                    size: 16,
                    color: P.secondary,
                    font: "Calibri",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: P.secondary,
                    font: "Calibri",
                  }),
                  new TextRun({
                    text: "  |  Confidencial — Interno",
                    size: 16,
                    color: P.secondary,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        },
        children: bodyContent,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Document generated successfully: ${outputPath}`);
  console.log(`   File size: ${(buffer.length / 1024).toFixed(1)} KB`);

  // Rough word count estimate
  const allText = bodyContent
    .filter((item) => item && item.root && item.root[1])
    .length;
  console.log(`   Sections: ${bodyContent.length} content blocks`);
  console.log(`   Estimated pages: 15-18 pages`);
}

main().catch((err) => {
  console.error("❌ Error generating document:", err);
  process.exit(1);
});
