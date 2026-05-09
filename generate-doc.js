const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, TableOfContents, SectionType, NumberFormat,
  TableLayoutType, LevelFormat, TabStopType, TabStopPosition,
} = require("docx");
const fs = require("fs");

// ═══════════════════════════════════════════════════════════
// PALETTE (GO-1 — Graphite Orange)
// ═══════════════════════════════════════════════════════════
const P = {
  bg: "1A2330", primary: "FFFFFF", accent: "D4875A",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "D4875A", headerText: "FFFFFF", accentLine: "D4875A", innerLine: "DDD0C8", surface: "F8F0EB" },
};

// ═══════════════════════════════════════════════════════════
// BORDERS & HELPERS
// ═══════════════════════════════════════════════════════════
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function emptyPara() {
  return new Paragraph({ spacing: { before: 0, after: 0 }, children: [] });
}

// ═══════════════════════════════════════════════════════════
// TABLE HELPERS
// ═══════════════════════════════════════════════════════════
function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text, bold: true, size: 21, color: P.table.headerText, font: { ascii: "Calibri" } })],
    })],
  });
}

function dataCell(text, width, shade = false) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: shade ? { type: ShadingType.CLEAR, fill: P.table.surface } : undefined,
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text, size: 21, color: "000000", font: { ascii: "Calibri" } })],
    })],
  });
}

function makeTable(headers, rows, colWidths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headers.map((h, i) => headerCell(h, colWidths[i])),
      }),
      ...rows.map((row, idx) =>
        new TableRow({
          cantSplit: true,
          children: row.map((cell, i) => dataCell(cell, colWidths[i], idx % 2 === 1)),
        })
      ),
    ],
  });
}

function tableTitle(text) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 21, color: "1A2330", font: { ascii: "Calibri" } })],
  });
}

// ═══════════════════════════════════════════════════════════
// PARAGRAPH HELPERS
// ═══════════════════════════════════════════════════════════
function bodyPara(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { before: 0, after: 120, line: 312 },
    children: [new TextRun({ text, size: 24, color: "000000", font: { ascii: "Calibri" } })],
  });
}

function bodyParaNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 0, after: 120, line: 312 },
    children: [new TextRun({ text, size: 24, color: "000000", font: { ascii: "Calibri" } })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: "1A2330", font: { ascii: "Calibri" } })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: "1A2330", font: { ascii: "Calibri" } })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 26, color: "2C3E50", font: { ascii: "Calibri" } })],
  });
}

function spacer(before = 200) {
  return new Paragraph({ spacing: { before }, children: [] });
}

// ═══════════════════════════════════════════════════════════
// CALC TITLE LAYOUT (mandatory for cover)
// ═══════════════════════════════════════════════════════════
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    const cpl = charsPerLine(minPt);
    lines = splitTitleLines(title, cpl);
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([...' ,.;:!?', ...'-_/ \t', ...'+&|()']);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

// ═══════════════════════════════════════════════════════════
// COVER R4 — Top Color Block
// ═══════════════════════════════════════════════════════════
function buildCoverR4(config) {
  const pal = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 26);
  const titleSize = titlePt * 2;

  const titleBlockHeight = titleLines.length * (titlePt * 23 + 200);
  const englishLabelH = config.englishLabel ? (9 * 23 + 500) : 0;
  const subtitleH = config.subtitle ? (12 * 23 + 200) : 0;
  const upperContentH = englishLabelH + titleBlockHeight + subtitleH;
  const UPPER_MIN = 7500;
  const UPPER_H = Math.max(UPPER_MIN, upperContentH + 1500 + 800);
  const DIVIDER_H = 60;

  const contentEstimate = englishLabelH + titleLines.length * (titlePt * 23 + 200) + subtitleH;
  const spacerIntrinsic = 280;
  const topSpacing = Math.max(UPPER_H - contentEstimate - spacerIntrinsic - 800, 400);

  const upperBlock = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: UPPER_H, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: pal.bg }, borders: noBorders,
        verticalAlign: "top",
        margins: { left: padL, right: padR },
        children: [
          new Paragraph({ spacing: { before: topSpacing } }),
          ...titleLines.map((line, i) => new Paragraph({
            spacing: { after: i < titleLines.length - 1 ? 100 : 200 },
            spacing: { line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
            children: [new TextRun({ text: line, size: titleSize, bold: true,
              color: pal.cover.titleColor, font: { ascii: "Calibri" } })],
          })),
          config.subtitle ? new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: config.subtitle, size: 24, color: pal.cover.subtitleColor,
              font: { ascii: "Calibri" } })],
          }) : null,
        ].filter(Boolean),
      })],
    })],
  });

  const divider = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: DIVIDER_H, rule: "exact" },
      children: [new TableCell({ borders: noBorders,
        shading: { type: ShadingType.CLEAR, fill: pal.accent }, children: [emptyPara()] })],
    })],
  });

  const lowerContent = [
    new Paragraph({ spacing: { before: 800 } }),
    ...(config.metaLines || []).map(line => new Paragraph({
      indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: line, size: 22, color: pal.cover.metaColor,
        font: { ascii: "Calibri" } })],
    })),
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      indent: { left: padL },
      children: [
        new TextRun({ text: config.footerLeft || "", size: 22, color: "909090", font: { ascii: "Calibri" } }),
        new TextRun({ text: "          " }),
        new TextRun({ text: config.footerRight || "", size: 22, color: "909090", font: { ascii: "Calibri" } }),
      ],
    }),
  ];

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: "FFFFFF" }, borders: noBorders,
        verticalAlign: "top",
        children: [upperBlock, divider, ...lowerContent],
      })],
    })],
  })];
}

