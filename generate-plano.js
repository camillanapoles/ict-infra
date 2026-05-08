const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, PageBreak, TabStopType,
  TabStopPosition, ShadingType, BorderStyle, Header, Footer,
  PageNumber, NumberFormat, TableOfContents, SectionType,
  VerticalAlign, convertInchesToTwip, ImageRun
} = require("docx");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════════
// PALETTE DM-1: Deep Cyan (Tech/AI/Digital)
// ═══════════════════════════════════════════════════════════════════
const P = {
  primary: "162235",
  body: "000000",
  secondary: "5A6080",
  accent: "37DCF2",
  surface: "F0F8FC",
  cover: {
    bg: "0D1926",
    titleColor: "FFFFFF",
    subtitleColor: "B0B8C0",
    metaColor: "90989F",
    footerColor: "687078",
    accentLine: "37DCF2",
    blockHeight: 4.5, // inches for top color block
  },
  table: {
    headerBg: "1B6B7A",
    headerText: "FFFFFF",
    accentLine: "37DCF2",
    innerLine: "C8DDE2",
    surface: "EDF3F5",
    white: "FFFFFF",
    gray: "F7FAFB",
  },
  heading1: "162235",
  heading2: "1B6B7A",
  heading3: "24899A",
};

// ═══════════════════════════════════════════════════════════════════
// HELPER: color hex to docx RGB
// ═══════════════════════════════════════════════════════════════════
function rgb(hex) {
  return hex.length === 6 ? hex : hex;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════
const FONT = "Calibri";
const FONT_HEADING = "Calibri";

function spacer(pts = 6) {
  return new Paragraph({ spacing: { before: pts, after: pts } });
}

function emptyPara(pts = 4) {
  return new Paragraph({ spacing: { before: pts, after: pts }, children: [] });
}

function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60, line: 276 },
    alignment: AlignmentType.JUSTIFIED,
    ...opts,
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 22,
        color: rgb(P.body),
        ...(opts.runOpts || {}),
      }),
    ],
  });
}

function bodyBold(label, text) {
  return new Paragraph({
    spacing: { before: 60, after: 60, line: 276 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text: label, font: FONT, size: 22, color: rgb(P.body), bold: true }),
      new TextRun({ text, font: FONT, size: 22, color: rgb(P.body) }),
    ],
  });
}

function bulletItem(text, level = 0) {
  return new Paragraph({
    spacing: { before: 40, after: 40, line: 260 },
    alignment: AlignmentType.LEFT,
    indent: { left: 360 + level * 360, hanging: 180 },
    children: [
      new TextRun({ text: level === 0 ? "\u2022" : "\u25E6", font: FONT, size: 22, color: rgb(P.accent) }),
      new TextRun({ text: "  " + text, font: FONT, size: 22, color: rgb(P.body) }),
    ],
  });
}

function numberedItem(num, text) {
  return new Paragraph({
    spacing: { before: 40, after: 40, line: 260 },
    alignment: AlignmentType.LEFT,
    indent: { left: 360, hanging: 360 },
    children: [
      new TextRun({ text: `${num}. `, font: FONT, size: 22, color: rgb(P.heading2), bold: true }),
      new TextRun({ text, font: FONT, size: 22, color: rgb(P.body) }),
    ],
  });
}

function heading1(text) {
  return new Paragraph({
    spacing: { before: 360, after: 120 },
    children: [
      new TextRun({ text, font: FONT_HEADING, size: 32, color: rgb(P.heading1), bold: true }),
    ],
    border: { bottom: { color: rgb(P.accent), space: 4, style: BorderStyle.SINGLE, size: 6 } },
  });
}

function heading2(text) {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({ text, font: FONT_HEADING, size: 26, color: rgb(P.heading2), bold: true }),
    ],
  });
}

function heading3(text) {
  return new Paragraph({
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({ text, font: FONT_HEADING, size: 23, color: rgb(P.heading3), bold: true }),
    ],
  });
}

function accentBox(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100, line: 276 },
    alignment: AlignmentType.LEFT,
    indent: { left: 240, right: 240 },
    shading: { type: ShadingType.SOLID, color: rgb(P.surface) },
    children: [
      new TextRun({ text, font: FONT, size: 22, color: rgb(P.primary), italics: true }),
    ],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ═══════════════════════════════════════════════════════════════════
// TABLE HELPERS
// ═══════════════════════════════════════════════════════════════════
function headerCell(text, width) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: { type: ShadingType.SOLID, color: rgb(P.table.headerBg) },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text, font: FONT, size: 20, color: rgb(P.table.headerText), bold: true })],
      }),
    ],
  });
}

function dataCell(text, width, opts = {}) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: { type: ShadingType.SOLID, color: rgb(opts.zebra ? P.table.gray : P.table.white) },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 30, after: 30 },
        children: [new TextRun({ text, font: FONT, size: 20, color: rgb(P.body), ...(opts.bold ? { bold: true } : {}) })],
      }),
    ],
  });
}

function makeTable(headers, rows, colWidths) {
  const tableRows = [];
  tableRows.push(new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths?.[i])) }));
  rows.forEach((row, ri) => {
    tableRows.push(new TableRow({
      children: row.map((cell, ci) => dataCell(cell, colWidths?.[ci], { zebra: ri % 2 === 1 })),
    }));
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

// ═══════════════════════════════════════════════════════════════════
// COVER PAGE SECTION (R4: Top Color Block)
// ═══════════════════════════════════════════════════════════════════
function buildCoverSection() {
  // The R4 cover uses a full-page table with a colored top block
  // Since docx-js has limited background control, we simulate with table cells
  const coverChildren = [];

  // Spacer to push content down
  coverChildren.push(emptyPara(1200));
  coverChildren.push(emptyPara(800));

  // Accent line
  coverChildren.push(new Paragraph({
    spacing: { before: 0, after: 0 },
    alignment: AlignmentType.LEFT,
    indent: { left: 720 },
    children: [new TextRun({ text: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500", font: FONT, size: 16, color: rgb(P.cover.accentLine) })],
  }));

  // Title
  coverChildren.push(new Paragraph({
    spacing: { before: 200, after: 80 },
    alignment: AlignmentType.LEFT,
    indent: { left: 720 },
    children: [new TextRun({ text: "PLANO DE IMPLEMENTACAO", font: FONT_HEADING, size: 56, color: rgb(P.cover.titleColor), bold: true, characterSpacing: 120 })],
  }));

  // Subtitle
  coverChildren.push(new Paragraph({
    spacing: { before: 80, after: 60 },
    alignment: AlignmentType.LEFT,
    indent: { left: 720 },
    children: [new TextRun({ text: "Plataforma Incubadora Cloud", font: FONT_HEADING, size: 36, color: rgb(P.cover.subtitleColor) })],
  }));

  // Second subtitle
  coverChildren.push(new Paragraph({
    spacing: { before: 40, after: 60 },
    alignment: AlignmentType.LEFT,
    indent: { left: 720 },
    children: [new TextRun({ text: "OpenProject + Mattermost sobre Oracle Cloud Always Free", font: FONT, size: 26, color: rgb(P.cover.subtitleColor), italics: true })],
  }));

  // Accent line
  coverChildren.push(new Paragraph({
    spacing: { before: 200, after: 0 },
    alignment: AlignmentType.LEFT,
    indent: { left: 720 },
    children: [new TextRun({ text: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500", font: FONT, size: 16, color: rgb(P.cover.accentLine) })],
  }));

  coverChildren.push(emptyPara(300));

  // Meta info
  const metaLines = [
    "Protocolo dTP \u2014 Diagnosticacao Tecnica de Projeto",
    "Versao 1.0  |  Maio 2026",
    "Destinatario: Scrum Master",
    "Documento 2 de 2 \u2014 Plano de Implementacao (PMO)",
    "Classificacao: Confidencial",
  ];
  metaLines.forEach((line) => {
    coverChildren.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.LEFT,
      indent: { left: 720 },
      children: [new TextRun({ text: line, font: FONT, size: 22, color: rgb(P.cover.metaColor) })],
    }));
  });

  coverChildren.push(emptyPara(600));

  // Footer
  coverChildren.push(new Paragraph({
    spacing: { before: 100, after: 0 },
    alignment: AlignmentType.LEFT,
    indent: { left: 720 },
    children: [new TextRun({ text: "Documento gerado automaticamente  |  Incubadora de Startups Deeptech", font: FONT, size: 18, color: rgb(P.cover.footerColor) })],
  }));

  return {
    properties: {
      page: {
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
        size: { width: 11906, height: 16838 },
      },
    },
    children: [
      // Top color block using a shaded paragraph
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [],
        shading: { type: ShadingType.SOLID, color: rgb(P.cover.bg) },
      }),
      ...coverChildren,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════
// TOC SECTION
// ═══════════════════════════════════════════════════════════════════
function buildTocSection() {
  return {
    properties: {
      page: {
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        size: { width: 11906, height: 16838 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Plano de Implementacao \u2014 Plataforma Incubadora Cloud", font: FONT, size: 18, color: rgb(P.secondary), italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Pagina ", font: FONT, size: 18, color: rgb(P.secondary) }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: rgb(P.secondary) }),
            new TextRun({ text: " de ", font: FONT, size: 18, color: rgb(P.secondary) }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: rgb(P.secondary) }),
          ],
        })],
      }),
    },
    children: [
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: "SUMARIO", font: FONT_HEADING, size: 36, color: rgb(P.heading1), bold: true, characterSpacing: 80 })],
        border: { bottom: { color: rgb(P.accent), space: 4, style: BorderStyle.SINGLE, size: 6 } },
      }),
      emptyPara(100),
      // Manual TOC since auto-TOC requires Word to refresh
      ...buildManualToc(),
      pageBreak(),
    ],
  };
}

function buildManualToc() {
  const entries = [
    ["1.", "Sumario Executivo", "3"],
    ["2.", "Premissas e Restricoes", "4"],
    ["3.", "Metodologia dTP", "5"],
    ["4.", "Fase 0: Preparacao do Ambiente", "6"],
    ["5.", "Fase 1: Infraestrutura OCI", "7"],
    ["6.", "Fase 2: Stack de Aplicacoes", "8"],
    ["7.", "Fase 3: Seguranca e Observabilidade", "10"],
    ["8.", "Fase 4: Configuracao OpenProject", "11"],
    ["9.", "Fase 5: Configuracao Mattermost", "12"],
    ["10.", "Fase 6: Plugins e Integracoes", "13"],
    ["11.", "Fase 7: Testes e Validacao", "15"],
    ["12.", "Fase 8: Go-Live e Handover", "16"],
    ["13.", "Matriz RACI", "17"],
    ["14.", "Cronograma", "18"],
    ["15.", "Gestao de Riscos Operacionais", "19"],
    ["16.", "Indicadores de Sucesso (KPIs)", "20"],
  ];

  return entries.map(([num, title, pg]) =>
    new Paragraph({
      spacing: { before: 60, after: 60, line: 360 },
      tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(6.5), leader: "dot" }],
      children: [
        new TextRun({ text: `${num}  `, font: FONT, size: 22, color: rgb(P.heading2), bold: true }),
        new TextRun({ text: title, font: FONT, size: 22, color: rgb(P.body) }),
        new TextRun({ text: `\t${pg}`, font: FONT, size: 22, color: rgb(P.secondary) }),
      ],
    })
  );
}

// ═══════════════════════════════════════════════════════════════════
// PHASE TEMPLATE
// ═══════════════════════════════════════════════════════════════════
function buildPhaseSection(
  phaseNum,
  title,
  sprint,
  weeks,
  objective,
  tasks,
  deliverable,
  acceptance,
  responsible,
  additionalNotes
) {
  const children = [];

  children.push(heading1(`${phaseNum}. ${title}`));
  children.push(accentBox(`${sprint} | ${weeks}`));

  children.push(heading2("Objetivo da Fase"));
  children.push(bodyText(objective));

  children.push(heading2("Tarefas"));
  children.push(makeTable(
    ["ID", "Tarefa", "Descricao", "Prioridade"],
    tasks,
    [8, 22, 55, 15]
  ));

  children.push(heading2("Entregavel"));
  children.push(bodyText(deliverable));

  children.push(heading2("Criterios de Aceitacao"));
  acceptance.forEach((a) => children.push(bulletItem(a)));

  children.push(heading2("Responsavel"));
  children.push(bodyText(responsible));

  if (additionalNotes && additionalNotes.length > 0) {
    children.push(heading2("Notas Adicionais"));
    additionalNotes.forEach((n) => children.push(bulletItem(n)));
  }

  children.push(pageBreak());
  return children;
}