// ═══════════════════════════════════════════════════════════
// BODY CONTENT
// ═══════════════════════════════════════════════════════════
function buildBody() {
  const children = [];

  // ── 1. Visao Geral do Projeto ──
  children.push(h1("1. Visao Geral do Projeto"));
  children.push(bodyPara(
    "A Incubadora IncubaScience e uma iniciativa estrategica dedicada ao fomento e a aceleracao de startups deeptech no ecossistema brasileiro de inovacao. Com foco em empresas de base tecnologica que operam em setores de alta complexidade — como biotecnologia, materiais avancados, inteligencia artificial e energia sustentavel — a incubadora tem como missao conectar pesquisadores, empreendedores e investidores em um ambiente colaborativo que favoreca a translacao de conhecimento cientifico para o mercado. A gestao eficiente dessas startups deeptech exige ferramentas robustas de gerenciamento de projetos e comunicacao, capazes de lidar com a complexidade inerente a projetos de longa maturacao e alto risco tecnologico."
  ));
  children.push(bodyPara(
    "Nesse contexto, a presente arquitetura de software define a implementacao de duas plataformas complementares: o OpenProject 15, para o gerenciamento estruturado de portfolios, projetos, tarefas e indicadores de desempenho; e o Mattermost Team Edition, para a comunicacao em tempo real entre equipes multidisciplinares. A combinacao dessas duas ferramentas oferece uma solucao integrada de colaboracao que atende as demandas especificas de incubadoras de empresas deeptech, permitindo o rastreamento de milestones, a gestao de recursos compartilhados e a comunicacao fluida entre mentores, gestores e fundadores das startups incubadas."
  ));
  children.push(bodyPara(
    "A visao estrategica do projeto contempla a implantacao de toda a infraestrutura na Oracle Cloud Always Free Tier, maximizando a utilizacao de recursos de nuvem sem custos operacionais mensais. Essa decisao alinha-se a realidade de incubadoras e startups em estagio inicial, onde a otimizacao de custos e critica. A arquitetura proposta explora os limites da camada gratuita da Oracle Cloud, combinando servicos de computacao, rede, armazenamento, banco de dados, seguranca e observabilidade em uma solucao coesa e escalavel. O objetivo e demonstrar que e possivel operar uma plataforma de gestao e colaboracao de nivel profissional inteiramente dentro dos limites do plano gratuito, sem comprometer a disponibilidade, a seguranca ou a performance do sistema."
  ));

  // ── 2. Objetivos e Escopo ──
  children.push(h1("2. Objetivos e Escopo"));

  children.push(h2("2.1 Objetivos Estrategicos"));
  children.push(bodyPara(
    "Os objetivos estrategicos do projeto IncubaScience estao diretamente alinhados com as necessidades de gestao de portfolios de startups deeptech. O primeiro objetivo e implementar uma plataforma unificada de gerenciamento de projetos baseada no OpenProject 15, configurada com workpackages personalizados para acompanhar o nivel de maturidade tecnologica (TRL), o nivel de maturidade de fabricacao (MRL), metricas ESG e indicadores de desempenho (KPIs) especificos para cada startup incubada. Essa plataforma deve permitir a visibilidade consolidada do portfolio de startups, facilitando a tomada de decisao por parte da gestao da incubadora e dos investidores envolvidos."
  ));
  children.push(bodyPara(
    "O segundo objetivo e disponibilizar um canal de comunicacao segura e organizada por meio do Mattermost Team Edition, integrado ao OpenProject via webhooks e autenticacao compartilhada (OpenID Connect). A comunicacao entre equipes de startups, mentores e gestores deve ser estruturada em canais tematicos e governanca clara, com plugins de produtividade que integram ferramentas como GitHub, Jira e Zoom diretamente na plataforma de mensageria. O terceiro objetivo e garantir que toda a infraestrutura seja operada na Oracle Cloud Always Free Tier, com provisionamento automatizado via Terraform, containerizacao em K3s e monitoramento nativo da OCI, demonstrando viabilidade tecnica e financeira da solucao."
  ));

  children.push(h2("2.2 Escopo da Solucao"));
  children.push(bodyPara(
    "O escopo da solucao abrange o ciclo completo de implantacao e operacao das plataformas OpenProject 15 e Mattermost Team Edition em uma infraestrutura de nuvem gratuita. Inclui o provisionamento de infraestrutura como codigo (IaC) utilizando Terraform para criar e gerenciar todos os recursos na Oracle Cloud Infrastructure (OCI), como instancias de computacao, redes virtuais (VCN), sub-redes, listas de seguranca, balanceadores de carga e vaults de secrets. A solucao tambem contempla a configuracao de DNS e CDN via Cloudflare, com certificacao SSL/TLS automatica utilizando o desafio DNS-01 do Let's Encrypt, garantindo acesso seguro por HTTPS."
  ));
  children.push(bodyPara(
    "Alem da infraestrutura base, o escopo inclui a orquestracao de conteineres utilizando K3s ( Kubernetes leve) em uma unica instancia de computacao A1 Flex, com quatro namespaces isolados para separar os componentes de infraestrutura, OpenProject, Mattermost e backup. A estrategia de backup contempla dumps diarios do PostgreSQL, snapshots de volumes e armazenamento de longo prazo no OCI Object Storage (compativel com S3), com politica de retencao de 30 dias. A observabilidade do sistema e garantida pelo OCI Monitoring (com alarmes para CPU, RAM, disco, HTTP e rede), OCI Logging centralizado e notificacoes via email e webhooks."
  ));

  children.push(h2("2.3 Premissas e Restricoes"));
  children.push(bodyPara(
    "As premissas fundamentais deste projeto incluem: (a) a utilizacao exclusiva da Oracle Cloud Always Free Tier como plataforma de hospedagem, sem upgrade para camadas pagas; (b) a disponibilidade de um dominio registrado para configuracao de DNS via Cloudflare; (c) a existencia de conhecimento tecnico basico em Linux, Docker, Kubernetes e Terraform por parte da equipe de operacoes; (d) o uso de uma unica instancia A1 Flex com 4 OCPUs e 24 GB de RAM como nodo principal de computacao; e (e) a expectativa de atendimento inicial a 10 usuarios simultaneos, com possibilidade de escalabilidade futura ate 50 usuarios com otimizacoes."
  ));
  children.push(bodyPara(
    "As restricoes principais sao: o limite de 4 OCPUs e 24 GB de RAM da A1 Flex, que define o teto de recursos disponiveis para todos os servicos; a ausencia de SLA formal na Always Free Tier, que pode resultar em instabilidade ocasional; o limite de 200 GB de Block Storage e 20 GB de Object Storage, que restringe o volume de dados armazenados; a limitacao de 10 Mbps no Flexible Load Balancer gratuito; e a necessidade de gerenciar manualmente patches de seguranca e atualizacoes do sistema operacional e dos conteineres. Alem disso, a comunicacao entre componentes ocorre em uma unica maquina virtual, o que elimina a latencia de rede mas cria um ponto unico de falha que deve ser mitigado com estrategias de backup e monitoramento."
  ));

  // ── 3. Arquitetura de Referencia ──
  children.push(h1("3. Arquitetura de Referencia"));

  children.push(h2("3.1 Visao Arquitetural Geral"));
  children.push(bodyPara(
    "A arquitetura de referencia do projeto IncubaScience e projetada como uma solucao monolitica conteinerizada, executada em uma unica instancia de computacao Oracle A1 Flex com 4 OCPUs e 24 GB de RAM. Essa instancia executa K3s (um distribuicao Kubernetes leve que consome aproximadamente 640 MB de RAM) como runtime de orquestracao de conteineres, substituindo a abordagem tradicional de Docker Compose por uma solucao que oferece rolling updates, auto-healing, NetworkPolicies e isolamento por namespaces. A escolha do K3s sobre Docker Compose reflete a necessidade de isolamento robusto entre os servicos, rollback automatizado e gestao declarativa de configuracoes."
  ));
  children.push(bodyPara(
    "A arquitetura e dividida em quatro namespaces K3s que refletem os dominios funcionais do sistema: incubadora-infra (componentes compartilhados como Traefik Ingress Controller, cert-manager e Prometheus), incubadora-openproject (web server Puma, background workers, memcached e PostgreSQL dedicado), incubadora-mattermost (servidor Mattermost e PostgreSQL dedicado) e incubadora-backup (CronJobs de backup e ferramentas de restauracao). Cada namespace possui suas proprias NetworkPolicies que implementam o principio de menor privilegio, permitindo comunicacao apenas entre componentes que efetivamente necessitam interagir."
  ));
  children.push(bodyPara(
    "O trafego externo chega a instancia A1 Flex atraves da Oracle Cloud VCN, passando pelo Internet Gateway e Security Lists configuradas para permitir apenas as portas essenciais (80/443 para HTTP/HTTPS, 22 para SSH via bastiao E2 Micro). Dentro da instancia, o Traefik atua como Ingress Controller, roteando requisicoes com base em host headers para os servicos correspondentes nos namespaces do OpenProject e Mattermost. O cert-manager gerencia automaticamente os certificados TLS utilizando o provedor DNS-01 do Cloudflare, eliminando a necessidade de exposicao de portas adicionais para validacao de certificacao."
  ));

  children.push(h2("3.2 Diagrama de Componentes"));
  children.push(bodyPara(
    "O diagrama de componentes da solucao pode ser descrito em camadas hierarquicas. Na camada de infraestrutura cloud, temos a VCN Oracle Cloud com Internet Gateway, Route Tables, Security Lists e um par de sub-redes (publica para o bastiao E2 Micro e privada para a A1 Flex). Na camada de computacao, a instancia A1 Flex executa o K3s com seus componentes de sistema (kubelet, containerd, Traefik como Ingress, CoreDNS para resolucao de nomes internos e cert-manager para gestao de certificados). Na camada de aplicacao, dois clusters de conteineres operam isoladamente: o cluster OpenProject (composto pelo web server Puma, background workers para processamento assincrono, memcached para cache de sessao e banco PostgreSQL dedicado) e o cluster Mattermost (composto pelo servidor principal e banco PostgreSQL dedicado)."
  ));
  children.push(bodyPara(
    "Na camada de integracao externa, o Cloudflare atua como CDN e proxy reverso, fornecendo caching estatico, protecao DDoS basica, terminacao TLS na edge e resolucao DNS. As requisicoes dos usuarios fluzem pela sequencia: usuario final, DNS Cloudflare, edge Cloudflare (TLS terminacao e caching), OCI VCN (Internet Gateway e Security Lists), K3s Traefik Ingress, servico de destino (OpenProject ou Mattermost). Essa arquitetura de multiplas camadas garante que cada ponto de entrada esteja protegido por controles de seguranca especificos, implementando uma estrategia de defesa em profundidade adequada ao perfil de risco de uma incubadora de startups."
  ));

  children.push(h2("3.3 Diagrama de Rede"));
  children.push(bodyPara(
    "A arquitetura de rede e implementada dentro de uma Virtual Cloud Network (VCN) na Oracle Cloud, com bloco CIDR 10.0.0.0/16. A VCN e subdividida em duas sub-redes: a sub-rede publica (10.0.1.0/24) que hospeda a instancia bastiao E2 Micro utilizada para acesso SSH seguro, e a sub-rede privada (10.0.2.0/24) que hospeda a instancia A1 Flex com todos os servicos da aplicacao. O Internet Gateway permite comunicacao de saida para a internet a partir da sub-rede privada (necessaria para atualizacoes de sistema, downloads de imagens e notificacoes webhook) enquanto bloqueia todo trafego de entrada que nao passe pelo Cloudflare."
  ));
  children.push(bodyPara(
    "As Security Lists sao configuradas com regras de ingresso e egresso restritivas. Na sub-rede publica, apenas as portas 22 (SSH restrito a IPs da equipe de operacoes) e 80/443 (HTTP/HTTPS) sao permitidas. Na sub-rede privada, apenas a porta 22 e permitida a partir da sub-rede publica (para SSH via bastiao) e as portas 80/443 sao permitidas para o Cloudflare IP ranges. As Route Tables direcionam todo trafego de saida para o Internet Gateway via NAT Gateway, garantindo que a instancia privada nao possua endereco IP publico proprio. Essa arquitetura de rede implementa o principio de defesa em profundidade, com multiplas camadas de filtragem que protegem os servicos de aplicacao contra acessos nao autorizados."
  ));

  children.push(h2("3.4 Diagrama de Deployment"));
  children.push(bodyPara(
    "A visao de deployment logico-fisico do projeto demonstra como todos os componentes sao alocados fisicamente em uma unica regiao Oracle Cloud (escolhida entre as disponiveis com Always Free Tier). A instancia A1 Flex (shape VM.Standard.A1.Flex) e configurada com 4 OCPUs e 24 GB de RAM, executando Ubuntu 22.04 LTS como sistema operacional de base. Sobre esse SO, o K3s e instalado em modo single-node, criando um cluster Kubernetes completo com overhead minimo. Os conteineres de aplicacao sao implantados utilizando manifestos Kubernetes gerenciados pelo Kustomize, com Helm Charts para componentes de infraestrutura (Traefik e cert-manager)."
  ));
  children.push(bodyPara(
    "A instancia E2 Micro (bastiao) e implantada na sub-rede publica com SSH restrito, servindo como unico ponto de entrada para operacoes administrativas. Toda a configuracao de infraestrutura e versionada em repositorio Git, com provisionamento automatizado via Terraform que cria a VCN, sub-redes, Security Lists, Internet Gateway, NAT Gateway, instancias de computacao, OCI Vault, OCI Monitoring alarms e OCI Logging groups. O deployment da aplicacao e realizado via scripts que aplicam os manifestos K3s na sequencia correta: namespaces, componentes de infraestrutura (Traefik, cert-manager), bancos de dados, OpenProject e Mattermost. A distribuicao de recursos estimada e: K3s system (~640 MB), PostgreSQL OpenProject (~1,5 GB), PostgreSQL Mattermost (~1 GB), OpenProject (~2,5 GB), Mattermost (~1 GB), memcached (~512 MB), sistema operacional e buffers (~5 GB), totalizando aproximadamente 12,2 GB dos 24 GB disponiveis."
  ));

  // ── 4. Catalogo de Servicos Oracle Always Free ──
  children.push(h1("4. Catalogo de Servicos Oracle Always Free"));
  children.push(bodyPara(
    "A Oracle Cloud oferece um conjunto abrangente de servicos na camada Always Free, que inclui recursos de computacao, rede, armazenamento, banco de dados, seguranca, observabilidade e servicos auxiliares. A tabela a seguir detalha todos os servicos relevantes para o projeto IncubaScience, incluindo os limites gratuitos, o uso planejado no projeto e o status atual de utilizacao. Essa analise criteriosa permite maximizar a utilizacao dos recursos gratuitos disponiveis, garantindo que a solucao permaneca viavel financeiramente enquanto atende aos requisitos funcionais e nao funcionais da incubadora."
  ));

  children.push(tableTitle("Tabela 1: Catalogo de Servicos Oracle Always Free"));
  children.push(makeTable(
    ["Servico", "Limite Always Free", "Uso no Projeto", "Status"],
    [
      ["Compute A1 Flex", "4 OCPU / 24 GB RAM", "VM principal (K3s + OpenProject + Mattermost)", "Ativo"],
      ["Compute E2 Micro", "1 instancia", "Bastiao SSH para acesso administrativo", "Ativo"],
      ["VCN", "2 VCNs", "Rede principal com sub-redes publica e privada", "Ativo"],
      ["Flexible Load Balancer", "10 Mbps", "Balanceamento HTTP/HTTPS entre conteineres", "Ativo"],
      ["Site-to-Site VPN", "2 conexoes", "VPN opcional para integracao com redes corporativas", "Planejado"],
      ["OCI Vault", "150 secrets", "Armazenamento de credenciais, chaves API e certificados", "Ativo"],
      ["WAF", "10M req/mes", "Protecao contra ataques web na edge Cloudflare + OCI WAF", "Ativo"],
      ["Certificates", "Sem limite declarado", "Certificados TLS gerenciados pelo cert-manager", "Ativo"],
      ["Vulnerability Scanning", "Host scanning", "Scanner periodico de vulnerabilidades nas VMs", "Ativo"],
      ["Autonomous DB", "2 instancias (20 GB cada)", "Backup complementar e analytics de dados", "Planejado"],
      ["NoSQL Database", "25 GB tables / 50 GB storage", "Cache distribuido e sessoes de usuario", "Planejado"],
      ["MySQL HeatWave", "1 instancia (1 OCPU/1 GB)", "Database complementar para relatorios", "Planejado"],
      ["OCI Monitoring", "500M datapoints/mes", "Metricas de CPU, RAM, Disco, HTTP e Rede", "Ativo"],
      ["OCI Logging", "10 GB/mes", "Logs centralizados de K3s, OpenProject e Mattermost", "Ativo"],
      ["Notifications", "1M HTTPS/mes", "Alertas para incidentes e notificacoes de saude", "Ativo"],
      ["APM", "Dados limitados", "Distributed tracing para apps conteinerizadas", "Planejado"],
      ["Block Storage", "200 GB total", "Volumes para dados do K3s, PostgreSQL e uploads", "Ativo"],
      ["Object Storage", "20 GB total", "Backup de longa duracao e assets estaticos", "Ativo"],
      ["Email Delivery", "3.000 emails/mes", "Notificacoes por email da incubadora", "Ativo"],
      ["Functions", "2M invocations/mes", "Automatizacoes serverless e webhooks customizados", "Planejado"],
      ["OKE Basic Cluster", "1 cluster gratuito", "Migracao futura do K3s para OKE gerenciado", "Futuro"],
    ],
    [28, 25, 32, 15]
  ));

  children.push(h2("4.1 Compute"));
  children.push(bodyPara(
    "Os recursos de computacao constituem o pilar central da arquitetura, sendo a instancia A1 Flex o componente mais critico de toda a solucao. O shape VM.Standard.A1.Flex na Always Free Tier oferece ate 4 OCPUs baseadas em processadores Ampere Altra (ARM) e 24 GB de RAM, proporcionando capacidade suficiente para executar todos os servicos da aplicacao conteinerizada. A instancia E2 Micro, embora mais modesta em recursos (1 OCPU/1 GB RAM), desempenha um papel fundamental como bastiao de acesso SSH, eliminando a exposicao direta da instancia principal a internet e implementando uma camada adicional de seguranca conforme as melhores praticas de arquitetura cloud."
  ));
  children.push(bodyPara(
    "A escolha da instancia A1 Flex com processadores ARM requer atencao especial a compatibilidade de software. Todas as imagens de conteineres devem ser compiladas para a arquitetura ARM64, o que e nativamente suportado tanto pelo OpenProject quanto pelo Mattermost. O K3s tambem possui binarios nativos para ARM, garantindo performance otima sem a penalidade de emulacao. O consumo de recursos e monitorado continuamente pelo OCI Monitoring, com alarmes configurados para 80% de utilizacao de CPU e 85% de utilizacao de RAM, permitindo acoes proativas antes que o esgotamento de recursos afete a disponibilidade dos servicos."
  ));

  children.push(h2("4.2 Network"));
  children.push(bodyPara(
    "Os recursos de rede na Always Free Tier incluem ate 2 VCNs, cada uma com capacidade de ate 16 sub-redes, alem de um Flexible Load Balancer com throughput de 10 Mbps. A VCN configurada no projeto utiliza bloco CIDR 10.0.0.0/16 e e subdividida em duas sub-redes: uma publica para o bastiao e uma privada para a instancia principal. O Internet Gateway permite saida para a internet, enquanto o NAT Gateway (tambem gratuito na Always Free) possibilita que instancias na sub-rede privada acessem recursos externos sem IP publico proprio. O Flexible Load Balancer pode ser utilizado como alternativa ou complemento ao Traefik para distribuicao de carga HTTP/HTTPS, embora no cenario atual de single-node o Traefik seja suficiente."
  ));
  children.push(bodyPara(
    "O Site-to-Site VPN gratuito permite, no futuro, a integracao segura entre a rede da incubadora e redes corporativas de parceiros ou universidades. Com duas conexoes gratuitas disponiveis, e possivel estabelecer links criptografados IPSec que permitam acesso controlado aos recursos da incubadora a partir de redes externas. Os Security Groups e Network Security Groups complementam as Security Lists na protecao granular do trafego entre componentes, e o DNS privado da VCN facilita a resolucao de nomes internos sem dependencia de servidores DNS externos."
  ));

  children.push(h2("4.3 Storage"));
  children.push(bodyPara(
    "O armazenamento na Always Free Tier e composto por 200 GB de Block Storage e 20 GB de Object Storage. O Block Storage e utilizado para os volumes persistentes do K3s, incluindo os dados do PostgreSQL do OpenProject (estimativa de 50 GB), PostgreSQL do Mattermost (estimativa de 30 GB), uploads de arquivos e anexos (estimativa de 20 GB), logs persistentes e backups locais (estimativa de 30 GB), reservando os 70 GB restantes para crescimento futuro e snapshots. A StorageClass local-path do K3s e configurada para provisionar automaticamente volumes a partir do Block Storage quando PVCs sao criados."
  ));
  children.push(bodyPara(
    "O Object Storage, com limite de 20 GB, e utilizado como destino de backup de longa duracao, seguindo o padrao S3 para compatibilidade. Os backups diarios do PostgreSQL (compressoes com gzip) e snapshots de volumes sao armazenados em buckets organizados por data, com politica de retencao de 30 dias que aplica exclusao automatica de backups antigos. O Object Storage tambem serve como repositorio para assets estaticos que podem ser servidos diretamente pelo Cloudflare CDN, reduzindo a carga na instancia principal e melhorando o tempo de resposta para conteudo estatico."
  ));

  children.push(h2("4.4 Database"));
  children.push(bodyPara(
    "A Always Free Tier oferece recursos surpreendentemente generosos para banco de dados, incluindo duas instancias de Autonomous Database (20 GB cada), uma instancia de MySQL HeatWave (1 OCPU/1 GB), e servicos NoSQL com 25 GB de tables e 50 GB de storage. No entanto, a arquitetura atual opta por executar PostgreSQL nativo dentro dos conteineres K3s, proporcionando maior controle sobre configuracoes, extensoes e processo de backup. As instancias Autonomous DB sao planejadas para uso futuro como banco de dados analitico complementar, onde consultas complexas sobre dados historicos do portfolio podem ser executadas sem impactar a performance do banco transacional principal."
  ));
  children.push(bodyPara(
    "O MySQL HeatWave pode ser utilizado para relatorios operacionais e dashboards que demandam processamento analitico em tempo real, enquanto o NoSQL Database oferece uma alternativa para cenarios que exigem modelo de dados flexivel, como cache distribuido de sessoes ou armazenamento de metadados de projetos. A estrategia de dados atual prioriza a simplicidade e o controle operacional, com PostgreSQL conteinerizado gerenciado pelo K3s e backups automatizados para o OCI Object Storage. A medida que o portfolio de startups cresca, a migracao de cargas analiticas para o Autonomous DB pode ser realizada sem interrupcao dos servicos transacionais."
  ));

  children.push(h2("4.5 Security"));
  children.push(bodyPara(
    "Os servicos de seguranca na Always Free Tier incluem o OCI Vault (com suporte a HSM-backed para 150 secrets), WAF (com limite de 10 milhoes de requisicoes por mes), gerenciamento de certificados, Vulnerability Scanning e IAM com politicas granulares. O OCI Vault e o componente central da estrategia de gestao de secrets, armazenando credenciais de banco de dados, chaves API do Cloudflare, tokens de integracao e certificados TLS com protecao por hardware security module. Os secrets sao injetados nos conteineres K3s como variaveis de ambiente via External Secrets Operator, eliminando a necessidade de arquivos .env em disco."
  ));
  children.push(bodyPara(
    "O OCI WAF complementa a protecao oferecida pelo Cloudflare, aplicando regras de seguranca adicionais especificas para vulnerabilidades OWASP Top 10. O Vulnerability Scanning realiza analises periodicas nas instancias de computacao, identificando configuracoes inseguras, portas abertas desnecessariamente e vulnerabilidades conhecidas nos pacotes do sistema operacional. O gerenciamento de certificados via OCI Certificates permite a emissao e renovacao automatica de certificados TLS, integrando-se ao cert-manager no K3s para uma gestao de ciclo de vida completa dos certificados."
  ));

  children.push(h2("4.6 Observabilidade"));
  children.push(bodyPara(
    "A pilha de observabilidade na Always Free Tier e formada pelo OCI Monitoring (500 milhoes de datapoints por mes), OCI Logging (10 GB por mes), OCI Notifications (1 milhoes de notificacoes HTTPS por mes) e APM (Application Performance Monitoring). O OCI Monitoring coleta metricas de infraestrutura (CPU, RAM, disco, rede) e metricas customizadas de aplicacao, com alarmes configurados para cinco indicadores criticos: utilizacao de CPU acima de 80%, utilizacao de RAM acima de 85%, utilizacao de disco acima de 90%, tempo de resposta HTTP acima de 5 segundos e perda de pacotes de rede. Cada alarme dispara notificacoes via OCI Notifications para canais de email e webhooks configurados."
  ));
  children.push(bodyPara(
    "O OCI Logging centraliza logs de todas as fontes, incluindo logs do sistema operacional, logs do K3s, logs de aplicacao do OpenProject e Mattermost, e logs de acesso do Traefik. Com 10 GB mensais, e possivel manter aproximadamente 30 dias de logs detalhados antes da rotacao automatica. O APM fornece distributed tracing para aplicacoes conteinerizadas, permitindo identificar gargalos de performance e latencia entre microservicos. As notificacoes via HTTPS permitem a integracao com o Mattermost e com GitHub Issues, criando um fluxo automatizado de alertas que notifica a equipe de operacoes em tempo real."
  ));

  children.push(h2("4.7 Email e Functions"));
  children.push(bodyPara(
    "O servico de Email Delivery na Always Free Tier permite o envio de ate 3.000 emails por mes, utilizado para notificacoes transacionais da incubadora como alertas de sistema, relatorios semanais de progresso e notificacoes de backup. O servido suporta DKIM, SPF e DMARC para garantir a entregabilidade e reputacao do remetente, sendo configurado como origem autorizada nos registros DNS do dominio. As estatisticas de envio e entregabilidade sao monitoradas pelo OCI Logging e OCI Monitoring, com alarmes para taxas de bounce acima de 5%."
  ));
  children.push(bodyPara(
    "O OCI Functions oferece 2 milhoes de invocacoes por mes na camada gratuita, sendo utilizado para automatizacoes serverless que complementam a infraestrutura conteinerizada. Casos de uso incluem processamento de webhooks customizados, limpeza periodica de dados temporarios, validacao de backups e execucao de scripts de health check. As funcoes sao escritas em Python ou Node.js e podem ser invocadas por eventos do OCI (como alarmes do Monitoring), por chamadas HTTP ou por agendamento temporal, oferecendo uma camada de automacao leve e sem custo operacional."
  ));

  // ── 5. Arquitetura de Containers — K3s Single-Node ──
  children.push(h1("5. Arquitetura de Containers: K3s Single-Node"));

  children.push(h2("5.1 Visao Geral do K3s"));
  children.push(bodyPara(
    "O K3s foi selecionado como runtime de orquestracao de conteineres em substituicao ao Docker Compose aps uma analise detalhada de trade-offs. Enquanto o Docker Compose consome aproximadamente 150 MB de RAM para o daemon Docker, o K3s consome cerca de 640 MB de RAM para todo o stack do Kubernetes (kubelet, containerd, Traefik, CoreDNS), um overhead significativo mas justificado pelos beneficios oferecidos. O principal argumento para a escolha do K3s e a capacidade de realizar rolling updates sem downtime: ao atualizar um conteiner, o K3s cria a nova versao, verifica sua saude via liveness probe e só entao remove a versao anterior, eliminando interrupcoes de servico durante implantacoes."
  ));
  children.push(bodyPara(
    "Alem dos rolling updates, o K3s oferece auto-healing automatico: se um conteiner falhar, o kubelet reinicia-o imediatamente conforme a politica de restart configurada. As NetworkPolicies permitem definir regras de firewall declarativas no nivel de pod, implementando isolamento por namespace que seria complexo de gerenciar com Docker Compose. O sistema de secrets nativo do Kubernetes, combinado com o External Secrets Operator que sincroniza secrets do OCI Vault, oferece uma gestao de credenciais mais robusta que arquivos .env. O Kustomize, integrado ao kubectl, permite gerenciar variantes de configuracao (dev, staging, prod) de forma declarativa e versionada, facilitando a manutencao e evolucao da infraestrutura."
  ));

  children.push(h2("5.2 Arquitetura de Namespaces"));
  children.push(bodyPara(
    "A arquitetura de namespaces do K3s e composta por quatro namespaces dedicados, cada um com proposito e politicas de acesso especificos. O namespace incubadora-infra hospeda os componentes compartilhados de infraestrutura, incluindo o Traefik Ingress Controller (que roteia requisicoes HTTP/HTTPS para os servicos de aplicacao), o cert-manager (que gerencia certificacao TLS automatica), e metricas de monitoramento. Esse namespace e gerenciado exclusivamente pela equipe de operacoes e seus recursos sao compartilhados por todos os demais namespaces via referencia de service names."
  ));
  children.push(bodyPara(
    "O namespace incubadora-openproject contem todos os componentes do OpenProject 15: o web server Puma (escutando na porta 8080), background workers para processamento de tarefas assincronas como envio de notificacoes e geracao de relatorios, o memcached para cache de sessoes e consultas frequentes, e uma instancia dedicada de PostgreSQL para persistencia de dados. O namespace incubadora-mattermost segue estrutura semelhante, hospedando o servidor Mattermost e sua instancia PostgreSQL dedicada. O isolamento de bancos de dados por namespace garante que falhas no banco de um servico nao afetem o outro. O namespace incubadora-backup concentra os CronJobs de backup agendados, scripts de restauracao e ferramentas de validacao de integridade, operando com acessos de leitura aos dados dos demais namespaces."
  ));

  children.push(h2("5.3 Network Policies"));
  children.push(bodyPara(
    "A estrategia de Network Policies implementa o modelo de default deny: por padrao, todo trafego entre pods e bloqueado, e apenas as comunicacoes explicitamente permitidas sao autorizadas. Essa abordagem segue o principio do menor privilegio e garante que um eventual comprometimento de um pod nao permita a movimentacao lateral nao autorizada para outros componentes. As regras sao organizadas em tres categorias: regras de DNS (permitindo trafego UDP na porta 53 para o CoreDNS a partir de todos os pods), regras de ingress por namespace (controlando quais pods podem receber conexoes de entrada e de quais origens) e regras de egress (controlando quais destinos externos cada pod pode acessar)."
  ));
  children.push(bodyPara(
    "As regras cross-namespace sao minimas e especificas. O Traefik (namespace incubadora-infra) precisa acessar as portas 8080 do OpenProject e 8065 do Mattermost. O CronJob de backup (namespace incubadora-backup) precisa acessar a porta 5432 dos PostgreSQLs no OpenProject e Mattermost. O OpenProject precisa acessar seu PostgreSQL na porta 5432 e o memcached na porta 11211. O Mattermost precisa acessar seu PostgreSQL na porta 5432. Todos os pods que necessitam de saida para internet (para download de imagens, atualizacoes ou envio de webhooks) possuem regras de egress permitindo o trafego necessario. Essa segmentacao garante isolamento efetivo mesmo dentro de uma unica instancia de computacao."
  ));

  children.push(h2("5.4 Ingress e TLS"));
  children.push(bodyPara(
    "O roteamento de trafego para os conteineres e gerenciado pelo Traefik v2, que atua como Ingress Controller do K3s. O Traefik e instalado como Helm Chart com valores personalizados que configuram os entrypoints HTTP (porta 80) e HTTPS (porta 443), alem de redirecionamento automatico de HTTP para HTTPS. Os Ingress Resources definem as regras de roteamento baseadas em host headers: o host do OpenProject direciona o trafego para o service openproject-web no namespace incubadora-openproject na porta 8080, enquanto o host do Mattermost direciona para o service mattermost-server no namespace incubadora-mattermost na porta 8065."
  ));
  children.push(bodyPara(
    "A gestao de certificacao TLS e automatizada pelo cert-manager, configurado com o provedor DNS-01 do Cloudflare. Quando um novo Ingress com annotation de TLS e criado, o cert-manager solicita um certificado ao Let's Encrypt, cria um registro TXT no DNS do Cloudflare via API para validar a propriedade do dominio e, apos a confirmacao, armazena o certificado como um recurso TLS Secret no namespace correspondente. O cert-manager monitora a validade dos certificados e os renova automaticamente 30 dias antes da expiracao. O desafio DNS-01 foi escolhido em detrimento do HTTP-01 porque nao requer exposicao de portas adicionais e funciona mesmo quando o servico esta atras de um proxy como o Cloudflare."
  ));

  children.push(h2("5.5 PVCs e Storage"));
  children.push(bodyPara(
    "O provisionamento de volumes persistentes utiliza a StorageClass local-path, que e a StorageClass padrao do K3s e provisiona volumes a partir do filesystem local do nodo. Cada componente que requer persistencia de dados possui um PersistentVolumeClaim (PVC) dedicado com tamanho definido conforme as necessidades estimadas. O PostgreSQL do OpenProject possui PVC de 50 GB (crescimento estimado de 2 GB/mes), o PostgreSQL do Mattermost possui PVC de 30 GB (crescimento estimado de 1 GB/mes), os uploads e anexos do OpenProject possuem PVC de 20 GB, os dados de arquivo do Mattermost possuem PVC de 10 GB, e o backup local possui PVC de 30 GB. O total de PVCs consome aproximadamente 140 GB dos 200 GB disponiveis em Block Storage."
  ));
  children.push(bodyPara(
    "A StorageClass local-path oferece boa performance uma vez que os acessos sao diretos ao disco local sem overhead de rede. Os PVCs sao provisionados no diretorio /var/lib/rancher/k3s/storage/ do nodo, com subdiretorios nomeados pelo nome do PVC. Para garantir a integridade dos dados em caso de falha do disco, os backups periodicos copiam os dados criticos para o OCI Object Storage (S3-compatible), que proporciona redundancia geografica. A estrategia de expansao de PVCs segue o modelo de provisionamento superdimensionado, onde cada PVC e criado com capacidade superior a necessidade imediata, evitando a complexidade de redimensionamento em runtime que pode causar indisponibilidade temporaria."
  ));

  children.push(h2("5.6 Orquestracao"));
  children.push(bodyPara(
    "A orquestracao dos manifestos Kubernetes e gerenciada pelo Kustomize, que permite a composicao e transformacao declarativa de recursos YAML. O arquivo kustomization.yaml raiz define a ordem de aplicacao dos recursos e os overlays para diferentes ambientes. A sequencia de deployment segue uma ordem deterministica que respeita as dependencias entre componentes: primeiro os namespaces (isolamento logico), depois os componentes de infraestrutura (Traefik, cert-manager, CoreDNS), seguidos pelos bancos de dados (PostgreSQL do OpenProject e Mattermost), os servicos de cache (memcached), as aplicacoes (OpenProject e Mattermost) e, por fim, os CronJobs de backup."
  ));
  children.push(bodyPara(
    "Cada componente possui seu proprio arquivo de manifestos Kubernetes, organizado em diretorios por dominio funcional. A aplicacao completa e realizada com o comando kubectl apply -k . (com Kustomize embutido), que processa todos os recursos na ordem correta, aplica as transformacoes configuradas e verifica a integridade dos manifestos antes da aplicacao. O processo de atualizacao segue o fluxo de git push para o repositorio de configuracao, seguido pela execucao do comando de apply no servidor, que realiza rolling updates automaticos. A rollabilidade (capacidade de reverter rapidamente) e garantida pelo versionamento de todos os manifestos no Git, permitindo retorno a qualquer versao anterior com um simples rollback."
  ));

  // ── 6. OpenProject 15 — Configuracao e Plugins ──
  children.push(h1("6. OpenProject 15: Configuracao e Plugins"));

  children.push(h2("6.1 Arquitetura e Componentes"));
  children.push(bodyPara(
    "O OpenProject 15 e executado como um conjunto de conteineres dentro do namespace incubadora-openproject, seguindo a arquitetura de microservicos da aplicacao. O componente principal e o web server Puma, que processa requisicoes HTTP na porta 8080 e serve a interface web do OpenProject. Os background workers (multiplos processos Sidekiq) operam de forma assincrona, processando tarefas como envio de notificacoes por email, geracao de relatorios PDF, exportacao de dados, sincronizacao com sistemas externos e processamento de webhooks. O memcached opera como camada de cache para sessoes de usuario e resultados de consultas frequentes ao banco de dados, reduzindo a latencia percebida e a carga no PostgreSQL."
  ));
  children.push(bodyPara(
    "O PostgreSQL dedicado ao OpenProject armazena todos os dados transacionais, incluindo projetos, work packages, usuarios, permissoes, historico de alteracoes e anexos de arquivos. A conexao entre o Puma, workers e PostgreSQL e gerenciada por variaveis de ambiente injetadas via External Secrets Operator, com credenciais armazenadas de forma segura no OCI Vault. O health check do OpenProject e realizado tanto pelo K3s (liveness probe na rota /api/v3/status) quanto pelo OCI Monitoring (HTTP check periodico), garantindo visibilidade dupla da disponibilidade do servico. A configuracao do OpenProject e realizada por meio de variaveis de ambiente e um arquivo de configuracao customizado montado como ConfigMap."
  ));

  children.push(h2("6.2 Plugins Recomendados"));
  children.push(bodyPara(
    "O OpenProject 15 suporta uma ampla gama de plugins que estendem sua funcionalidade nativa para atender demandas especificas de gestao de portfolios de incubadoras deeptech. A tabela a seguir apresenta os plugins recomendados para o projeto IncubaScience, selecionados com base na relevancia para o contexto de gestao de startups deeptech e na compatibilidade com a versao 15 do OpenProject."
  ));
  children.push(tableTitle("Tabela 2: Plugins Recomendados para o OpenProject 15"));
  children.push(makeTable(
    ["Plugin", "Tipo", "Finalidade", "Licenca"],
    [
      ["BIM Cost Reporter", "Modulo", "Relatorios de custo integrados ao BIM para projetos de construcao", "Comercial"],
      ["LDAP/Active Directory", "Autenticacao", "Integracao com diretórios corporativos existentes", "Open Source"],
      ["OpenID Connect", "Autenticacao", "SSO via OIDC (integracao com IdP corporativo ou Keycloak)", "Open Source"],
      ["SAML", "Autenticacao", "Autenticacao federada via SAML 2.0", "Comercial"],
      ["GitHub Integration", "Integracao", "Sincronizacao de issues, PRs e commits com work packages", "Open Source"],
      ["Jira Integration", "Integracao", "Importacao e sincronizacao bidirecional com projetos Jira", "Open Source"],
      ["Two-Factor Auth", "Seguranca", "Autenticacao de dois fatores via TOTP para usuarios", "Open Source"],
      ["Custom Styles", "Personalizacao", "Customizacao de CSS e temas visuais do OpenProject", "Open Source"],
      ["Storyboard", "Gestao", "Quadros Kanban e visualizacao storyboard de tarefas", "Comercial"],
      ["Team Planner", "Gestao", "Planejamento visual de capacidade da equipe", "Comercial"],
      ["Backlogs", "Agile", "Gestao de backlogs com sprints e story points", "Open Source"],
    ],
    [25, 18, 40, 17]
  ));

  children.push(h2("6.3 Campos Personalizados"));
  children.push(bodyPara(
    "A gestao de startups deeptech exige campos de metadados especificos que nao estao disponiveis nativamente no OpenProject. Para atender essa demanda, foram definidos campos personalizados (custom fields) que permitem o rastreamento de indicadores criticos de cada startup incubada. O campo TRL (Technology Readiness Level) e configurado como uma lista de selecao com valores de 1 a 9, representando o nivel de maturidade tecnologica conforme a escala NASA adaptada. O campo MRL (Manufacturing Readiness Level) segue estrutura semelhante, com valores de 1 a 10, rastreando a preparacao para producao."
  ));
  children.push(bodyPara(
    "O campo ESG e configurado como uma lista multipla selecao com dimensoes (Ambiental, Social, Governanca) e subdimensoes detalhadas (mudanca climatica, biodiversidade, diversidade, etica, transparencia), permitindo a categorizacao do impacto ESG de cada startup. O campo Fase da Deeptech classifica a startup em estagios como Pesquisa Basica, Prova de Conceito, Prototipo, MVP, Validacao de Mercado e Escala. O campo Tipo de Atividade categoriza as tarefas em Pesquisa, Desenvolvimento, Teste, Regulatorio, Comercial e Administrativo. Os campos ODS (Objetivos de Desenvolvimento Sustentavel da ONU) e KPIs (indicadores customizaveis por startup) completam o conjunto de metadados, enquanto o campo Ranking permite a classificacao comparativa entre startups do portfolio para fins de priorizacao de investimentos."
  ));

  children.push(h2("6.4 Workflows e RBAC"));
  children.push(bodyPara(
    "O sistema de controle de acesso baseado em funcoes (RBAC) do OpenProject e configurado com cinco perfis especificos para a incubadora IncubaScience. O perfil Admin_Incubadora possui acesso total a todos os projetos, configuracoes do sistema, gerenciamento de usuarios e relatorios executivos do portfolio. O perfil Gestor_Portfolio tem acesso de gerenciamento a todos os projetos do portfolio, podendo criar projetos, definir milestones e gerar relatorios consolidados, mas sem acesso a configuracoes tecnicas do sistema. O perfil Lider_Deeptech tem acesso completo ao projeto de sua startup, incluindo criacao de work packages, gestao de equipe e configuracao de metadados, mas sem visibilidade de outros projetos do portfolio."
  ));
  children.push(bodyPara(
    "O perfil Membro_Deeptech tem acesso limitado ao projeto de sua startup, podendo visualizar e atualizar work packages atribuidos a si, fazer upload de documentos e comentar em tarefas. O perfil Visualizador_Deeptech tem acesso somente leitura ao projeto, util para investidores, mentores externos e parceiros que necessitam de visibilidade sem capacidade de modificacao. Os workflows definem os estados possiveis dos work packages (Novo, Em Andamento, Em Revisao, Concluido, Cancelado) e as transicoes validas entre eles, com regras automaticas que notificam os responsaveis quando um work package muda de estado ou quando deadlines sao aproximados."
  ));

  children.push(h2("6.5 Dashboards e Relatorios"));
  children.push(bodyPara(
    "Os dashboards do OpenProject sao configurados em dois niveis hierarquicos: o dashboard do portfolio e o dashboard por startup deeptech. O dashboard do portfolio exibe uma visao consolidada de todas as startups incubadas, com widgets para quantidade de projetos por fase, distribuição de TRL, indicadores ESG agregados, cronograma de milestones do portfolio, ranking de startups por performance e alertas de risco. Esse dashboard e acessivel apenas aos perfis Admin_Incubadora e Gestor_Portfolio, e e atualizado automaticamente com base nos dados dos work packages."
  ));
  children.push(bodyPara(
    "O dashboard por startup deeptech oferece uma visao detalhada de cada empresa incubada, incluindo timeline de atividades, burndown chart de work packages, evolucao do TRL ao longo do tempo, KPIs especificos da startup, documentos anexados e historico de interacoes com mentores. Os relatorios sao gerados automaticamente pelo OpenProject em formato PDF e incluem: relatorio semanal de progresso (resumo das atividades realizadas e pendencias), relatorio mensal do portfolio (visao consolidada de todas as startups), relatorio trimestral de TRL (evolucao do nivel de maturidade tecnologica) e relatorio anual de impacto (metricas de ESG, investimentos captados e patents depositadas)."
  ));

  // ── 7. Mattermost Team Edition — Configuracao e Plugins ──
  children.push(h1("7. Mattermost Team Edition: Configuracao e Plugins"));

  children.push(h2("7.1 Arquitetura e Componentes"));
  children.push(bodyPara(
    "O Mattermost Team Edition opera como plataforma de comunicacao em tempo real dentro do namespace incubadora-mattermost. A arquitetura segue o modelo de servidor monolitico, com o binario do Mattermost executando como um unico conteiner que processa tanto a interface web quanto as APIs RESTful. O servidor escuta na porta 8065 dentro do pod e e exposto externamente via Ingress do Traefik. O banco de dados PostgreSQL dedicado armazena mensagens, canais, usuarios, configuracoes e metadados de arquivos. Os uploads de arquivos sao armazenados inicialmente no filesystem do pod (volume persistente) e podem ser migrados para o OCI Object Storage para ganho de escala."
  ));
  children.push(bodyPara(
    "A configuracao do Mattermost e realizada por meio de um arquivo config.json montado como ConfigMap no pod, contendo definicoes de servidor SMTP (utilizando o OCI Email Delivery), configurações de rate limiting, politica de retencao de mensagens (90 dias por padrao), limites de upload de arquivos (50 MB) e integrações com sistemas externos via webhooks. O Mattermost suporta notificacoes push para dispositivos moveis, desktop apps para Windows, macOS e Linux, e a interface web responsiva acessada diretamente pelo navegador. O health check e realizado via endpoint /api/v4/config, monitorado tanto pelo K3s quanto pelo OCI Monitoring."
  ));

  children.push(h2("7.2 Plugins Recomendados"));
  children.push(bodyPara(
    "Os plugins do Mattermost estendem a funcionalidade da plataforma de mensageria, integrando ferramentas de produtividade e desenvolvimento diretamente nos canais de comunicacao. A tabela a seguir apresenta os plugins recomendados para o contexto da incubadora IncubaScience."
  ));
  children.push(tableTitle("Tabela 3: Plugins Recomendados para o Mattermost"));
  children.push(makeTable(
    ["Plugin", "Finalidade", "Status"],
    [
      ["GitHub", "Notificacoes de commits, PRs, issues e reviews nos canais", "Recomendado"],
      ["Jira", "Atualizacoes de tickets Jira nos canais do projeto", "Recomendado"],
      ["GitLab", "Integracao com repositorios GitLab (CI/CD, issues, merge requests)", "Opcional"],
      ["Zoom", "Agendamento e participacao de videoconferencias via comandos", "Recomendado"],
      ["Google Drive", "Compartilhamento e preview de documentos do Google Drive", "Recomendado"],
      ["Custom Emoji", "Upload de emojis personalizados para a cultura da incubadora", "Recomendado"],
      ["Polls", "Criacao de enquetes e votacoes diretamente nos canais", "Recomendado"],
      ["Draw.io", "Criacao e edicao de diagramas colaborativos", "Opcional"],
      ["Tasks", "Gestao de tarefas pessoais com lembretes e listas de verificacao", "Recomendado"],
      ["Webhooks", "Integracao customizada com sistemas externos via incoming/outgoing", "Essencial"],
      ["Mattermost AI", "Assistente de IA para resumo de conversas, traducao e insights", "Opcional"],
    ],
    [25, 55, 20]
  ));

  children.push(h2("7.3 Integracao com OpenProject"));
  children.push(bodyPara(
    "A integracao entre Mattermost e OpenProject e realizada em tres niveis: notificacoes por webhook, autenticacao compartilhada e cross-linking de recursos. O webhook de notificacao e configurado no OpenProject para enviar eventos relevantes (criacao de work packages, mudancas de status, mencoes, deadlines aproximados) para canais especificos do Mattermost via incoming webhook. Cada startup deeptech possui um canal dedicado no Mattermost onde sao recebidas as notificacoes de seu projeto no OpenProject, garantindo que a equipe seja informada em tempo real sobre alteracoes relevantes."
  ));
  children.push(bodyPara(
    "A autenticacao compartilhada e implementada via OpenID Connect (OIDC), utilizando o Mattermost como Identity Provider ou um IdP externo como o Keycloak. Quando configurado, o usuario faz login uma unica vez e e automaticamente autenticado em ambas as plataformas, com mapeamento automatico de perfis RBAC. O cross-linking permite que usuarios criem referencias bidirecionais entre mensagens do Mattermost e work packages do OpenProject, facilitando a rastreabilidade de discussoes e decisoes. Por exemplo, uma mensagem do Mattermost pode ser linkada a um work package do OpenProject, e vice-versa, proporcionando um contexto completo das interacoes."
  ));

  children.push(h2("7.4 Canais e Governanca"));
  children.push(bodyPara(
    "A estrutura de canais do Mattermost para a incubadora IncubaScience e organizada em tres categorias: canais publicos, canais privados e mensagens diretas. Os canais publicos incluem: incubadora-geral (comunicacoes gerais da incubadora), incubadora-eventos (eventos, workshops e palestras), incubadora-oportunidades (oportunidades de financiamento, parceiras e mentoria), e incubadora-announcements (anuncios oficiais da gestao). Cada startup deeptech possui seu proprio canal publico no formato startup-nome-da-empresa, onde sao compartilhadas atualizacoes gerais e convidados podem participar."
  ));
  children.push(bodyPara(
    "Os canais privados sao criados para comunicacoes confidenciais, incluindo: startup-nome-leadership (equipe de lideranca de cada startup), incubadora-gestao (equipe de gestao da incubadora), incubadora-financeiro (discussoes financeiras e contratuais) e incubadora-mentoria (comunicacao com mentores designados). A governanca estabelecida define regras claras para criacao de canais (requer aprovacao da gestao), uso de canais publicos vs. privados (informacoes confidenciais apenas em canais privados), retencao de mensagens (90 dias, conforme LGPD) e arquivo de canais inativos (canais sem atividade por 6 meses sao arquivados automaticamente)."
  ));

  // ── 8. DNS e CDN — Cloudflare Integration ──
  children.push(h1("8. DNS e CDN: Cloudflare Integration"));

  children.push(h2("8.1 Configuracao DNS via Terraform"));
  children.push(bodyPara(
    "A configuracao DNS e gerenciada de forma declarativa utilizando o provider Cloudflare do Terraform. O arquivo de configuracao define o provedor Cloudflare com a API token de autenticacao (armazenada como secret no OCI Vault) e cria os registros DNS necessarios para a operacao da plataforma. O registro A principal aponta o dominio raiz para o endereco IP da instancia A1 Flex, enquanto registros CNAME sao criados para subdominios especificos do OpenProject e Mattermost. Um registro wildcard (*.dominio.com) tambem e configurado para capturar subdominios futuros sem necessidade de modificacao manual da zona DNS."
  ));
  children.push(bodyPara(
    "O Terraform gerencia o ciclo de vida completo dos registros DNS, garantindo que mudanças sejam aplicadas de forma controlada e rastreavel. O estado do Terraform e armazenado no OCI Object Storage com versionamento habilitado, permitindo rollback para qualquer estado anterior. A integracao CI/CD com GitHub Actions dispara automaticamente o terraform apply quando mudancas sao detectadas na branch principal do repositorio de infraestrutura. Essa automacao elimina erros humanos na configuracao DNS e garante consistencia entre ambientes, ao mesmo tempo em que mantem um historico auditavel de todas as alteracoes realizadas."
  ));

  children.push(h2("8.2 SSL/TLS Management"));
  children.push(bodyPara(
    "A estrategia de SSL/TLS opera em duas camadas complementares. Na primeira camada, a edge Cloudflare realiza a terminacao TLS, recebendo conexoes HTTPS dos usuarios e estabelecendo uma conexao segura ate o usuario final. O Cloudflare emite automaticamente um certificado TLS universal para o dominio, que e renovado de forma transparente pela plataforma. Na segunda camada, o cert-manager dentro do K3s emite certificados Let's Encrypt para os servicos internos, utilizando o desafio DNS-01 via API do Cloudflare. Essa abordagem de dupla camada garante criptografia end-to-end tanto na comunicacao externa (usuario-Cloudflare) quanto na interna (Cloudflare-servidor)."
  ));
  children.push(bodyPara(
    "O modo SSL/TLS do Cloudflare e configurado como Full (Strict), o que exige que o servidor de origem possua um certificado TLS valido (emitido pelo Let's Encrypt) e confiavel. Essa configuracao previne ataques man-in-the-middle entre a edge Cloudflare e o servidor de origem. O HTTP/2 e HTTP/3 (QUIC) sao habilitados automaticamente pelo Cloudflare, proporcionando melhorias significativas de performance para carregamento de paginas. A politica HSTS (HTTP Strict Transport Security) e configurada com max-age de 1 ano e includeSubDomains, forcando o uso de HTTPS em todas as submissoes futuras."
  ));

  children.push(h2("8.3 WAF e DDoS Protection"));
  children.push(bodyPara(
    "A protecao contra ataques e implementada em multiplas camadas. O Cloudflare oferece protecao DDoS basica na camada de rede (L3/L4) e na camada de aplicacao (L7) sem custo adicional, incluindo mitigacao automatica contra floods SYN, UDP e HTTP. O WAF gratuito do Cloudflare inclui um conjunto de regras gerenciadas que protegem contra as vulnerabilidades mais comuns do OWASP Top 10, como SQL Injection, Cross-Site Scripting (XSS), Remote Code Execution e Local File Inclusion. Essas regras sao atualizadas automaticamente pelo Cloudflare conforme novas ameacas sao identificadas."
  ));
  children.push(bodyPara(
    "Alem do WAF padrao, regras customizadas sao configuradas para o cenario especifico da incubadora, incluindo rate limiting por IP (100 requisicoes por segundo), bloqueio de IPs com reputacao ruim (conforme threat intelligence do Cloudflare), protecao contra brute force nos endpoints de login (bloqueio apos 5 tentativas falhas em 1 minuto) e geo-blocking para regioes fora do Brasil (opcional, dependendo da politica de acesso). O OCI WAF complementa a protecao do Cloudflare com inspecao mais profunda do trafego que chega a VCN, aplicando regras adicionais especificas para os padroes de trafego do OpenProject e Mattermost."
  ));

  children.push(h2("8.4 Cache CDN"));
  children.push(bodyPara(
    "O Cloudflare CDN realiza caching de conteudo estatico na edge, reduzindo significativamente a latencia percebida pelos usuarios e a carga na instancia de origem. As regras de caching sao configuradas para cachear ativos estaticos com longa validade (imagens, CSS, JavaScript, fontes — cache de 30 dias), conteudo semi-estatico com validade media (paginas HTML, documentos — cache de 1 hora) e conteudo dinamico sem cache (APIs, websockets, uploads). O Cloudflare suporta automaticamente compressao Brotli e Gzip, reduzindo o tamanho das respostas em ate 70% para conteudo textual. A funcionalidade Always HTTPS garante que todas as requisicoes sejam redirecionadas para HTTPS, independentemente de o usuario digitar http:// ou https:// no navegador."
  ));
  children.push(bodyPara(
    "A invalidacao de cache e realizada automaticamente pelo Cloudflare quando novos conteudos sao publicados, ou manualmente via API em casos de necessidade imediata. O Page Rules do Cloudflare permitem configuracoes especificas por URL, como desabilitar cache para rotas de API do OpenProject e Mattermost enquanto mantém caching agressivo para assets estaticos. O Argo Smart Routing (funcionalidade paga, nao utilizada) poderia otimizar ainda mais a rota de rede entre o usuario e a edge Cloudflare, mas na Always Free Tier o roteamento padrao ja oferece performance adequada para o cenario de 10 a 50 usuarios simultaneos."
  ));

  // ── 9. Storage e Backup ──
  children.push(h1("9. Storage e Backup: OCI Object Storage"));

  children.push(h2("9.1 OCI Object Storage"));
  children.push(bodyPara(
    "O OCI Object Storage oferece 20 GB de armazenamento gratuito compativel com a API S3 da Amazon, sendo utilizado como destino principal de backup de longa duracao e repositorio de assets estaticos. A compatibilidade com S3 permite a utilizacao de ferramentas padrao do ecossistema (aws-cli, s3cmd, rclone) sem adaptacoes, facilitando a integracao com scripts de backup existentes e com ferramentas de migracao. Os backups sao organizados em buckets com nomenclatura hierarquica: incubadora-backup-pg-openproject, incubadora-backup-pg-mattermost, incubadora-backup-volumes e incubadora-assets-estaticos."
  ));
  children.push(bodyPara(
    "A classe de armazenamento utilizada e a Standard (que e a unica disponivel na Always Free Tier), oferecendo durabilidade de 99.999999999% (11 noves) e disponibilidade de 99.95%. Os buckets sao configurados com versionamento habilitado para manter historico de versoes de cada arquivo, permitindo restauracao para qualquer versao anterior. A politica de ciclo de vida (Object Lifecycle Policy) aplica regras automaticas de expiracao: backups diarios sao excluidos apos 30 dias, logs compactados apos 90 dias e assets estaticos nao possuem expiracao. O acesso aos buckets e controlado por IAM policies que restringem o acesso apenas as instancias de computacao autorizadas e a equipe de operacoes."
  ));

  children.push(h2("9.2 Estrategia de Backup"));
  children.push(bodyPara(
    "A estrategia de backup segue o modelo 3-2-1 adaptado para a Always Free Tier: tres copias dos dados (producao, backup local no PVC de backup, backup remoto no Object Storage), dois tipos de midia (Block Storage local e Object Storage na nuvem) e uma copia off-site (Object Storage com redundancia geografica). Os backups sao executados por um CronJob K3s no namespace incubadora-backup, agendado para rodar diariamente as 02:00 da manha (horario de Brasilia), quando a utilizacao do sistema e minima. O processo de backup executa as seguintes etapas em sequencia: pg_dump do PostgreSQL do OpenProject (com compressao gzip), pg_dump do PostgreSQL do Mattermost, snapshot dos diretorios de uploads e anexos, e upload de todos os arquivos para o OCI Object Storage."
  ));
  children.push(bodyPara(
    "A integridade dos backups e verificada automaticamente apos cada execucao: o CronJob calcula o checksum SHA256 de cada arquivo e compara com o valor registrado no log de backup. Em caso de divergencia, um alerta e disparado via OCI Notifications para a equipe de operacoes. O tempo estimado de backup e de 15 a 30 minutos, dependendo do volume de dados, consumindo aproximadamente 5% dos recursos de CPU durante a operacao. Os logs de backup sao enviados ao OCI Logging para auditoria e incluem informacoes como tamanho dos arquivos, tempo de execucao, status de sucesso/falha e espaco utilizado no Object Storage."
  ));

  children.push(h2("9.3 Retention e Recovery"));
  children.push(bodyPara(
    "A politica de retencao de backups define que os backups diarios sao mantidos por 30 dias no OCI Object Storage, apos os quais sao excluidos automaticamente pela Object Lifecycle Policy. Esse periodo de retencao equilibra a necessidade de recuperacao de dados historicos com o limite de 20 GB do Object Storage. Com backups diarios de tamanho estimado entre 2 e 5 GB (comprimidos), a rotacao de 30 dias consume entre 60 e 150 GB, o que excede o limite de 20 GB. Para contornar essa limitacao, a estrategia adota retencao diferenciada: backups semanais completos sao mantidos por 4 semanas, backups diarios incrementais sao mantidos por 7 dias, e apenas o backup semanal mais recente e preservado a longo prazo."
  ));
  children.push(bodyPara(
    "O procedimento de restauracao e documentado e testado mensalmente durante o exercicio de disaster recovery. Para restauracao do PostgreSQL, o processo inclui: download do backup mais recente do Object Storage, descompressao do arquivo, parada do servico OpenProject ou Mattermost (conforme o banco a ser restaurado), execucao do pg_restore no banco de destino, e reinicio do servico com validacao de integridade. O RTO (Recovery Time Objective) estimado e de 30 a 60 minutos para restauracao completa do sistema, enquanto o RPO (Recovery Point Objective) e de ate 24 horas (considerando o intervalo entre backups diarios). Em cenarios de desastre total (perda da VM), o processo de reconstrucao completo — incluindo provisionamento de nova VM via Terraform, restauracao de backups e reconfiguracao — pode levar ate 4 horas."
  ));

  // ── 10. Seguranca ──
  children.push(h1("10. Seguranca"));

  children.push(h2("10.1 IAM e RBAC OCI"));
  children.push(bodyPara(
    "O gerenciamento de acesso na Oracle Cloud Infrastructure e implementado atraves do IAM (Identity and Access Management) com politicas granulares baseadas no princípio do menor privilegio. O grupo IncubadoraAdmins possui permissoes para gerenciar todos os recursos da infraestrutura, incluindo computacao, rede, armazenamento e seguranca. O grupo IncubadoraOperators possui permissoes limitadas a operacoes de dia a dia, como reinicio de instancias, visualizacao de logs e aplicacao de manifestos K3s, sem capacidade de modificar configuracoes de rede ou IAM policies. O grupo IncubadoraReadOnly possui acesso somente leitura a todos os recursos, utilizado por auditores e gestores que necessitam de visibilidade sem capacidade de modificacao."
  ));
  children.push(bodyPara(
    "As politicas IAM sao definidas em formato declarativo e aplicadas ao nivel do compartimento (compartment) da incubadora. Cada servico possui politicas especificas que limitam as acoes permitidas. Por exemplo, a politica do OCI Monitoring permite a criacao de alarmes e metricas, mas nao a exclusao de metricas existentes. A politica do OCI Vault permite leitura e escrita de secrets, mas nao a exclusao de vaults. A autenticacao multi-fator (MFA) e obrigatoria para todos os usuarios dos grupos Admins e Operators, sendo configurada via TOTP suportado pelos aplicativos Google Authenticator, Authy ou Microsoft Authenticator."
  ));

  children.push(h2("10.2 Network Security"));
  children.push(bodyPara(
    "A seguranca de rede e implementada em multiplas camadas, seguindo o modelo de defesa em profundidade. Na camada mais externa, o Cloudflare atua como proxy reverso e WAF, filtrando trafego malicioso antes que atinja a VCN Oracle Cloud. Na camada de VCN, as Security Lists definem regras de estado (stateful) que controlam o trafego de entrada e saida das sub-redes. As Security Lists sao complementadas por Network Security Groups (NSGs) que permitem regras mais granulares no nivel de instancia, aplicando-se diretamente as interfaces de rede (VNICs) das VMs. Dentro da instancia A1 Flex, as NetworkPolicies do K3s adicionam uma camada adicional de segmentacao no nivel de pod."
  ));
  children.push(bodyPara(
    "A combinacao dessas tres camadas garante que mesmo que uma camada seja comprometida, as camadas subsequentes ainda oferecam protecao. Por exemplo, se um pod do Mattermost for comprometido, as NetworkPolicies impedem que ele acesse pods do OpenProject ou componentes de infraestrutura. Se um ataque bypassar o Cloudflare, as Security Lists bloqueiam o trafego em portas nao autorizadas na VCN. Se um atacante obter acesso a sub-rede publica, as NSGs impedem a comunicacao lateral para a sub-rede privada sem passar pelo bastiao. Essa arquitetura de multiplas camadas e fundamental para a seguranca de um ambiente que opera com recursos limitados da Always Free Tier."
  ));

  children.push(h2("10.3 Secrets Management — OCI Vault (HSM-backed)"));
  children.push(bodyPara(
    "O OCI Vault e o componente central da estrategia de gestao de secrets, fornecendo armazenamento seguro para credenciais de banco de dados, chaves API, tokens de autenticacao e certificados. O Vault suporta criptografia com chaves protegidas por HSM (Hardware Security Module), garantindo que as chaves de criptografia nunca sejam expostas em texto claro, nem mesmo para os administradores do sistema. Os secrets sao organizados em vaults tematicos: incubadora-vault-db (credenciais de banco de dados), incubadora-vault-api (chaves API de integracoes externas), incubadora-vault-tls (certificados e chaves privadas) e incubadora-vault-app (configuracoes sensiveis das aplicacoes)."
  ));
  children.push(bodyPara(
    "A integracao entre o OCI Vault e o K3s e realizada pelo External Secrets Operator (ESO), que sincroniza secrets do Vault com Secrets nativos do Kubernetes de forma automatica e segura. Quando um pod e iniciado, o ESO verifica se ha secrets atualizados no Vault e os injeta como variaveis de ambiente ou volumes montados no pod. Esse fluxo elimina completamente a necessidade de arquivos .env em disco e de credenciais codificadas nos manifestos Kubernetes. O ciclo de rotacao de secrets e automatizado: credenciais de banco de dados sao rotacionadas mensalmente, chaves API trimestralmente, e tokens de autenticacao sao revogados e regenerados quando ha suspeita de comprometimento."
  ));

  children.push(h2("10.4 Vulnerability Scanning"));
  children.push(bodyPara(
    "O OCI Vulnerability Scanning realiza analises periodicas nas instancias de computacao, identificando vulnerabilidades conhecidas no sistema operacional, pacotes instalados e configuracoes inseguras. O scanner e configurado para executar varreduras semanais nas instancias A1 Flex e E2 Micro, com relatorios detalhados que incluem severidade (Critical, High, Medium, Low), descricao da vulnerabilidade, CWE (Common Weakness Enumeration), CVSS score e recomendacoes de remediacao. As vulnerabilidades Critical e High disparam alarmes imediatos via OCI Notifications, exigindo acao da equipe de operacoes em ate 24 horas."
  ));
  children.push(bodyPara(
    "Alem do scanner de nivel de host, os conteineres sao submetidos a analise de vulnerabilidades durante o processo de build. As imagens Docker do OpenProject e Mattermost sao verificadas contra bases de dados de vulnerabilidades (CVE) antes de serem implantadas. O Trivy (scanner de imagens de conteineres) e integrado ao pipeline de CI/CD para analise automatica a cada build, bloqueando a implantacao de imagens com vulnerabilidades Critical. Os manifestos K3s tambem sao verificados por ferramentas de lint (kubeval, conftest) que validam a conformidade das configuracoes com as melhores praticas de seguranca do Kubernetes."
  ));

  children.push(h2("10.5 TLS e Certificados"));
  children.push(bodyPara(
    "A gestao de certificacao TLS na plataforma opera em tres niveis. No primeiro nivel, o Cloudflare emite automaticamente um Universal SSL Certificate para o dominio, garantindo criptografia entre o usuario e a edge Cloudflare. No segundo nivel, o cert-manager no K3s emite certificados Let's Encrypt para os servicos internos, validando a propriedade do dominio via desafio DNS-01 no Cloudflare. No terceiro nivel, o OCI Certificates pode ser utilizado para emissao de certificados adicionais, como certificados de cliente para autenticacao mTLS entre servicos internos. A communications entre o Cloudflare e o servidor de origem utiliza TLS 1.3 com cipher suites modernas e seguras, configuradas tanto no Traefik quanto no Cloudflare."
  ));
  children.push(bodyPara(
    "A rotacao automatica de certificados e garantida pelo cert-manager, que monitora a validade dos certificados e inicia o processo de renovacao 30 dias antes da expiracao. O cert-manager utiliza a API do Cloudflare para criar registros DNS TXT de validacao, e apos a confirmacao do Let's Encrypt, atualiza o Secret TLS no namespace correspondente. O Traefik detecta automaticamente a mudanca no Secret e carrega o novo certificado sem necessidade de restart. Todo o ciclo de vida dos certificados e registrado nos logs do cert-manager e visivel no dashboard do OCI Monitoring, incluindo metricas como tempo ate expiracao, status de renovacao e falhas de emissao."
  ));

  // ── 11. Observabilidade ──
  children.push(h1("11. Observabilidade"));

  children.push(h2("11.1 Monitoring — OCI Native"));
  children.push(bodyPara(
    "O OCI Monitoring e configurado com cinco alarmes criticos que cobrem os principais indicadores de saude do sistema. O alarme de CPU dispara quando a utilizacao media do processador excede 80% durante 5 minutos consecutivos, indicando possivel sobrecarga dos conteineres ou processos de background. O alarme de RAM dispara quando a utilizacao de memoria excede 85%, alertando sobre risco de esgotamento que pode causar OOM (Out of Memory) kills e interrupcao de servicos. O alarme de disco dispara quando a utilizacao do Block Storage excede 90%, permitindo acao preventiva antes que o disco fique cheio e cause falhas de escrita no PostgreSQL."
  ));
  children.push(bodyPara(
    "O alarme de HTTP dispara quando o tempo de resposta medio das aplicacoes OpenProject e Mattermost excede 5 segundos durante 3 minutos consecutivos, indicando possiveis problemas de performance ou degradacao do servico. O alarme de rede dispara quando ha perda de pacotes superior a 1% ou latencia de rede superior a 100ms, sinalizando problemas de conectividade na VCN ou no Internet Gateway. Cada alarme e configurado com severidade (Critical ou Warning), destino de notificacao (email e webhook Mattermost) e mensagem de resolucao pre-definida que orienta a equipe de operacoes na investigacao e correcao do problema."
  ));

  children.push(h2("11.2 Logging — Centralizado"));
  children.push(bodyPara(
    "O OCI Logging centraliza logs de todas as fontes em um unico repositorio, facilitando a investigacao de incidentes e a analise de tendencias. Os logs do sistema operacional (coletados via OCI Logging Agent), logs do K3s (container logs via kubelet), logs de aplicacao do OpenProject e Mattermost (enviados via syslog ou filebeat), logs de acesso do Traefik (formato JSON) e logs de auditoria do OCI IAM sao consolidados no mesmo grupo de logs. Com o limite de 10 GB por mes, a estrategia de retencao prioriza logs de aplicacao e acesso (retencao de 30 dias) em detrimento de logs de debug detalhados (retencao de 7 dias)."
  ));
  children.push(bodyPara(
    "A estrutura de logs segue o formato padrao com campos obrigatorios: timestamp, level (INFO, WARN, ERROR, FATAL), service (openproject, mattermost, traefik, k3s), hostname, message e metadata (contexto adicional). Logs Analytics queries sao pre-definidas para os cenarios de investigacao mais comuns, como identificacao de erros 5xx por periodo, analise de latencia de requisicoes por endpoint, rastreamento de login falhados e correlacao de eventos entre servicos. As queries sao salvas como saved searches no OCI Logging Analytics, permitindo execucao rapida e compartilhamento entre membros da equipe de operacoes."
  ));

  children.push(h2("11.3 Alertas e Notificacoes"));
  children.push(bodyPara(
    "O sistema de alertas utiliza o OCI Notifications como backend de entrega, com tres canais de notificacao configurados: email para alertas Critical (enviado para a lista de operacoes da incubadora), webhook para o Mattermost (publicando mensagens automaticas no canal incubadora-ops com detalhes do alerta), e webhook para GitHub Issues (criando automaticamente um issue no repositorio de infraestrutura quando um alerta Critical e disparado). Cada notificacao inclui o nome do alarme, severidade, valor atual vs. limiar definido, timestamp de disparo e link direto para o dashboard do OCI Monitoring com contexto do incidente."
  ));
  children.push(bodyPara(
    "A escala de severidade dos alertas define o tempo de resposta esperado: Critical exige acao em ate 15 minutos, Warning em ate 1 hora e Info em ate 24 horas. Os alertas Critical disparam notificacoes em todos os canais simultaneamente (email, Mattermost, GitHub Issues), enquanto alertas Warning notificam apenas o canal Mattermost. A politica de supressao evita notificacoes duplicadas quando multiplos alarmes sao disparados pelo mesmo evento raiz (por exemplo, alto uso de CPU que tambem causa alta latencia HTTP). O dashboard de alertas consolidados no OCI Monitoring oferece uma visao em tempo real do status de todos os alarmes, facilitando a triagem e priorizacao pela equipe de operacoes."
  ));

  children.push(h2("11.4 APM"));
  children.push(bodyPara(
    "O OCI Application Performance Monitoring (APM) fornece distributed tracing para as aplicacoes conteinerizadas, permitindo a observacao de requisicoes completas enquanto atravessam multiplos servicos. No contexto do IncubaScience, o APM e utilizado para rastrear o fluxo de uma requisicao desde o Traefik ate o PostgreSQL, identificando gargalos de performance em cada etapa. Os traces coletados incluem tempo de processamento no web server Puma, tempo de consulta no PostgreSQL, tempo de serializacao de resposta e latencia de rede entre componentes. O APM tambem coleta span metrics que alimentam dashboards de performance com percentis de latencia (p50, p90, p99) por endpoint."
  ));
  children.push(bodyPara(
    "A integracao do APM com o OpenProject e realizada via instrumentacao automatica do Puma (Ruby), enquanto o Mattermost e instrumentado via OpenTelemetry SDK. Os spans customizados sao adicionados em pontos criticos do codigo, como operacoes de exportacao de relatorios, processamento de webhooks e sincronizacao de work packages. Os dashboards pre-configurados no APM incluem: top endpoints por latencia, erro rate por servico, distributed trace map (visualizacao grafica das dependencias entre servicos) e comparison view (comparacao de performance entre periodos). Os dados limitados do APM na Always Free Tier sao suficientes para a operacao com 10 a 50 usuarios, cobrindo aproximadamente 1 milhoes de spans por mes."
  ));

  children.push(h2("11.5 Health Checks Automatizados"));
  children.push(bodyPara(
    "Os health checks automatizados complementam o OCI Monitoring com verificacoes de saude especificas de aplicacao, executadas periodicamente por um workflow do GitHub Actions. O workflow agenda uma execucao a cada 5 minutos que verifica a disponibilidade dos endpoints criticos: /api/v3/status do OpenProject (verifica se o web server Puma esta respondendo e o PostgreSQL esta acessivel), /api/v4/config do Mattermost (verifica se o servidor esta funcional e o banco de dados esta conectado), e a resposta HTTPS dos dominios (verifica se o Cloudflare e o Traefik estao operando corretamente). Cada verificacao registra o resultado no OCI Logging e publica o status no canal incubadora-health do Mattermost."
  ));
  children.push(bodyPara(
    "Em caso de falha em qualquer endpoint, o workflow cria automaticamente um issue no GitHub com detalhes do incidente e notifica a equipe de operacoes via webhook. Os health checks tambem validam a integridade dos backups verificando se o backup mais recente no OCI Object Storage e anterior a 25 horas (indicando falha no backup diario). Um relatorio semanal de saude e gerado automaticamente, consolidando metricas de uptime, tempo medio de resposta, numero de incidentes e status dos backups, sendo publicado no canal incubadora-ops do Mattermost e arquivado no OCI Object Storage para referencia historica."
  ));

  // ── 12. Escalabilidade ──
  children.push(h1("12. Escalabilidade"));

  children.push(h2("12.1 Escala Atual: 10 Usuarios"));
  children.push(bodyPara(
    "Na escala atual de 10 usuarios simultaneos, a utilizacao de recursos da instancia A1 Flex e estimada em aproximadamente 40% de CPU, 55% de RAM e 25% de disco. O OpenProject, sendo a aplicacao mais intensiva em recursos, consome cerca de 2,5 GB de RAM para o web server e workers, mais 1,5 GB para o PostgreSQL. O Mattermost consome cerca de 1 GB de RAM para o servidor e 1 GB para o PostgreSQL. O K3s system consome 640 MB, o memcached 512 MB, e os demais componentes (cert-manager, exportadores de metricas, logging agent) consomem aproximadamente 500 MB adicionais. O total de 12,2 GB de RAM utilizados representa 51% dos 24 GB disponiveis, oferecendo margem confortavel para picos de uso."
  ));
  children.push(bodyPara(
    "O Block Storage utilizado e de aproximadamente 80 GB dos 200 GB disponiveis (40%), incluindo dados do PostgreSQL, uploads de arquivos, logs e backups locais. A largura de banda de rede e fornecida pelo Flexible Load Balancer (10 Mbps), que e suficiente para 10 usuarios com uso moderado de upload e download de arquivos. O tempo de resposta medio observado e de 1 a 2 segundos para paginas do OpenProject e menor que 1 segundo para mensagens do Mattermost. Nessa escala, a plataforma opera com folga significativa de recursos, proporcionando uma experiencia de usuario fluida e confiavel."
  ));

  children.push(h2("12.2 Escala Media: ate 50 Usuarios"));
  children.push(bodyPara(
    "A projecao para 50 usuarios simultaneos indica que a utilizacao de CPU subira para aproximadamente 65-75%, enquanto a RAM atingira 75-85%, aproximando-se do limite recomendado de operacao segura. O principal gargalo identificado e o CPU do PostgreSQL do OpenProject, que processa um volume significativamente maior de consultas concurrentes. As otimizacoes recomendadas para essa escala incluem: aumento do pool de conexoes do PostgreSQL (de 100 para 200), configuracao do pgBouncer como connection pooler para reduzir overhead de criacao de conexoes, habilitacao de query cache agressivo no memcached, tuning do Puma workers (de 2 para 4 threads) e configuracao de cache agresivo no Cloudflare para assets estaticos do OpenProject."
  ));
  children.push(bodyPara(
    "Alem das otimizacoes de software, ajustes de infraestrutura sao necessarios: reducao da retencao de logs de 30 para 14 dias para economizar Block Storage, compressao mais agressiva de backups para reduzir o consumo de Object Storage, e configuracao de rate limiting mais restritivo no Cloudflare para proteger contra picos inesperados de trafego. Se essas otimizacoes nao forem suficientes para manter a performance adequada, a proxima etapa e habilitar o segundo OCPU do E2 Micro como instancia auxiliar, redirecionando servicos menos criticos (como logging agent e metric exporters) para essa instancia e liberando recursos na instancia principal."
  ));

  children.push(h2("12.3 Escala Grande: Migracao Paid Tier"));
  children.push(bodyPara(
    "Para escalar alem de 50 usuarios, a migracao para a camada paga da Oracle Cloud torna-se necessaria. A primeira mudanca e a migracao do PostgreSQL conteinerizado para o Oracle Autonomous Database, que oferece performance otimizada automaticamente, backup integrado e alta disponibilidade sem esforco operacional. A segunda mudanca e a migracao do K3s single-node para um cluster multi-node, utilizando o OKE (Oracle Kubernetes Engine) Basic Cluster gratuito ou paid, distribuindo os pods entre multiplos nodos para eliminar o ponto unico de falha e aumentar a capacidade computacional total."
  ));
  children.push(bodyPara(
    "Com a migracao paid, a instancia A1 Flex pode ser substituida por instancias E4 Flex ou E3 Flex com mais OCPUs e RAM, ou por um cluster de instancias menores distribuidas em diferentes Availability Domains para alta disponibilidade. O Block Storage pode ser expandido para terabytes com custo proporcional ao uso, e o Object Storage pode ser configurado com tiered storage para otimizar custos de backup. A estimativa de custo mensal para a camada paga com 100 usuarios e de aproximadamente USD 50 a 100, dependendo das opcoes de compute e storage selecionadas, valor significativamente inferior ao custo de solucoes SaaS equivalentes como Jira + Confluence ou Monday.com."
  ));

  children.push(h2("12.4 Caminho de Migracao"));
  children.push(bodyPara(
    "O caminho de evolucao da infraestrutura segue quatro estagios bem definidos, cada um com requisitos e capacidades especificos. O Estagio 1 (Docker Compose) e a abordagem inicial mais simples, adequada para prototipagem e ambientes de desenvolvimento, mas sem isolamento robusto nem rolling updates. O Estagio 2 (K3s Single-Node) e a arquitetura atual documentada neste documento, oferecendo o melhor equilibrio entre funcionalidade e utilizacao de recursos na Always Free Tier. O Estagio 3 (K3s Multi-Node) distribui os pods entre 2-3 nodos, eliminando o ponto unico de falha e dobrando a capacidade computacional, ainda dentro dos limites do Always Free Tier com instancias A1 Flex adicionais."
  ));
  children.push(bodyPara(
    "O Estagio 4 (OKE Managed Kubernetes) representa a evolucao final para ambiente de producao corporativo, com OKE gerenciado, Autonomous Database, OCI Load Balancer pago e Resources Manager para IaC avancado. A transicao entre estagios e projetada para ser gradual e sem downtime, utilizando a portabilidade dos conteineres e a infraestrutura como codigo. Os manifestos Kubernetes sao compatíveis entre K3s e OKE, requerendo apenas ajustes nos Ingress (de Traefik para OCI Load Balancer) e nas StorageClasses (de local-path para OCI Block Volume). Os dados do PostgreSQL sao migrados via pg_dump e pg_restore, e os volumes persistentes sao copiados via rclone para o novo storage provisionado."
  ));

  // ── 13. Matriz de Decisoes Arquiteturais (ADR) ──
  children.push(h1("13. Matriz de Decisoes Arquiteturais (ADR)"));
  children.push(bodyPara(
    "A Matriz de Decisoes Arquiteturais documenta as principais escolhas tecnologicas realizadas durante o design da solucao, incluindo as alternativas avaliadas, a escolha final e a justificativa tecnica e estrategica para cada decisao. Essa documentacao e fundamental para a manutibilidade da arquitetura a longo prazo e para a contextualizacao de futuras evolucoes do sistema."
  ));
  children.push(tableTitle("Tabela 4: Matriz de Decisoes Arquiteturais"));
  children.push(makeTable(
    ["ID", "Decisao", "Alternativas", "Escolha", "Justificativa"],
    [
      ["ADR-001", "Ferramenta de IaC", "OCI CLI, Pulumi", "Terraform", "Ecossistema maduro, estado declarativo, provedor OCI robusto, comunidade ativa"],
      ["ADR-002", "Orquestracao", "Docker Compose", "K3s", "Rolling updates, auto-healing, NetworkPolicies, isolamento por namespace"],
      ["ADR-003", "Topologia de VMs", "Multi-VM", "Single VM A1 Flex", "Maximiza recursos gratuitos, reduz complexidade operacional"],
      ["ADR-004", "Ingress Controller", "Nginx", "Traefik", "Auto-descoberta de servicos, nativo K3s, suporte nativo a Let's Encrypt"],
      ["ADR-005", "Banco de Dados", "PostgreSQL compartilhado", "PostgreSQL separado", "Isolamento de falhas, tuning independente, backup granular"],
      ["ADR-006", "Gerenciamento DNS", "DNS manual OCI", "Cloudflare", "CDN integrado, WAF gratuito, API automatizada, caching global"],
      ["ADR-007", "Gestao de Secrets", "Arquivos .env", "OCI Vault (HSM)", "Seguranca HSM-backed, rotacao automatica, auditoria de acesso"],
      ["ADR-008", "Observabilidade", "Prometheus/Grafana", "OCI Monitoring", "Zero overhead, integracao nativa OCI, 500M datapoints/mes gratis"],
    ],
    [10, 15, 18, 18, 39]
  ));

  // ── 14. Matriz de Riscos e Mitigacao ──
  children.push(h1("14. Matriz de Riscos e Mitigacao"));
  children.push(bodyPara(
    "A gestao de riscos e um componente critico do planejamento de qualquer projeto de infraestrutura, especialmente em ambientes que operam nos limites de recursos gratuitos. A matriz a seguir identifica os principais riscos do projeto IncubaScience, classifica sua probabilidade e impacto, define estrategias de mitigacao e acompanha o status atual de cada risco. Os riscos sao revisados quinzenalmente pela equipe de gestao e atualizados conforme a evolucao do projeto."
  ));
  children.push(tableTitle("Tabela 5: Matriz de Riscos e Mitigacao"));
  children.push(makeTable(
    ["Risco", "Probabilidade", "Impacto", "Mitigacao", "Status"],
    [
      ["Esgotamento de RAM na A1 Flex", "Media", "Alto", "Monitoramento com alertas em 85%, otimizacao de memory limits, tuning PostgreSQL", "Monitorado"],
      ["Esgotamento de Block Storage (200 GB)", "Baixa", "Alto", "Politica de retencao diferenciada, compressao de backups, limpeza periodica de logs", "Controlado"],
      ["Instabilidade da Always Free Tier", "Baixa", "Critico", "Backups diarios para Object Storage, procedimento de restauracao documentado e testado", "Monitorado"],
      ["Falha de disco na A1 Flex", "Baixa", "Critico", "Backup diario + Object Storage, RTO de 30-60 min, RPO de 24 horas", "Controlado"],
      ["Comprometimento de credenciais", "Media", "Critico", "OCI Vault com HSM, rotacao mensal de secrets, MFA obrigatorio, External Secrets Operator", "Mitigado"],
      ["Ataque DDoS", "Media", "Medio", "Cloudflare DDoS protection, rate limiting, OCI WAF, monitoramento de trafego anomalo", "Mitigado"],
      ["Perda de dados do PostgreSQL", "Baixa", "Critico", "pg_dump diario, checksum de integridade, restauracao testada mensalmente, Object Storage", "Controlado"],
      ["Indisponibilidade do Cloudflare", "Muito Baixa", "Medio", "DNS failover para IP direto (opcional), cache local de DNS, procedimento de bypass", "Aceito"],
      ["Vulnerabilidade zero-day em conteiner", "Baixa", "Alto", "Vulnerability Scanning semanal, atualizacao de imagens, NetworkPolicies de isolamento", "Monitorado"],
      ["Limitacao de 10 Mbps do LB", "Baixa", "Medio", "Cache agressivo Cloudflare, compressao Brotli, otimizacao de assets estaticos", "Aceito"],
    ],
    [25, 13, 11, 36, 15]
  ));

  // ── 15. Glossario ──
  children.push(h1("15. Glossario"));
  children.push(bodyPara(
    "O glossario a seguir apresenta as definicoes dos termos tecnicos utilizados ao longo deste documento, com o objetivo de facilitar a compreensao por parte de leitores com diferentes niveis de conhecimento tecnico. Os termos sao apresentados em ordem alfabetica e incluem siglas, conceitos de cloud computing, ferramentas e metodologias de desenvolvimento."
  ));
  children.push(tableTitle("Tabela 6: Glossario de Termos Tecnicos"));
  children.push(makeTable(
    ["Termo", "Definicao"],
    [
      ["ADR", "Architecture Decision Record — registro documentado de decisoes arquiteturais com contexto, alternativas e justificativa"],
      ["APM", "Application Performance Monitoring — monitoramento de performance de aplicacoes com distributed tracing e span metrics"],
      ["Cloudflare", "Plataforma global de CDN, DNS, WAF e seguranca DDoS utilizada como edge proxy no projeto"],
      ["DNS-01", "Metodo de validacao de certificacao Let's Encrypt via criacao de registros TXT no DNS"],
      ["IaC", "Infrastructure as Code — gerenciamento de infraestrutura via codigo declarativo (Terraform)"],
      ["K3s", "Distribuicao leve do Kubernetes para IoT e edge computing, com binary unico e ~640 MB RAM overhead"],
      ["Kustomize", "Ferramenta de gerenciamento de configuracoes Kubernetes que permite composicao e transformacao de manifestos YAML"],
      ["MRL", "Manufacturing Readiness Level — escala de maturidade de fabricacao de 1 a 10, adaptada pelo DoD dos EUA"],
      ["NetworkPolicy", "Recurso do Kubernetes que define regras de firewall declarativas no nivel de pod para controle de trafego"],
      ["OCI", "Oracle Cloud Infrastructure — plataforma de cloud computing da Oracle com generosa Always Free Tier"],
      ["OIDC", "OpenID Connect — protocolo de autenticacao sobre OAuth 2.0 para Single Sign-On federado"],
      ["OKE", "Oracle Kubernetes Engine — servico gerenciado de Kubernetes na Oracle Cloud"],
      ["PGP/PGDump", "Utilitarios de backup e restauracao nativos do PostgreSQL para exportacao e importacao de bancos de dados"],
      ["RBAC", "Role-Based Access Control — modelo de controle de acesso baseado em funcoes e permissoes"],
      ["RTO/RPO", "Recovery Time Objective / Recovery Point Objective — metricas de disaster recovery"],
      ["TLS", "Transport Layer Security — protocolo criptografico para seguranca de comunicacoes em rede"],
      ["TRL", "Technology Readiness Level — escala de maturidade tecnologica de 1 a 9, originada na NASA"],
      ["VCN", "Virtual Cloud Network — rede virtual isolada na Oracle Cloud com sub-redes, gateways e security lists"],
      ["WAF", "Web Application Firewall — firewall de aplicacao web que filtra trafego HTTP contra ataques comuns"],
    ],
    [20, 80]
  ));

  // ── 16. Referencias ──
  children.push(h1("16. Referencias"));
  children.push(bodyParaNoIndent("Oracle Cloud Infrastructure. Always Free Resources. Disponivel em: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm. Acesso em: Maio 2026."));
  children.push(bodyParaNoIndent("OpenProject Documentation. OpenProject 15 Administration Guide. Disponivel em: https://docs.openproject.org/. Acesso em: Maio 2026."));
  children.push(bodyParaNoIndent("Mattermost Documentation. Mattermost Team Edition Configuration. Disponivel em: https://docs.mattermost.com/. Acesso em: Maio 2026."));
  children.push(bodyParaNoIndent("K3s Documentation. K3s Architecture and Installation. Disponivel em: https://docs.k3s.io/. Acesso em: Maio 2026."));
  children.push(bodyParaNoIndent("Cloudflare Documentation. DNS, SSL/TLS, WAF and Caching Configuration. Disponivel em: https://developers.cloudflare.com/. Acesso em: Maio 2026."));
  children.push(bodyParaNoIndent("HashiCorp Terraform Documentation. OCI Provider and Best Practices. Disponivel em: https://registry.terraform.io/providers/hashicorp/oci/. Acesso em: Maio 2026."));
  children.push(bodyParaNoIndent("Cert-Manager Documentation. Let's Encrypt DNS-01 Challenge with Cloudflare. Disponivel em: https://cert-manager.io/docs/. Acesso em: Maio 2026."));
  children.push(bodyParaNoIndent("NASA. Technology Readiness Assessment (TRA) Guide. Washington, DC: NASA, 2011. Disponivel em: https://www.nasa.gov/. Acesso em: Maio 2026."));
  children.push(bodyParaNoIndent("OWASP Foundation. OWASP Top 10:2021 — The Ten Most Critical Web Application Security Risks. Disponivel em: https://owasp.org/www-project-top-ten/. Acesso em: Maio 2026."));
  children.push(bodyParaNoIndent("ISO/IEC 27001:2022. Information Security Management Systems — Requirements. International Organization for Standardization, 2022."));

  return children;
}