// ═══════════════════════════════════════════════════════════════════
// BODY CONTENT
// ═══════════════════════════════════════════════════════════════════
function buildBodySection() {
  const children = [];

  // ──── 1. SUMARIO EXECUTIVO ────
  children.push(heading1("1. Sumario Executivo"));
  children.push(bodyText(
    "Este Plano de Implementacao detalha a estrategia completa para deploy da Plataforma Incubadora Cloud, uma solucao integrada de gestao de projetos e colaboracao em tempo real, composta pelo OpenProject 15 e Mattermost Team Edition, provisionada integralmente sobre a camada gratuita do Oracle Cloud Infrastructure (OCI Always Free Tier)."
  ));
  children.push(bodyText(
    "A implementacao segue o Protocolo dTP (Diagnosticacao Tecnica de Projeto), uma metodologia estruturada em quatro macro-estagios \u2014 Diagnostico, Planejamento, Transformacao e Producao \u2014 adaptada para projetos de infraestrutura cloud e DevOps. O plano contempla 8 fases operacionais distribuidas em aproximadamente 10 sprints de 2 semanas cada, totalizando 20 semanas de execucao."
  ));
  children.push(bodyText(
    "O resultado esperado e uma plataforma de producao completa, com alta disponibilidade, segura, monitorada e totalmente operacional a custo zero recorrente. A arquitetura utiliza uma unica instancia A1 Flex (4 OCPU / 24 GB RAM) com K3s single-node, 4 namespaces Kubernetes isolados, Terraform para Infrastructure as Code, GitHub Actions para CI/CD, e Cloudflare para gerenciamento de DNS e TLS."
  ));
  children.push(heading2("Destaques do Plano"));
  children.push(bulletItem("8 fases operacionais com gates de qualidade entre cada fase"));
  children.push(bulletItem("10 sprints de 2 semanas (20 semanas totais de implementacao)"));
  children.push(bulletItem("Custo total recorrente: USD 0,00 (Oracle Always Free Tier)"));
  children.push(bulletItem("Capacidade para equipe de 10 usuarios, escalavel ate 50 usuarios simultaneos"));
  children.push(bulletItem("Stack completa: K3s + PostgreSQL 17 + Memcached + Traefik + cert-manager"));
  children.push(bulletItem("CI/CD automatizado via GitHub Actions (deploy, backup, monitoring, update)"));
  children.push(bulletItem("Infraestrutura como Codigo (Terraform) com estado versionado"));
  children.push(bulletItem("Seguranca defense-in-depth: NetworkPolicies, WAF, Vault, UFW + fail2ban"));
  children.push(heading2("Entregavel Principal"));
  children.push(bodyText(
    "Plataforma de producao completa e operacional, composta por OpenProject 15 para gestao de projetos e portfólio, e Mattermost Team Edition para colaboracao e comunicacao, integrados entre si via webhooks e bots, com monitoramento proativo, backups automaticos, e documentacao operacional completa."
  ));
  children.push(heading2("Risco Critico"));
  children.push(bodyText(
    "O principal risco identificado sao as restricoes de capacidade da instancia A1 Flex no tier gratuito da Oracle Cloud, que fornece ate 4 OCPU e 24 GB de RAM. Sob carga elevada (50+ usuarios simultaneos com multiplos work packages abertos), o consumo de CPU pode atingir niveis criticos, necessitando de otimizacoes de performance e possivel particao de servicos em futuras instancias adicionais (se o tier permitir)."
  ));
  children.push(pageBreak());

  // ──── 2. PREMISSAS E RESTRICOES ────
  children.push(heading1("2. Premissas e Restricoes"));
  children.push(bodyText(
    "O sucesso deste projeto depende do cumprimento das seguintes premissas e restricoes, que definem os limites operacionais, tecnicos e financeiros da implementacao. Todas as decisoes arquiteturais e de escopo foram tomadas considerando estas restricoes como imutaveis."
  ));
  children.push(heading2("2.1 Premissas"));
  children.push(bulletItem("Oracle Cloud Always Free Tier disponivel e com cotas suficientes na regiao escolhida"));
  children.push(bulletItem("Conta OCI ativa com capacidade de provisionar A1 Flex (4 OCPU / 24 GB RAM)"));
  children.push(bulletItem("Dominio registrado e configuravel via Cloudflare DNS"));
  children.push(bulletItem("Equipe tecnica com conhecimento em Kubernetes (K3s), Terraform e Docker"));
  children.push(bulletItem("Acesso a GitHub para repositorio de codigo e GitHub Actions"));
  children.push(bulletItem("Conectividade de internet estavel para operacoes de deploy e monitoramento"));
  children.push(bulletItem("Tempo medio de dedicacao da equipe: 4 horas/dia por membro"));
  children.push(bulletItem("Smtp server disponivel para envio de notificacoes (SMTP relay ou servico gratuito)"));
  children.push(heading2("2.2 Restricoes Tecnicas"));
  children.push(makeTable(
    ["Restricao", "Descricao", "Impacto"],
    [
      ["Tier Gratuito", "Apenas servicos OCI Always Free (sem upgrade pago)", "Alta \u2014 limita escala horizontal"],
      ["Instancia Unica", "1 VM A1 Flex (4 OCPU / 24 GB RAM)", "Alta \u2014 single point of failure"],
      ["K3s Single-Node", "Cluster Kubernetes com unico no", "Media \u2014 sem HA nativo"],
      ["4 Namespaces", "Limite de namespaces: infra, openproject, mattermost, monitoring", "Baixa \u2014 designado pela arquitetura"],
      ["Storage 150 GB", "Block Volume adicional de 150 GB", "Media \u2014 requer gerenciamento de disco"],
      ["Sem SLA Oficial", "OCI Free Tier nao possui SLA contratual", "Alta \u2014 dependencia de monitoramento proprio"],
    ],
    [20, 50, 30]
  ));
  children.push(heading2("2.3 Restricoes Operacionais"));
  children.push(bulletItem("Equipe de 10 membros ativos, escalavel para 50 com degradacao previsivel de performance"));
  children.push(bulletItem("Janela de manutencao: segunda a sexta, 22h-06h (UTC-3) para minimizar impacto"));
  children.push(bulletItem("Atualizacoes de seguranca aplicadas em janela de manutencao com aviso previo de 24h"));
  children.push(bulletItem("Rollback automatizado via GitHub Actions em caso de falha de deploy"));
  children.push(bulletItem("Todos os secrets gerenciados via OCI Vault + variaveis de ambiente (.env)"));
  children.push(bulletItem("Terraform como unica ferramenta de IaC (proibido provisionamento manual)"));
  children.push(bulletItem("Cloudflare como unico provedor de DNS e CDN"));
  children.push(pageBreak());

  // ──── 3. METODOLOGIA dTP ────
  children.push(heading1("3. Metodologia dTP"));
  children.push(bodyText(
    "O Protocolo dTP (Diagnosticacao Tecnica de Projeto) e uma metodologia proprietaria estruturada para projetos de transformacao digital e infraestrutura cloud. Diferente de metodologias tradicionais de gerenciamento de projetos, o dTP incorpora gates tecnicos rigorosos entre fases, garantindo que cada estagio esteja completamente validado antes de avancar para o proximo."
  ));
  children.push(heading2("3.1 Macro-Estagios do dTP"));
  children.push(makeTable(
    ["Estagio", "Descricao", "Fases do Projeto", "Duracao"],
    [
      ["Diagnostico", "Levantamento completo de requisitos tecnicos, viabilidade e restricoes ambientais", "Fase 0: Preparacao do Ambiente", "Sprint 1 (2 sem)"],
      ["Planejamento", "Projeto arquitetural detalhado, IaC, pipelines e definicao de backlog", "Fase 1: Infraestrutura OCI + Fase 2: Stack de Aplicacoes", "Sprint 2-3 (4 sem)"],
      ["Transformacao", "Implementacao iterativa, integracao, seguranca e configuracao de plataformas", "Fase 3 a Fase 6: Seguranca, OpenProject, Mattermost, Plugins", "Sprint 4-8 (10 sem)"],
      ["Producao", "Testes comprehensivos, validacao, treinamento e go-live com monitoramento intensivo", "Fase 7 e Fase 8: Testes e Go-Live", "Sprint 9-10 (4 sem)"],
    ],
    [15, 40, 30, 15]
  ));
  children.push(heading2("3.2 Gates de Qualidade"));
  children.push(bodyText(
    "Cada fase do projeto possui um Quality Gate obrigratorio que deve ser aprovado pelo Scrum Master e pelo responsavel tecnico da fase antes do inicio da fase seguinte. Os gates sao avaliados com base nos criterios de aceitacao definidos para cada fase."
  ));
  children.push(bulletItem("Gate 0→1: Ambiente validado, terraform plan sem erros, secrets configurados"));
  children.push(bulletItem("Gate 1→2: Infraestrutura OCI provisionada, VM acessivel via SSH, DNS resolvendo"));
  children.push(bulletItem("Gate 2→3: Stack completa rodando, TLS funcionando, health checks passando"));
  children.push(bulletItem("Gate 3→4: Seguranca validada, backups funcionando, nenhuma porta nao autorizada"));
  children.push(bulletItem("Gate 4→5: OpenProject configurado, CRUD completo, permissoes isoladas"));
  children.push(bulletItem("Gate 5→6: Mattermost configurado, webhooks funcionando, bot ativo"));
  children.push(bulletItem("Gate 6→7: Plugins instalados, CI/CD operacional, deploy automatico OK"));
  children.push(bulletItem("Gate 7→8: Todos os testes passando, 0 critical bugs, < 3 medium bugs"));
  children.push(heading2("3.3 Cerimônias do Scrum"));
  children.push(bodyText(
    "O projeto segue o framework Scrum adaptado as necessidades de implementacao tecnica. Cada sprint de 2 semanas inclui as seguintes ceremonias:"
  ));
  children.push(bulletItem("Sprint Planning (inicio): Definicao de tarefas do sprint baseado no backlog priorizado"));
  children.push(bulletItem("Daily Stand-up (diario): 15 minutos, 3 perguntas (o que fiz, o que vou fazer, impedimentos)"));
  children.push(bulletItem("Sprint Review (final): Demonstracao dos entregaveis ao Scrum Master e stakeholders"));
  children.push(bulletItem("Sprint Retrospective (final): Melhorias de processo para o proximo sprint"));
  children.push(pageBreak());

  // ──── 4. FASE 0: PREPARACAO DO AMBIENTE ────
  children.push(...buildPhaseSection(
    "4", "Fase 0: Preparacao do Ambiente", "Sprint 1 | Semana 1-2",
    "Sprint 1 (Semana 1-2)",
    "Preparar e validar todo o ambiente tecnico necessario para o inicio da implementacao. Esta fase estabelece os fundamentos de acesso, credenciais e ferramentas que serao utilizados em todas as fases subsequentes. Nenhum provisionamento de infraestrutura deve iniciar sem que esta fase esteja completamente validada.",
    [
      ["T0.1", "Criar conta Oracle Cloud Free Tier", "Registrar conta OCI, selecionar home region, verificar cotas de A1 Flex e ARM instances. Confirmar disponibilidade de 4 OCPU e 24 GB RAM na regiao.", "Critica"],
      ["T0.2", "Gerar API Keys (OCI)", "Criar API signing key pair (RSA 2048), obter fingerprint, tenancy OCID, user OCID. Configurar arquivo ~/.oci/config com credenciais.", "Critica"],
      ["T0.3", "Configurar GitHub repo com secrets", "Criar repositorio privado, configurar secrets: OCI_TENANCY_OCID, OCI_USER_OCID, OCI_FINGERPRINT, OCI_PRIVATE_KEY, CLOUDFLARE_API_TOKEN, DOMAIN_NAME.", "Critica"],
      ["T0.4", "Configurar Cloudflare", "Adicionar dominio ao Cloudflare, gerar API token com permissoes DNS:Edit. Configurar nameservers no registrador de dominio.", "Alta"],
      ["T0.5", "Preparar maquina local", "Instalar Terraform >= 1.6, OCI CLI >= 3.0, Docker >= 24, kubectl >= 1.28. Validar versoes com terraform version, oci --version, docker --version, kubectl version.", "Alta"],
      ["T0.6", "Validar acesso OCI", "Testar conexao OCI CLI (oci iam compartment list). Validar acesso a VCN, Compute, Block Volume, Vault, Monitoring services. Documentar restricoes de cota.", "Critica"],
    ],
    "Ambiente tecnico completamente validado e documentado, com todas as credenciais configuradas e acesso verificado a todos os servicos OCI necessarios.",
    [
      "Conta OCI ativa com acesso a A1 Flex e servicos Always Free",
      "API keys geradas e testadas com sucesso (oci iam compartment list)",
      "Repositorio GitHub configurado com todos os secrets necessarios",
      "Dominio adicionado ao Cloudflare com API token validado",
      "Todas as ferramentas locais instaladas e com versoes compativeis",
      "terraform plan executa sem erros contra a conta OCI",
    ],
    "DevOps Lead",
    [
      "O DevOps Lead deve documentar todas as cotas disponivel na regiao OCI escolhida",
      "Os secrets do GitHub devem ser compartilhados apenas com membros autorizados do time",
      "Caso a cota de A1 Flex nao esteja disponivel na home region, avaliar regioes alternativas"
    ]
  ));

  // ──── 5. FASE 1: INFRAESTRUTURA OCI ────
  children.push(...buildPhaseSection(
    "5", "Fase 1: Infraestrutura OCI", "Sprint 2 | Semana 3-4",
    "Sprint 2 (Semana 3-4)",
    "Provisionar toda a infraestrutura base na Oracle Cloud Infrastructure utilizando Terraform como ferramenta de Infrastructure as Code. Esta fase cria os recursos fundamentais: rede virtual, instancia computacional, volumes de armazenamento, segredos, monitoramento e configuracao de DNS.",
    [
      ["T1.1", "Terraform VCN + subnets", "Criar Virtual Cloud Network com CIDR 10.0.0.0/16, subnets publica e privada, Internet Gateway, NAT Gateway, Route Tables, Security Lists com regras minimas.", "Critica"],
      ["T1.2", "Terraform A1 Flex compute", "Provisionar instancia A1 Flex (4 OCPU ARM / 24 GB RAM) com Ubuntu 22.04 LTS, cloud-init para instalacao automatica de Docker e dependencias. SSH via chave publica.", "Critica"],
      ["T1.3", "Terraform Block Volume", "Criar Block Volume de 150 GB (paravirtualized) e attach a instancia. Formatar como ext4 e montar em /data via cloud-init.", "Critica"],
      ["T1.4", "Terraform Vault + secrets", "Criar OCI Vault, master encryption key, e secrets para: DB_PASSWORD, MEMCACHED_PASSWORD, MATTERMOST_TOKEN, OPENPROJECT_TOKEN. Referenciados via OCID.", "Alta"],
      ["T1.5", "Terraform Monitoring", "Configurar OCI Monitoring: metricas de CPU, RAM, disco e rede. Criar alarmes para CPU > 80%, RAM > 85%, disco > 90%. Configurar Notifications (email).", "Alta"],
      ["T1.6", "Terraform Cloudflare DNS", "Criar registros DNS no Cloudflare via provider: projects.domain.com (A record), chat.domain.com (A record), ambos apontando para IP publico da VM.", "Alta"],
      ["T1.7", "Validacao completa", "Executar terraform apply -auto-approve. Validar: SSH access, DNS resolution (dig +short), alarmes ativos, Block Volume montado. Executar smoke tests.", "Critica"],
    ],
    "Infraestrutura OCI completamente provisionada e monitorada, com todos os recursos validados e acessiveis. Terraform state versionado no repositorio GitHub.",
    [
      "VM acessivel via SSH usando chave privada configurada",
      "Registros DNS resolvendo corretamente para o IP da VM",
      "Block Volume de 150 GB montado e acessivel em /data",
      "Todos os alarmes OCI Monitoring configurados e ativos",
      "Vault criado com secrets criptografados",
      "terraform plan nao mostra alteracoes (convergencia)",
    ],
    "DevOps Lead",
    [
      "Executar terraform fmt e terraform validate antes de cada commit",
      "Manter terraform.tfstate versionado via git (para ambiente single-user)",
      "Documentar IPs publicos e privados em arquivo separado (não versionar)",
      "Caso o terraform apply falhe, investigar logs OCI antes de retry"
    ]
  ));

  // ──── 6. FASE 2: STACK DE APLICACOES ────
  children.push(...buildPhaseSection(
    "6", "Fase 2: Stack de Aplicacoes", "Sprint 3 | Semana 5-6",
    "Sprint 3 (Semana 5-6)",
    "Instalar e configurar toda a stack de aplicacoes sobre a infraestrutura provisionada. Esta fase implementa K3s como orquestrador de containers, deploy dos bancos de dados (PostgreSQL e Memcached), aplicacoes (OpenProject e Mattermost), ingress controller com TLS automatico, e jobs de backup.",
    [
      ["T2.1", "Instalar K3s", "Executar install-k3s.sh na VM. K3s single-node com traefik ingress habilitado. Configurar data-dir em /data/k3s para persistencia no Block Volume.", "Critica"],
      ["T2.2", "Instalar Helm + addons", "Instalar Helm 3. Deploy cert-manager (ClusterIssuer para Let's Encrypt). Configurar Traefik IngressRoute com middlewares de seguranca.", "Critica"],
      ["T2.3", "Deploy namespaces + policies", "Aplicar namespaces.yaml (incubadora-infra, incubadora-openproject, incubadora-mattermost, incubadora-monitoring). Aplicar NetworkPolicies para isolamento.", "Alta"],
      ["T2.4", "Deploy PostgreSQL 17", "Deploy via Helm chart ou manifestos. Configurar persistent volume em /data/postgresql. Criar databases: openproject, mattermost. Configurar backups WAL.", "Critica"],
      ["T2.5", "Deploy Memcached", "Deploy Memcached no namespace incubadora-infra. Configurar 1024 MB de memoria, connection limit 1024. Service interno sem exposicao externa.", "Media"],
      ["T2.6", "Deploy OpenProject 15", "Deploy via Helm chart (openproject/openproject). Configurar: PostgreSQL connection, Memcached, SMTP, volume em /data/openproject. Resources limits definidos.", "Critica"],
      ["T2.7", "Deploy Mattermost Team", "Deploy via Helm chart (mattermost/mattermost-team-edition). Configurar: PostgreSQL connection, SMTP, site URL, volume em /data/mattermost.", "Critica"],
      ["T2.8", "Configurar Traefik + TLS", "Criar IngressRoutes para projects.domain.com e chat.domain.com. Configurar TLS com cert-manager (Let's Encrypt HTTP-01 challenge). Redirect HTTP para HTTPS.", "Critica"],
      ["T2.9", "Deploy backup CronJobs", "Criar CronJobs para backup diario: PostgreSQL dump, OpenProject data, Mattermost data. Scripts em /scripts/backup.sh. Retention: 7 dias.", "Alta"],
      ["T2.10", "Validacao da stack", "Executar kubectl apply -k k3s/. Validar: todos os pods Running, Ingress criado, TLS certificates emitidos. Health checks em ambas URLs.", "Critica"],
    ],
    "Stack completa de aplicacoes rodando com TLS, incluindo K3s, PostgreSQL, Memcached, OpenProject e Mattermost, com backup automatico configurado.",
    [
      "Todos os pods em estado Running (kubectl get pods -A)",
      "https://projects.domain.com acessivel e carregando OpenProject",
      "https://chat.domain.com acessivel e carregando Mattermost",
      "Certificados TLS validos e com auto-renovacao configurada",
      "PostgreSQL conectivo e com databases criados",
      "Backup CronJobs criados e agendados",
    ],
    "DevOps + Backend",
    [
      "K3s data-dir deve apontar para /data/k3s no Block Volume para persistencia",
      "Configurar resource limits para evitar OOM (Out of Memory) na VM",
      "Testar cert-manager HTTP-01 challenge antes de configurar IngressRoutes",
      "Validar que NetworkPolicies permitem comunicacao necessaria entre namespaces"
    ]
  ));

  // ──── 7. FASE 3: SEGURANCA E OBSERVABILIDADE ────
  children.push(...buildPhaseSection(
    "7", "Fase 3: Seguranca e Observabilidade", "Sprint 4 | Semana 7-8",
    "Sprint 4 (Semana 7-8)",
    "Implementar todas as camadas de seguranca e observabilidade da plataforma. Esta fase configura WAF, rotacao de secrets, firewall na VM, isolamento de redes, dashboards de monitoramento, testes de backup/restore, e realizacao de pentest basico para validar a postura de seguranca.",
    [
      ["T3.1", "Configurar OCI WAF", "Criar Web Application Firewall via OCI. Configurar regras para protecao contra OWASP Top 10: SQL injection, XSS, CSRF, rate limiting, bot protection.", "Alta"],
      ["T3.2", "Vault secrets rotation", "Implementar rotacao automatica de secrets no OCI Vault. Configurar schedule mensal para senhas de banco e tokens de integracao.", "Alta"],
      ["T3.3", "Configurar UFW + fail2ban", "Instalar e configurar UFW na VM: permitir SSH (22), HTTP (80), HTTPS (443), K3s (6443). Habilitar fail2ban para protecao contra brute force SSH.", "Critica"],
      ["T3.4", "Validar NetworkPolicies", "Testar isolamento entre namespaces: incubadora-infra nao deve alcançar incubadora-mattermost diretamente. Validar com kubectl exec + curl entre pods.", "Critica"],
      ["T3.5", "Dashboards OCI Monitoring", "Criar dashboards personalizados no OCI Monitoring: CPU usage, memory usage, disk I/O, network throughput, pod status, HTTP response codes.", "Media"],
      ["T3.6", "Testar backup/restore", "Executar backup.sh manualmente. Restaurar em ambiente de teste. Validar integridade dos dados restaurados (OpenProject projects + Mattermost messages).", "Critica"],
      ["T3.7", "Pen test basico", "Executar varredura com nmap (portas expostas), sslyze (configuracao TLS), nikto (vulnerabilidades web). Documentar findings e remediacoes necessarias.", "Alta"],
    ],
    "Plataforma com seguranca validada em multiplas camadas, backups funcionando com restore comprovado, e monitoramento proativo configurado.",
    [
      "Nenhuma porta nao autorizada exposta (apenas 22, 80, 443, 6443)",
      "UFW ativo com regras configuradas e fail2ban rodando",
      "Backup completo executado e restore validado com sucesso",
      "NetworkPolicies isolando corretamente os namespaces",
      "Pen test basico sem findings criticos",
      "Dashboards de monitoramento acessiveis e atualizados",
    ],
    "DevOps + Security",
    [
      "Documentar todas as regras de firewall com justificativa",
      "Os resultados do pen test devem ser arquivados como evidencia de seguranca",
      "Testar fail2ban simulando multipas tentativas de login SSH",
      "Configurar alerta de seguranca para acessos SSH de IPs nao autorizados"
    ]
  ));

  // ──── 8. FASE 4: CONFIGURACAO OPENPROJECT ────
  children.push(...buildPhaseSection(
    "8", "Fase 4: Configuracao OpenProject", "Sprint 5 | Semana 9-10",
    "Sprint 5 (Semana 9-10)",
    "Configurar o OpenProject 15 como a ferramenta central de gestao de projetos e portfólio da Incubadora. Esta fase inclui configuracao administrativa, criacao de tipos de trabalho personalizados, campos customizados para deeptech, definicao de permissoes RBAC, configuracao de quadros Kanban, dashboards e templates de projeto.",
    [
      ["T4.1", "Configurar admin + SMTP", "Acessar painel admin. Configurar SMTP para notificacoes por email. Definir URL base, timezone (America/Sao_Paulo), idioma padrao (pt-BR).", "Critica"],
      ["T4.2", "Criar projeto IncubaScience Hub", "Criar projeto principal IncubaScience Hub como template global. Configurar como projeto pai para todos os projetos deeptech da incubadora.", "Critica"],
      ["T4.3", "Configurar tipos de trabalho", "Criar tipos personalizados: Fase (milestone), Pacote (story), Tarefa (task), Marco (milestone), Demanda (request). Configurar hierarquia entre tipos.", "Alta"],
      ["T4.4", "Campos personalizados", "Criar campos: TRL (Technology Readiness Level, 1-9), MRL (Manufacturing Readiness Level), ESG Score, Fase da Incubacao, KPIs Principais, Ranking Deeptech.", "Alta"],
      ["T4.5", "Configurar RBAC", "Definir 4 perfis: Admin (acesso total), Gestor Portfolio (visualizacao + edicao de projetos), Leader Deeptech (gestao do proprio projeto), Membro (visualizacao + update de tarefas atribuidas).", "Critica"],
      ["T4.6", "Criar grupos", "Criar grupo Grupo_Gestores_Incubadora. Atribuir permissoes globais. Configurar heranca de permissoes para projetos filhos.", "Media"],
      ["T4.7", "Quadros Kanban", "Configurar 3 quadros Kanban: (1) Geral da Incubadora, (2) Acompanhamento Deeptechs por fase, (3) Canal de Solicitacoes. Definir colunas e WIP limits.", "Alta"],
      ["T4.8", "Dashboards", "Criar 3 dashboards: (1) Gestao da Incubadora (visao macro), (2) Dashboard Deeptech (por projeto), (3) Minha Pagina (personalizada por usuario).", "Alta"],
      ["T4.9", "Template Deeptech", "Criar template de projeto Deeptech (clone-ready) com: fases predefinidas, tipos de trabalho, campos personalizados, quadro Kanban padrao, dashboard padrao.", "Alta"],
      ["T4.10", "Validacao completa", "Criar projeto teste a partir do template. Atribuir membros com diferentes perfis RBAC. Testar CRUD completo. Validar isolamento de permissoes.", "Critica"],
    ],
    "OpenProject completamente configurado como plataforma de gestao, com tipos de trabalho, campos, permissoes, quadros Kanban, dashboards e templates prontos para uso imediato pela equipe da incubadora.",
    [
      "CRUD completo de projetos, pacotes de trabalho e tarefas",
      "Permissoes RBAC isoladas entre perfis (Admin, Gestor, Leader, Membro)",
      "Quadros Kanban funcionando com WIP limits",
      "Dashboards exibindo dados reais e atualizados",
      "Template Deeptech permite criar novo projeto com um clique",
      "Notificacoes por email funcionando via SMTP",
    ],
    "Product Owner + Business Analyst",
    [
      "O Product Owner deve definir os KPIs e campos personalizados com a equipe da incubadora",
      "Testar cada perfil RBAC com usuarios reais antes da fase de validacao",
      "Documentar o processo de onboarding de novos projetos deeptech",
      "Configurar notificacoes personalizadas por tipo de evento"
    ]
  ));

  // ──── 9. FASE 5: CONFIGURACAO MATTERMOST ────
  children.push(...buildPhaseSection(
    "9", "Fase 5: Configuracao Mattermost", "Sprint 6 | Semana 11-12",
    "Sprint 6 (Semana 11-12)",
    "Configurar o Mattermost Team Edition como plataforma de comunicacao e colaboracao da incubadora, com integracao bidirecional com o OpenProject via webhooks, bots de notificacao e comandos personalizados.",
    [
      ["T5.1", "Configurar admin + SMTP", "Acessar System Console. Configurar Site URL, SMTP, idioma padrao (pt-BR), timezone. Habilitar features de equipe e canais.", "Critica"],
      ["T5.2", "Criar time Incubadora", "Criar time principal Incubadora. Configurar como time aberto (qualquer membro pode entrar). Definir nome e descricao do time.", "Critica"],
      ["T5.3", "Criar canais publicos", "Criar canais: #geral (comunicacao geral), #anuncios (avisos oficiais), #suporte (suporte tecnico), #projetos (discussao de projetos), #deeptech (discussoes tecnicas).", "Alta"],
      ["T5.4", "Configurar permissoes", "Definir 3 niveis: System Admin (acesso total), Team Admin (gestao do time), Member (participacao). Configurar permissões de canal (publico/privado).", "Critica"],
      ["T5.5", "Integracao OpenProject-Mattermost", "Configurar webhooks: (1) OpenProject notifica Mattermost ao criar/tarefa, (2) Mattermost envia updates para OpenProject. Configurar incoming/outgoing webhooks.", "Critica"],
      ["T5.6", "Slash commands", "Criar comandos personalizados: /projeto [nome] (busca projeto no OpenProject), /minhas-tarefas (lista tarefas atribuidas), /status [fase] (status das fases).", "Media"],
      ["T5.7", "Bot de notificacao", "Configurar bot de notificacao: alertas de prazos proximos, tasks atribuidas, mudancas de status. Bot com avatar e nome personalizados.", "Alta"],
      ["T5.8", "Temas e branding", "Configurar tema customizado com cores da incubadora. Upload de logo. Configurar sidebar personalizada. Definir mensagem de boas-vindas.", "Baixa"],
      ["T5.9", "Validacao da integracao", "Enviar mensagem de teste no canal #geral. Verificar notificacao do webhook no OpenProject. Testar slash commands. Confirmar bot respondendo.", "Critica"],
    ],
    "Mattermost completamente configurado e integrado com OpenProject, com canais organizados, webhooks bidirecionais funcionando, bot de notificacao ativo e branding personalizado.",
    [
      "Mensagens entregues entre usuarios sem atraso perceptivel",
      "Webhook OpenProject para Mattermost disparando ao criar work package",
      "Webhook Mattermost para OpenProject atualizando tickets",
      "Slash commands respondendo corretamente",
      "Bot de notificacao ativo e enviando alertas de prazos",
      "Canais publicos acessiveis a todos os membros do time",
    ],
    "Backend + Product Owner",
    [
      "Testar webhook de ida e volta (roundtrip) entre as plataformas",
      "O bot deve ter nome e avatar profissional (nao padrao)",
      "Documentar todos os slash commands disponiveis para os usuarios",
      "Configurar rate limiting nos webhooks para evitar spam"
    ]
  ));

  // ──── 10. FASE 6: PLUGINS E INTEGRACOES ────
  children.push(...buildPhaseSection(
    "10", "Fase 6: Plugins e Integracoes", "Sprint 7-8 | Semana 13-16",
    "Sprint 7-8 (Semana 13-16)",
    "Desenvolver e integrar plugins personalizados para o OpenProject e Mattermost, configurar o armazenamento de objetos via OCI Object Storage (S3-compatible), e implementar pipelines completas de CI/CD via GitHub Actions para deploy automatico, monitoramento, backup e manutencao da plataforma.",
    [
      ["T6.1", "Plugin OpenProject (custom actions)", "Desenvolver plugin Ruby para OpenProject com custom actions especificas para incubacao: botao de mudanca de TRL, painel de score ESG, integracao com dashboard de KPIs deeptech.", "Alta"],
      ["T6.2", "Plugin Mattermost (bot de KPIs)", "Desenvolver plugin Go para Mattermost: bot que responde com metricas dos projetos (total de projetos, por fase, KPIs consolidados, ranking deeptechs).", "Alta"],
      ["T6.3", "Integracao OCI Object Storage S3", "Configurar OCI Object Storage (10 GB gratuito). Endpoint S3-compatible. Configurar como backend para OpenProject attachments e Mattermost file storage.", "Media"],
      ["T6.4", "CI/CD GitHub Actions (deploy)", "Configurar workflow deploy.yml: trigger on push to main, terraform init/plan/apply, kubectl apply, health check validation, automatic rollback em falha.", "Critica"],
      ["T6.5", "Monitoring workflow", "Configurar workflow monitoring.yml: executar a cada 15 minutos, health checks (curl endpoints), validar pods Running, publicar resultados como commit status.", "Alta"],
      ["T6.6", "Backup workflow", "Configurar workflow backup.yml: executar diariamente as 02:00 UTC, backup PostgreSQL (pg_dump), backup dados OpenProject/Mattermost, upload para Object Storage.", "Critica"],
      ["T6.7", "Update-images workflow", "Configurar workflow update-images.yml: executar semanalmente, verificar novas versoes das imagens Docker (OpenProject, Mattermost, PostgreSQL), criar PR com changelog.", "Media"],
      ["T6.8", "Destroy workflow", "Configurar workflow destroy.yml: trigger manual (workflow_dispatch) com confirmacao obrigatoria, terraform destroy, cleanup de DNS records Cloudflare.", "Baixa"],
      ["T6.9", "Validacao CI/CD", "Testar pipeline completa: push para main → deploy automatico. Testar rollback simulando falha. Verificar backup diario. Validar update-images.", "Critica"],
    ],
    "Plugins personalizados instalados e funcionando, CI/CD operacional com deploy automatico, backup diario, monitoramento contínuo e workflows de manutencao programados.",
    [
      "Push to main → deploy automatico em < 10 minutos",
      "Backup diario executado as 02:00 UTC sem falhas",
      "Health checks rodando a cada 15 minutos",
      "Rollback automatico acionado em caso de falha de deploy",
      "Plugins OpenProject e Mattermost instalados e funcionais",
      "OCI Object Storage configurado para attachments e files",
    ],
    "Full Stack Dev",
    [
      "Os plugins devem ser desenvolvidos com testes unitarios",
      "CI/CD deve ter um ambiente de staging opcional antes do deploy de producao",
      "Documentar o processo de desenvolvimento e deploy de plugins",
      "Os workflows do GitHub Actions devem ter timeouts configurados para evitar execucoes infinitas"
    ]
  ));

  // ──── 11. FASE 7: TESTES E VALIDACAO ────
  children.push(...buildPhaseSection(
    "11", "Fase 7: Testes e Validacao", "Sprint 9 | Semana 17-18",
    "Sprint 9 (Semana 17-18)",
    "Executar testes comprehensivos para validar todos os aspectos da plataforma: performance sob carga, seguranca, integridade de backups, escalabilidade, disponibilidade continua e isolamento de permissoes. Esta fase e o ultimo gate antes do go-live.",
    [
      ["T7.1", "Teste de carga (50 usuarios)", "Simular 50 usuarios simultaneos no OpenProject (listar projetos, criar tarefas) e Mattermost (enviar mensagens, trocar canais). Medir tempos de resposta.", "Critica"],
      ["T7.2", "Teste de seguranca (OWASP)", "Executar verificacao de OWASP Top 10 basico: injection, broken auth, sensitive data exposure, XSS, broken access control, security misconfiguration.", "Critica"],
      ["T7.3", "Teste backup/restore", "Executar backup completo. Simular disaster: deletar dados. Executar restore. Validar integridade total dos dados restaurados.", "Critica"],
      ["T7.4", "Teste de escalabilidade", "Stress test progressivo: 10, 25, 50, 75 usuarios simultaneos. Identificar ponto de degradacao. Documentar limites da plataforma.", "Alta"],
      ["T7.5", "Teste de disponibilidade", "Monitorar uptime continuo por 72 horas. Registrar qualquer indisponibilidade, tempo de resposta e incidentes. Meta: 99.5%+.", "Critica"],
      ["T7.6", "Validacao de permissoes", "Testar isolamento entre namespaces K3s (cross-namespace). Testar permissoes RBAC OpenProject (cross-project). Testar canais privados Mattermost.", "Alta"],
      ["T7.7", "Documentacao de testes", "Compilar relatorio completo de testes com: resultados, evidencias (screenshots/logs), bugs encontrados, severidade, status de remediacao.", "Critica"],
    ],
    "Todos os testes executados e documentados, com 0 bugs criticos e menos de 3 bugs de severidade media. Plataforma validada para producao.",
    [
      "Zero critical bugs encontrados",
      "Menos de 3 medium bugs (com remediacao planejada)",
      "Teste de carga: resposta media < 2s com 50 usuarios",
      "Teste de seguranca: zero vulnerabilidades criticas",
      "Backup/restore: 100% de integridade dos dados",
      "Uptime 72h: >= 99.5%",
      "Relatorio de testes completo e assinado pelo QA Lead",
    ],
    "QA + DevOps",
    [
      "Utilizar ferramentas profissionais: k6 ou JMeter para carga, OWASP ZAP para seguranca",
      "Os testes de carga devem simular cenarios reais de uso da incubadora",
      "Documentar tempo de execucao de cada teste e recursos consumidos",
      "Bugs criticos devem ser resolvidos antes do gate para Fase 8"
    ]
  ));

  // ──── 12. FASE 8: GO-LIVE E HANDOVER ────
  children.push(...buildPhaseSection(
    "12", "Fase 8: Go-Live e Handover", "Sprint 10 | Semana 19-20",
    "Sprint 10 (Semana 19-20)",
    "Executar o go-live da plataforma em producao, incluindo treinamento da equipe, documentacao operacional completa, configuracao final de alertas, corte de DNS para producao, monitoramento intensivo na primeira semana e transferencia formal da responsabilidade para o time de operacoes.",
    [
      ["T8.1", "Treinamento da equipe", "Preparar e executar treinamento para 10 usuarios: uso do OpenProject (gestao de projetos, Kanban, dashboards), uso do Mattermost (canais, slash commands, integracoes).", "Critica"],
      ["T8.2", "Documentacao operacional", "Criar runbook completo: procedimentos de operacao diaria, troubleshooting comum, procedimentos de escalation, contatos de emergencia, restart de servicos.", "Critica"],
      ["T8.3", "Configuracao alertas finais", "Revisar e ajustar todos os alertas OCI Monitoring. Configurar PagerDuty ou equivalente para alertas criticos. Definir thresholds finais.", "Alta"],
      ["T8.4", "Corte de DNS (go-live)", "Configurar Cloudflare para modo de producao: proxy habilitado, SSL Full Strict, cache rules. Confirmar propagacao DNS. Validar HTTPS.", "Critica"],
      ["T8.5", "Monitoramento intensivo", "Primeira semana pos go-live: monitoramento 24/7 (ou tao proximo quanto possivel). Check manual a cada 4h. Resposta rapida a incidentes.", "Critica"],
      ["T8.6", "Handover ao time de ops", "Transferencia formal: reuniao de handover, entrega de documentacao, apresentacao de credenciais, sessao de perguntas e respostas com time de operacoes.", "Critica"],
    ],
    "Plataforma completamente em producao, equipe treinada, documentacao entregue e time de operacoes assumindo a responsabilidade operacional com suporte do time de implementacao.",
    [
      "Todos os 10 usuarios conseguem acessar e usar ambas plataformas (OpenProject + Mattermost)",
      "Runbook completo entregue e revisado pelo time de operacoes",
      "Treinamento executado com avaliacao de satisfacao >= 8/10",
      "DNS cortado para producao com HTTPS validado",
      "Nenhum incidente critico nos primeiros 7 dias pos go-live",
      "Handover formalizado com assinatura de aceitacao",
    ],
    "Scrum Master + DevOps Lead",
    [
      "Preparar material de treinamento com cenarios praticos",
      "O runbook deve conter passo a passo para os 10 problemas mais comuns",
      "Configurar canal #incubadora-suporte no Mattermost para suporte pos go-live",
      "Agendar reunião de handover com pelo menos 5 dias de antecedencia"
    ]
  ));

  // ──── 13. MATRIZ RACI ────
  children.push(heading1("13. Matriz RACI"));
  children.push(bodyText(
    "A Matriz RACI (Responsible, Accountable, Consulted, Informed) define as responsabilidades de cada papel em cada fase do projeto. Esta matriz garante clareza na distribuicao de tarefas e evita ambiguidade na responsabilizacao."
  ));
  children.push(heading2("Legenda"));
  children.push(bulletItem("R (Responsible): Executa a tarefa diretamente"));
  children.push(bulletItem("A (Accountable): Aprova e e o dono final da decisao"));
  children.push(bulletItem("C (Consulted): Consultado antes da decisao/execucao"));
  children.push(bulletItem("I (Informed): Informado sobre o resultado apos a conclusao"));

  children.push(makeTable(
    ["Fase", "DevOps", "Backend", "Frontend", "PO", "QA", "SM"],
    [
      ["Fase 0: Preparacao", "R/A", "I", "I", "I", "I", "C"],
      ["Fase 1: Infra OCI", "R/A", "C", "I", "I", "I", "I"],
      ["Fase 2: Stack Apps", "R", "R", "I", "C", "I", "A"],
      ["Fase 3: Seguranca", "R", "C", "I", "I", "R", "A"],
      ["Fase 4: OpenProject", "C", "C", "I", "R/A", "C", "I"],
      ["Fase 5: Mattermost", "C", "R", "I", "R/A", "C", "I"],
      ["Fase 6: Plugins/CI-CD", "C", "R", "C", "C", "C", "A"],
      ["Fase 7: Testes", "R", "C", "C", "I", "R/A", "A"],
      ["Fase 8: Go-Live", "R", "C", "I", "C", "C", "R/A"],
    ],
    [20, 13, 13, 13, 13, 13, 13]
  ));
  children.push(pageBreak());

  // ──── 14. CRONOGRAMA ────
  children.push(heading1("14. Cronograma"));
  children.push(bodyText(
    "O cronograma abaixo apresenta a visao temporal completa do projeto, organizado por sprints, semanas, fases e entregaveis principais. Cada sprint segue o ciclo Scrum padrao de 2 semanas, com Planning no inicio, Review e Retrospective ao final."
  ));
  children.push(makeTable(
    ["Sprint", "Semana", "Fase", "Entregavel Principal", "Duracao"],
    [
      ["Sprint 1", "1-2", "Fase 0: Preparacao", "Ambiente validado, secrets OK", "2 semanas"],
      ["Sprint 2", "3-4", "Fase 1: Infra OCI", "VM provisionada, DNS OK", "2 semanas"],
      ["Sprint 3", "5-6", "Fase 2: Stack Apps", "OpenProject + Mattermost rodando", "2 semanas"],
      ["Sprint 4", "7-8", "Fase 3: Seguranca", "WAF + backups + pentest OK", "2 semanas"],
      ["Sprint 5", "9-10", "Fase 4: OpenProject", "OpenProject configurado (RBAC/Kanban)", "2 semanas"],
      ["Sprint 6", "11-12", "Fase 5: Mattermost", "Mattermost + webhooks + bot", "2 semanas"],
      ["Sprint 7", "13-14", "Fase 6: Plugins (A)", "Plugins desenvolvidos e testados", "2 semanas"],
      ["Sprint 8", "15-16", "Fase 6: CI/CD (B)", "CI/CD completo e operacional", "2 semanas"],
      ["Sprint 9", "17-18", "Fase 7: Testes", "Relatorio de testes, 0 critical", "2 semanas"],
      ["Sprint 10", "19-20", "Fase 8: Go-Live", "Plataforma em producao, handover", "2 semanas"],
    ],
    [12, 12, 28, 34, 14]
  ));

  children.push(heading2("14.1 Marcos do Projeto"));
  children.push(bulletItem("Marco 1 (Semana 2): Gate 0→1 aprovado — Ambiente tecnico pronto"));
  children.push(bulletItem("Marco 2 (Semana 4): Gate 1→2 aprovado — Infraestrutura OCI validada"));
  children.push(bulletItem("Marco 3 (Semana 6): Gate 2→3 aprovado — Stack de aplicacoes operacional"));
  children.push(bulletItem("Marco 4 (Semana 8): Gate 3→4 aprovado — Seguranca e observabilidade validadas"));
  children.push(bulletItem("Marco 5 (Semana 10): Gate 4→5 aprovado — OpenProject pronto para uso"));
  children.push(bulletItem("Marco 6 (Semana 12): Gate 5→6 aprovado — Mattermost integrado e operacional"));
  children.push(bulletItem("Marco 7 (Semana 16): Gate 6→7 aprovado — Plugins e CI/CD completos"));
  children.push(bulletItem("Marco 8 (Semana 18): Gate 7→8 aprovado — Todos os testes passando"));
  children.push(bulletItem("Marco 9 (Semana 20): GO-LIVE — Plataforma em producao"));
  children.push(pageBreak());

  // ──── 15. GESTAO DE RISCOS OPERACIONAIS ────
  children.push(heading1("15. Gestao de Riscos Operacionais"));
  children.push(bodyText(
    "A gestao de riscos operacionais e um componente critico deste plano. Cada risco identificado e avaliado quanto a probabilidade e impacto, com estrategias de mitigacao definidas e responsaveis designados. A matriz de riscos deve ser revisada a cada Sprint Retrospective."
  ));
  children.push(makeTable(
    ["Risco", "Probabilidade", "Impacto", "Mitigacao", "Responsavel", "Status"],
    [
      ["Cota A1 Flex indisponivel", "Media", "Critico", "Verificar cotas antes do inicio; avaliar regioes alternativas (SA-SAOPAULO-1, EU-FRANKFURT-1, US-ASHBURN-1)", "DevOps Lead", "Aberto"],
      ["OOM na VM (24 GB)", "Alta", "Alto", "Configurar resource limits por pod; monitorar RAM continuamente; configurar OOM killer graceful", "DevOps Lead", "Aberto"],
      ["Certa Let's Encrypt falhar", "Media", "Alto", "Usar DNS-01 challenge como fallback; monitorar expiracao dos certificados; configurar renewal automatico", "DevOps", "Aberto"],
      ["Perda de dados", "Baixa", "Critico", "Backups diarios com retention 7 dias; teste semanal de restore; Object Storage como backup offsite", "DevOps", "Aberto"],
      ["Time insuficiente", "Media", "Alto", "Planejamento realista com buffer de 10%; priorizacao por valor de negocio; escalation ao SM", "SM", "Aberto"],
      ["Falha de deploy", "Media", "Alto", "Rollback automatico no CI/CD; deploy gradual (canary); testes antes do merge", "Full Stack", "Aberto"],
      ["Instavel OCI Free Tier", "Baixa", "Critico", "Monitoramento 24/7; runbook de recovery; backup completo para migrate", "DevOps Lead", "Aberto"],
      ["Vulnerabilidade descoberta", "Media", "Alto", "Pipeline de update-images semanal; assinatura de security advisories; patch rapido", "DevOps", "Aberto"],
      ["Dependencia Cloudflare", "Baixa", "Media", "Configurar TTL baixo; ter DNS fallback manual; monitorar status Cloudflare", "DevOps", "Aberto"],
      ["Escalabilidade excedida", "Media", "Alto", "Stress test na Fase 7; otimizacao de queries PostgreSQL; caching agressivo com Memcached", "Backend", "Aberto"],
    ],
    [18, 12, 10, 35, 12, 13]
  ));
  children.push(pageBreak());

  // ──── 16. INDICADORES DE SUCESSO (KPIs) ────
  children.push(heading1("16. Indicadores de Sucesso (KPIs)"));
  children.push(bodyText(
    "Os Indicadores-Chave de Performance (KPIs) definidos abaixo servem como base para medir o sucesso da implementacao e a maturidade operacional da plataforma. Cada KPI possui uma meta clara, metrica associada e frequencia de verificacao."
  ));
  children.push(makeTable(
    ["KPI", "Meta", "Metrica", "Frequencia", "Origem"],
    [
      ["Uptime da plataforma", ">= 99.5%", "Prometheus ping + HTTP status 200", "Continuo (1 min)", "OCI Monitoring"],
      ["Tempo de deploy", "< 10 minutos", "GitHub Actions workflow duration", "Por deploy", "GitHub Actions"],
      ["Sucesso de backup", "100%", "CronJob completion status", "Diario (02:00 UTC)", "K3s CronJob"],
      ["Uso de CPU", "< 80% em media", "CPU utilization percent", "A cada 15 min", "OCI Monitoring"],
      ["Uso de RAM", "< 85% em media", "Memory utilization percent", "A cada 15 min", "OCI Monitoring"],
      ["Expiracao SSL", "> 30 dias", "cert-manager certificate expiry", "Semanal", "cert-manager"],
      ["Tempo de resposta HTTP", "< 2 segundos (p95)", "curl -w '%{time_total}' por endpoint", "A cada 15 min", "GitHub Actions"],
      ["Disco utilizado", "< 90%", "df -h /data percentage", "Diario", "K3s CronJob"],
      ["Pods saudáveis", "100%", "kubectl get pods (Running count)", "A cada 5 min", "OCI Monitoring"],
      ["Usuarios ativos/dia", ">= 80% da equipe", "Mattermost daily active users", "Diario", "Mattermost Analytics"],
      ["Work packages criados/semana", ">= 20", "OpenProject API query", "Semanal", "OpenProject"],
      ["Tempo de restore", "< 30 minutos", "restore.sh execution time", "Mensal (teste)", "Script restore.sh"],
    ],
    [20, 16, 28, 18, 18]
  ));

  children.push(heading2("16.1 Dashboards de Monitoramento"));
  children.push(bodyText(
    "Todos os KPIs acima serao visualizados em dashboards centralizados no OCI Monitoring Console e, opcionalmente, em um dashboard Grafana deployado no namespace incubadora-monitoring (se recursos permitirem). Os dashboards incluirao:"
  ));
  children.push(bulletItem("Dashboard de Infraestrutura: CPU, RAM, Disco, Rede, Pods status"));
  children.push(bulletItem("Dashboard de Aplicacoes: HTTP response codes, latencia, throughput por servico"));
  children.push(bulletItem("Dashboard de Seguranca: eventos UFW, tentativas fail2ban, WAF blocks"));
  children.push(bulletItem("Dashboard de Backups: status do ultimo backup, tempo de execucao, espaco utilizado"));
  children.push(bulletItem("Dashboard de Negocio: usuarios ativos, work packages por status, mensagens por dia"));

  children.push(heading2("16.2 Processo de Escalacao"));
  children.push(bodyText(
    "Quando um KPI ultrapassar o threshold definido, o processo de escalacao seguirá o fluxo: (1) Alerta automatico via OCI Monitoring para o DevOps Lead; (2) Se nao resolvido em 30 minutos, escalar para o Scrum Master; (3) Se nao resolvido em 2 horas, escalar para o Product Owner com impacto avaliado; (4) Incidente critico (plataforma down): comunicacao imediata a toda equipe via canal #incubadora-anuncios no Mattermost."
  ));

  return children;
}

// ═══════════════════════════════════════════════════════════════════
// BUILD BODY SECTION WRAPPER
// ═══════════════════════════════════════════════════════════════════
function buildBodySectionWrapper() {
  const children = buildBodySection();

  return {
    properties: {
      page: {
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        size: { width: 11906, height: 16838 },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 100 },
            border: { bottom: { color: rgb(P.table.innerLine), space: 4, style: BorderStyle.SINGLE, size: 4 } },
            children: [
              new TextRun({ text: "Plano de Implementacao \u2014 Plataforma Incubadora Cloud", font: FONT, size: 18, color: rgb(P.secondary), italics: true }),
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
            border: { top: { color: rgb(P.table.innerLine), space: 4, style: BorderStyle.SINGLE, size: 4 } },
            children: [
              new TextRun({ text: "Protocolo dTP \u2014 Documento 2 de 2 \u2014 Confidencial", font: FONT, size: 16, color: rgb(P.secondary) }),
              new TextRun({ text: "  |  Pagina ", font: FONT, size: 16, color: rgb(P.secondary) }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: rgb(P.secondary) }),
              new TextRun({ text: " de ", font: FONT, size: 16, color: rgb(P.secondary) }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: rgb(P.secondary) }),
            ],
          }),
        ],
      }),
    },
    children,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN: Generate document
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log("Gerando Plano de Implementacao...");

  const doc = new Document({
    creator: "Incubadora de Startups Deeptech",
    title: "Plano de Implementacao - Plataforma Incubadora Cloud",
    description: "Plano de implementacao PMO para deploy da Plataforma Incubadora Cloud (OpenProject + Mattermost) sobre Oracle Cloud Always Free",
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22, color: rgb(P.body) },
        },
      },
    },
    sections: [
      buildCoverSection(),
      buildTocSection(),
      buildBodySectionWrapper(),
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = "/home/z/my-project/download/Plano_Implementacao_Incubadora_Cloud.docx";

  // Ensure directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  // Count approximate words
  const stats = fs.statSync(outputPath);
  const fileSizeKB = (stats.size / 1024).toFixed(1);
  console.log(`Arquivo gerado: ${outputPath}`);
  console.log(`Tamanho: ${fileSizeKB} KB`);
  console.log(`Secoes: 3 (Cover + TOC + Body)`);
  console.log(`Capitulos: 16`);
  console.log(`Estimativa de paginas: 20+`);
}

main().catch((err) => {
  console.error("Erro ao gerar documento:", err);
  process.exit(1);
});