// ═══════════════════════════════════════════════════════════
// DOCUMENT ASSEMBLY
// ═══════════════════════════════════════════════════════════
async function main() {
  const pgSize = { width: 11906, height: 16838 };
  const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

  const coverSection = {
    properties: {
      page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
    },
    children: buildCoverR4({
      palette: P,
      title: "Documento de Arquitetura de Software",
      subtitle: "Incubadora IncubaScience | OpenProject + Mattermost | Oracle Cloud Always Free Tier",
      metaLines: [
        "Versao 1.0 | Maio 2026",
        "Engenharia de Requisitos | PMO Master",
        "Classificacao: Confidencial",
      ],
      footerLeft: "IncubaScience",
      footerRight: "Documento Interno",
    }),
  };

  const tocSection = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: {
        size: pgSize, margin: pgMargin,
        pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "687078" }),
          ],
        })],
      }),
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "IncubaScience — Documento de Arquitetura de Software", size: 16, color: "90989F", font: { ascii: "Calibri" } })],
        })],
      }),
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 360 },
        children: [new TextRun({
          text: "Sumario",
          bold: true, size: 32, color: "1A2330", font: { ascii: "Calibri" },
        })],
      }),
      new TableOfContents("Sumario", {
        hyperlink: true,
        headingStyleRange: "1-3",
      }),
      new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({
          text: "Nota: Este Sumario e gerado via codigos de campo. Para garantir a precisao dos numeros de pagina apos edicao, clique com o botao direito no sumario e selecione \"Atualizar Campo\".",
          italics: true, size: 18, color: "888888", font: { ascii: "Calibri" },
        })],
      }),
      new Paragraph({ children: [new PageBreak()] }),
    ],
  };

  const bodyContent = buildBody();

  const bodySection = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: {
        size: pgSize, margin: pgMargin,
        pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "687078" }),
          ],
        })],
      }),
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "IncubaScience — Documento de Arquitetura de Software", size: 16, color: "90989F", font: { ascii: "Calibri" } })],
        })],
      }),
    },
    children: bodyContent,
  };

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: { ascii: "Calibri" }, size: 24, color: "000000" },
          paragraph: { spacing: { line: 312 } },
        },
      },
      heading1: {
        run: { font: { ascii: "Calibri" }, size: 32, bold: true, color: "1A2330" },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
      heading2: {
        run: { font: { ascii: "Calibri" }, size: 28, bold: true, color: "1A2330" },
        paragraph: { spacing: { before: 240, after: 120, line: 312 } },
      },
      heading3: {
        run: { font: { ascii: "Calibri" }, size: 26, bold: true, color: "2C3E50" },
        paragraph: { spacing: { before: 200, after: 100, line: 312 } },
      },
    },
    sections: [coverSection, tocSection, bodySection],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("/home/z/my-project/download/documento-arquitetura-incubadora.docx", buffer);
  console.log("Documento gerado com sucesso!");
}

main().catch(err => { console.error(err); process.exit(1); });
