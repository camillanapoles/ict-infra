# Guia Completo para Implementação e Automação do OpenProject Enterprise v15 para Gestão de Incubadoras de Deeptech

## Seção 1: Introdução e Visão Geral da Solução

### 1.1. OpenProject Enterprise v15: Uma Visão Geral

O OpenProject se apresenta como uma solução de gerenciamento de projetos de código aberto, abrangente e flexível, projetada para suportar equipes em diversas metodologias, incluindo clássica, ágil e híbrida. A versão 15 Enterprise on-premise, foco deste relatório, oferece funcionalidades aprimoradas e suporte especializado, tornando-a ideal para organizações que necessitam de controle total sobre seus dados e um ambiente de gerenciamento de projetos robusto e seguro. A escolha pela modalidade on-premise reforça a soberania dos dados, um aspecto crítico para incubadoras que lidam com informações sensíveis de múltiplas Empresas de Base Tecnológica EBTs (Deeptechs, Deeptechs, Scaleups, Spin-offs). A versão 15.x, como a 15.5.0, introduz melhorias contínuas, como filtros avançados para pacotes de trabalho descendentes e a inclusão da coluna "% Concluído" nas somas das tabelas de pacotes de trabalho, aprimorando a visualização e o acompanhamento do progresso dos projetos.

A decisão de adotar a edição Enterprise do OpenProject transcende a simples aquisição de funcionalidades adicionais. Envolve um compromisso com a estabilidade, segurança e suporte contínuo, elementos indispensáveis para operações críticas como a gestão de uma incubadora. A capacidade de auto-hospedagem (on-premise) garante que todos os dados do projeto, incluindo informações estratégicas das Deeptechs incubadas, permaneçam sob o controle total da organização, alinhando-se com as melhores práticas de governança de dados. Este controle é vital, considerando a natureza confidencial e competitiva das informações manuseadas.


## Seção 3: Configuração Avançada do OpenProject para a Incubadora de Deeptechs IncubaScience

Com a infraestrutura e a aplicação OpenProject Enterprise v15 implantadas, a próxima fase é a configuração detalhada da plataforma para atender às necessidades específicas da incubadora IncubaScience. Isso envolve a estruturação de projetos, a definição de um modelo de permissões robusto (multi-tenancy), a implementação do plano de trabalho fornecido e a configuração de funcionalidades como quadros Kanban, dashboards e automações.

### 3.1. Visão Geral das Funcionalidades do OpenProject v15 Enterprise

O OpenProject é uma plataforma rica em funcionalidades, cobrindo desde o planejamento e execução de projetos até o rastreamento de tempo e custos, colaboração e relatórios. A versão 15.x continua a evoluir esses recursos, com melhorias na interface e na manipulação de dados, como a filtragem por descendentes de pacotes de trabalho e a exibição de percentual completo em somas de tabelas.

**Funcionalidades Chave Relevantes para a Incubadora:**

- **Gerenciamento de Projetos:** Suporte a metodologias clássicas (cascata, com cronogramas Gantt), ágeis (Scrum, Kanban boards) e híbridas.
- **Pacotes de Trabalho (Work Packages):** Unidade central para rastrear tarefas, entregas, marcos, bugs, funcionalidades, etc. Altamente customizáveis.
- **Cronogramas (Gantt Charts):** Visualização de planos de projeto, dependências e progresso ao longo do tempo.
- **Quadros (Boards):** Quadros Kanban e ágeis para gerenciamento visual de fluxos de trabalho e sprints.
- **Rastreamento de Tempo e Custos:** Funcionalidades para registrar horas trabalhadas em tarefas e associar custos, permitindo o acompanhamento orçamentário.
- **Orçamentos:** Planejamento e monitoramento de orçamentos de projetos.
- **Relatórios e Dashboards:** Criação de relatórios customizados e dashboards para visualização de KPIs e progresso.
- **Módulos de Colaboração:** Wikis para documentação, Fóruns para discussões, Documentos para gerenciamento de arquivos, Reuniões para agendamento e atas.

**Funcionalidades Específicas da Edição Enterprise:** A edição Enterprise, além de oferecer suporte profissional e opções de hospedagem segura , desbloqueia funcionalidades avançadas cruciais para cenários complexos como o da IncubaScience:

- **Campos Personalizados Avançados:** Incluindo o tipo "Hierarquia", que permite criar listas de seleção multinível, útil para categorizações complexas.
- **Workflows Customizáveis:** Definição granular de transições de status permitidas para diferentes tipos de pacotes de trabalho e papéis de usuário.
- **Custom Actions (Ações Personalizadas):** Criação de botões em pacotes de trabalho que executam um conjunto predefinido de atualizações (ex: mudar status, atribuir responsável, definir um campo personalizado) com um único clique, padronizando e automatizando processos.
- **Relatórios Avançados e Dashboards de Portfólio:** Ferramentas mais poderosas para consolidar e visualizar dados de múltiplos projetos.
- **Autenticação Avançada:** Opções como integração com provedores OpenID Connect (OIDC).

A flexibilidade inerente ao OpenProject, amplificada pelos recursos da edição Enterprise, permite que a IncubaScience modele a plataforma para refletir seus processos operacionais únicos. Isso vai além do simples gerenciamento de tarefas, possibilitando o rastreamento de métricas específicas das Deeptechs, a automação de fluxos de trabalho da incubação e a criação de uma visão consolidada do portfólio de incubadas.

### 3.2. Estrutura de Projetos para Isolamento e Supervisão da Incubadora IncubaScience

Uma estrutura de projetos bem definida é fundamental para garantir o isolamento de dados entre as Deeptechs e, ao mesmo tempo, permitir que a equipe da incubadora tenha a supervisão necessária.

**3.2.1. Projeto Principal da Incubadora ("IncubaScience Hub"):**

- **Propósito:** Este será o projeto central para todas as atividades internas da IncubaScience. Ele servirá para:
    - Gerenciar as operações da própria incubadora (planejamento estratégico, gestão de equipe interna, finanças da incubadora).
    - Coordenar o processo de incubação como um todo: divulgação de editais, seleção de Deeptechs, comunicação geral com as incubadas.
    - Consolidar informações de alto nível de todas as Deeptechs para uma visão de portfólio (ex: status geral, principais marcos, KPIs agregados).
- **Módulos Ativados:** Praticamente todos os módulos do OpenProject serão úteis aqui, com ênfase em:
    - **Relatórios e Dashboards:** Para a visão de portfólio e acompanhamento dos objetivos da incubadora.
    - **Wiki:** Para documentação interna de processos, políticas e guias da incubadora.
    - **Fóruns:** Para discussões gerais com todas as Deeptechs ou para comunicação interna da equipe da incubadora.
    - **Documentos:** Para armazenar templates, editais, e outros documentos relevantes para o programa de incubação.
    - **Pacotes de Trabalho e Cronograma:** Para gerenciar as atividades e o roadmap da própria IncubaScience.

**3.2.2. Subprojetos para cada Deeptech (Isolamento de Dados):** Cada Deeptech admitida no programa de incubação terá seu próprio projeto dedicado no OpenProject. Este projeto será configurado como um subprojeto do "IncubaScience Hub" ou de um projeto de portfólio intermediário, se a estrutura se tornar muito extensa. Por exemplo:

- IncubaScience Hub (Projeto Pai)
    - Deeptech Alfa (Subprojeto)
    - Deeptech Beta (Subprojeto)
    - Deeptech Gama (Subprojeto)
- **Garantia de Isolamento:** O isolamento de dados é um requisito primordial ("uma Deeptech NÃO PODE TER ACESSO A OUTRA Deeptech"). No OpenProject, o acesso a um projeto é concedido apenas a usuários que são membros desse projeto específico. Portanto, os membros da "Deeptech Alfa" não terão visibilidade ou acesso aos dados do projeto da "Deeptech Beta", e vice-versa. Isso é reforçado pela configuração de papéis e permissões, detalhada adiante.
- **Módulos Ativados por Deeptech (Exemplo):**
    - **Pacotes de Trabalho:** Para a Deeptech gerenciar suas tarefas, sprints, backlog.
    - **Cronograma (Gantt):** Para planejar e visualizar seu roadmap de desenvolvimento.
    - **Quadros (Kanban/Agile):** Para gestão visual de tarefas.
    - **Documentos:** Para seus arquivos e entregas específicas.
    - **Wiki:** Para sua documentação interna (ex: processos, base de conhecimento do produto).
    - **Reuniões:** Para agendar e documentar reuniões com mentores ou internas.
    - **Orçamento:** Se a incubadora fornecer ou ajudar a gerenciar um orçamento específico para a Deeptech.

**3.2.3. Configuração de Hierarquia e Visibilidade:**

- A funcionalidade "Subprojeto de" (disponível nas configurações de cada projeto) será usada para estabelecer a relação pai-filho entre o "IncubaScience Hub" e os projetos das Deeptechs.
- **Visibilidade:**
    - Os projetos das Deeptechs devem ser configurados como **privados**. Isso significa que apenas membros explicitamente adicionados ao projeto (e administradores do sistema) poderão visualizá-lo e acessá-lo.
    - O projeto "IncubaScience Hub" pode ter sua visibilidade ajustada conforme a necessidade. Partes dele (como informações sobre o edital de incubação) poderiam ser públicas se a instância OpenProject for acessível externamente sem autenticação, mas o padrão para a maioria das atividades internas seria privado.

A criação de uma hierarquia de projetos é o primeiro passo para organizar o ambiente. Contudo, a eficácia do isolamento e da supervisão depende intrinsecamente da correta configuração dos papéis de usuário e da atribuição de permissões, que definem o que cada membro pode ver e fazer dentro de cada projeto.

### 3.3. Gestão de Usuários, Grupos, Papéis e Permissões (Multi-tenancy)

Para atender aos requisitos de acesso da incubadora (visão global e individual das Deeptechs) e garantir o isolamento entre as Deeptechs, um modelo de Role-Based Access Control (RBAC) bem planejado é essencial. Este modelo se assemelha a uma abordagem multi-tenant, onde cada Deeptech é um "inquilino" com seu ambiente de dados isolado.

**3.3.1. Papéis para a Equipe da Incubadora:** Estes papéis definirão o que a equipe da IncubaScience pode fazer.

- **Admin_Incubadora (Administrador Global):**
    - **Escopo:** Nível da aplicação.
    - **Permissões:** Acesso total a todas as configurações do sistema OpenProject, todos os projetos, usuários, etc. Este é o papel de administrador padrão do OpenProject.
    - **Uso:** Para instalação, configuração inicial, manutenção do sistema, gerenciamento de usuários de alto nível.
- **Gestor_Incubadora_Portfolio (Papel de Projeto):**
    - **Escopo:** Nível de projeto (será atribuído a membros da incubadora em CADA projeto de Deeptech E no projeto "IncubaScience Hub").
    - **Permissões Chave (nos projetos das Deeptechs):** Ver pacotes de trabalho, criar pacotes de trabalho (para enviar demandas), editar pacotes de trabalho (para acompanhar), ver cronograma, ver quadros, acessar relatórios, adicionar comentários, ver documentos, ver orçamento (se aplicável). Não deve ter permissão para gerenciar membros da Deeptech ou excluir o projeto da Deeptech.
    - **Permissões Chave (no projeto "IncubaScience Hub"):** Gerenciamento completo das atividades da incubadora.
    - **Uso:** Para a equipe da incubadora que precisa de uma visão consolidada de todas as Deeptechs, enviar demandas, acompanhar progresso e gerar relatórios de portfólio.
- **Gestor_Incubadora_Deeptech_Dedicado (Papel de Projeto, Opcional):**
    - **Escopo:** Nível de projeto (atribuído a um gestor específico em um subconjunto de projetos de Deeptechs).
    - **Permissões:** Similar ao Gestor_Incubadora_Portfolio, mas o acesso é limitado aos projetos das Deeptechs que este gestor acompanha diretamente.
    - **Uso:** Se houver especialização de gestores por área ou por grupo de Deeptechs.
- **Membro_Equipe_Incubadora (Papel de Projeto):**
    - **Escopo:** Nível de projeto (primariamente para o projeto "IncubaScience Hub").
    - **Permissões:** Criar e executar tarefas relacionadas às atividades internas da incubadora (eventos, comunicação, administração do programa).
    - **Uso:** Para membros da equipe da incubadora que não necessitam de acesso direto aos projetos das Deeptechs, mas participam das operações da incubadora.

**3.3.2. Papéis para as Deeptechs:** Estes papéis definirão o que os membros das Deeptechs podem fazer dentro de SEUS PRÓPRIOS projetos.

- **Lider_Deeptech (Papel de Projeto):**
    - **Escopo:** Nível de projeto (dentro do projeto da sua respectiva Deeptech).
    - **Permissões Chave:** Gerenciamento completo dos pacotes de trabalho do seu projeto, gerenciamento de membros da sua equipe dentro do seu projeto (adicionar/remover membros da Deeptech ao projeto da Deeptech, atribuir papéis de Deeptech), atualizar o roadmap da Deeptech, gerenciar documentos e wiki da Deeptech. Não deve ter permissão para ver ou interagir com projetos de outras Deeptechs.
    - **Uso:** Para o(s) fundador(es) ou líder(es) da Deeptech.
- **Membro_Deeptech (Papel de Projeto):**
    - **Escopo:** Nível de projeto (dentro do projeto da sua respectiva Deeptech).
    - **Permissões Chave:** Criar, visualizar e atualizar pacotes de trabalho que lhe são atribuídos ou que são relevantes para suas atividades, adicionar comentários, visualizar cronograma e quadros, carregar documentos.
    - **Uso:** Para os demais membros da equipe da Deeptech.
- **Visualizador_Deeptech (Papel de Projeto, Opcional):**
    - **Escopo:** Nível de projeto (dentro do projeto da sua respectiva Deeptech).
    - **Permissões Chave:** Apenas visualizar pacotes de trabalho, cronograma, quadros, documentos. Sem permissão de edição ou criação.
    - **Uso:** Para stakeholders da Deeptech que precisam de visibilidade, mas não participam ativamente (ex: investidores anjo iniciais, conselheiros).

**3.3.3. Criação de Grupos:** Grupos simplificam a atribuição de papéis a múltiplos usuários.

- **Grupo_Gestores_Incubadora:**
    - **Membros:** Todos os usuários da equipe da incubadora que precisam de acesso de portfólio às Deeptechs (aqueles com o papel funcional de Gestor_Incubadora_Portfolio).
    - **Atribuição:** Este grupo será adicionado como membro a CADA projeto de Deeptech, recebendo o papel Gestor_Incubadora_Portfolio nesses projetos. Também será membro do projeto "IncubaScience Hub".
- **Para cada Deeptech (ex: Deeptech Alfa):**
    - Grupo_Deeptech_Alfa_Lideres: Membros: Líderes da Deeptech Alfa. Atribuir o papel Lider_Deeptech a este grupo DENTRO do projeto "Deeptech Alfa".
    - Grupo_Deeptech_Alfa_Membros: Membros: Todos os membros da Deeptech Alfa. Atribuir o papel Membro_Deeptech a este grupo DENTRO do projeto "Deeptech Alfa".

**Implementação :**

1. **Criar Papéis:** Em "Administração" -> "Usuários e permissões" -> "Papéis e permissões", clicar em "+ Papel".
    - Definir o nome do papel (ex: Gestor_Incubadora_Portfolio).
    - **Não** marcar "Papel global" para papéis de projeto.
    - Selecionar as permissões apropriadas para cada módulo (Pacotes de trabalho, Cronograma, Membros, etc.). Por exemplo, para Gestor_Incubadora_Portfolio em um projeto de Deeptech, conceder permissões como view_work_packages, add_work_packages, edit_work_packages, view_gantt_charts, view_activity, mas não manage_members ou delete_project.
    - Salvar cada papel.
2. **Criar Grupos:** Em "Administração" -> "Usuários e permissões" -> "Grupos", clicar em "+ Grupo".
    - Dar um nome ao grupo (ex: Grupo_Gestores_Incubadora).
    - Adicionar os usuários correspondentes ao grupo.
3. **Adicionar Membros aos Projetos:**
    - **Para o projeto "IncubaScience Hub":** Navegar para "Configurações do Projeto" -> "Membros". Adicionar os usuários da equipe da incubadora e/ou o grupo Grupo_Gestores_Incubadora com os papéis apropriados (ex: Admin_Incubadora para o administrador, Gestor_Incubadora_Portfolio para gestores, Membro_Equipe_Incubadora para outros).
    - **Para cada projeto de Deeptech (ex: "Deeptech Alfa"):** Navegar para "Configurações do Projeto" -> "Membros".
        - Adicionar o grupo Grupo_Gestores_Incubadora com o papel Gestor_Incubadora_Portfolio.
        - Adicionar o grupo Grupo_Deeptech_Alfa_Lideres com o papel Lider_Deeptech.
        - Adicionar o grupo Grupo_Deeptech_Alfa_Membros com o papel Membro_Deeptech.

**Tabela: Matriz Detalhada de Papéis e Permissões (IncubaScience) - Exemplo Simplificado**

|Permissão Chave (Exemplo)|Admin Incubadora (Global)|Gestor Incubadora Portfolio (no projeto Deeptech)|Gestor Incubadora Portfolio (no projeto Incubadora)|Líder Deeptech (no seu projeto)|Membro Deeptech (no seu projeto)|
|---|---|---|---|---|---|
|Ver Pacotes de Trabalho|Sim|Sim|Sim|Sim|Sim|
|Criar Pacotes de Trabalho|Sim|Sim (para enviar demandas)|Sim|Sim|Sim (para suas tarefas)|
|Editar _todos_ Pacotes de Trabalho|Sim|Sim (para acompanhar)|Sim|Sim|Não (apenas os seus/atribuídos)|
|Ver Roadmap (Cronograma)|Sim|Sim|Sim|Sim|Sim|
|Gerenciar Membros do Projeto|Sim|Não|Sim|Sim (apenas da sua Deeptech)|Não|
|Acessar Configurações do Projeto|Sim|Limitado/Não|Sim|Sim (do seu projeto)|Não|
|Ver Projetos de _Outras_ Deeptechs|Sim|Sim (devido à associação a todos)|N/A (este é o projeto da incubadora)|Não|Não|
|Administrar Usuários (Global)|Sim|Não|Não|Não|Não|
|Definir Campos Personalizados (Global)|Sim|Não|Não|Não|Não|

Esta abordagem de combinar papéis de projeto bem definidos com o uso estratégico de grupos permite um gerenciamento de permissões que é ao mesmo tempo granular e escalável. Evita-se a "explosão de papéis" – a criação de inúmeros papéis ligeiramente diferentes – centralizando as definições de permissão nos papéis e usando grupos para aplicar esses papéis aos conjuntos corretos de usuários e projetos. A capacidade da incubadora de "enviar demanda e visualizar todas" as Deeptechs é atendida ao adicionar o Grupo_Gestores_Incubadora a cada projeto de Deeptech com um papel que conceda as permissões necessárias para criar e visualizar pacotes de trabalho. O isolamento é mantido porque os membros de uma Deeptech só são adicionados ao seu próprio projeto.

### 3.4. Implementando o Plano "Análise e Validação do Planejamento para OpenProject"

O documento "Análise e Validação do Planejamento para OpenProject" fornecido serve como o roteiro funcional para a configuração do OpenProject. Esta seção detalha como traduzir essa estrutura em elementos concretos dentro da plataforma.

**3.4.1. Mapeamento das Etapas e Atividades para Estruturas do OpenProject:** A estrutura hierárquica do plano será replicada no OpenProject da seguinte forma:

- **Etapas Principais (0 a 7):** Cada uma dessas etapas numeradas (ex: "Etapa 1 | Sensibilização, prospecção e seleção") será criada como um Pacote de Trabalho de alto nível dentro do projeto "IncubaScience Hub". Pode-se usar o tipo de trabalho "Fase" para estes, se configurado.
- **Subitens Numerados (ex: 1.1, 2.1.1):** Cada subitem dentro de uma etapa (ex: "1.1 Execução e divulgação de chamada/edital de incubação") se tornará um Pacote de Trabalho filho do pacote de trabalho da Etapa correspondente. Dependendo da granularidade, podem ser do tipo "Pacote de Trabalho" (para agrupamentos maiores) ou "Tarefa" (para itens de ação específicos).
    - Por exemplo, "2.11 Ações específicas:" seria um Pacote de Trabalho, e "2.11.1 Elaborar instrumento/modelo de diagnóstico" seria uma Tarefa filha de "2.11".
- **Marcos:** Itens que representam entregas ou eventos chave (ex: "1.7 Edital Publicado 02/2025 IncubaScience") devem ser criados como Pacotes de Trabalho do tipo "Marco".
- **Reuniões:** Atividades que são explicitamente reuniões (ex: "2.4 Promoção e planejamento de reuniões periódicas") podem ser gerenciadas como Pacotes de Trabalho do tipo "Reunião" ou diretamente através do módulo de Reuniões, vinculando-as aos Pacotes de Trabalho relevantes.
- **Datas e Responsáveis:** As datas (ex: "[Abril/Maio 2025]") e os responsáveis implícitos ou explícitos no documento serão mapeados para os campos "Data de início", "Data de fim" e "Atribuído a" (ou um campo personalizado "Responsável") nos respectivos Pacotes de Trabalho.

**3.4.2. Configuração de Tipos de Trabalho (Work Package Types):** Conforme definido no documento de planejamento e nas melhores práticas do OpenProject:

- **Fase:** Para as grandes etapas do programa de incubação (Etapas 0-7).
- **Pacote de Trabalho:** Para agrupamentos de atividades ou entregas significativas dentro de uma fase.
- **Tarefa:** Para itens de ação específicos e granulares.
- **Marco (Milestone):** Para representar eventos importantes, prazos finais e entregas chave.
- **Reunião (Meeting):** Para agendar e rastrear reuniões formais.
- **Demanda (Opcional, mas útil):** Um tipo específico para as demandas que a incubadora envia para as Deeptechs.
- **Diagnóstico (Opcional):** Um tipo para as atividades de diagnóstico.

Estes tipos devem ser criados ou ajustados em "Administração" -> "Tipos de Trabalho". Para cada tipo, é possível definir:

- Atributos padrão (campos que aparecem por padrão).
- Workflow padrão (transições de status permitidas).
- Se os campos "Data de início" e "Data de fim" são calculados automaticamente ou manualmente.
- Se o progresso (%) é calculado com base no status ou no tempo.

**3.4.3. Criação de Campos Personalizados :** Os campos personalizados são essenciais para capturar informações específicas do processo de incubação, conforme detalhado no documento de planejamento e para atender aos requisitos da IncubaScience.

- **Campos Especificados no Documento de Planejamento:**
    - **Responsável**: Tipo "Usuário". Para designar o principal ponto de contato ou executor da atividade.
    - **Deeptech(s) Envolvida(s)**: Tipo "Lista" (multi-select) se as Deeptechs forem cadastradas como opções, ou Tipo "Projeto" (multi-select, se cada Deeptech for um projeto OpenProject e a atividade for no projeto da incubadora mas referenciar Deeptechs). Para atividades dentro do projeto de uma Deeptech, este campo pode não ser necessário ali, mas sim no projeto da incubadora para consolidar.
    - **Status ESG**: Tipo "Lista". Valores: "Iniciante", "Intermediário", "Avançado".
    - **Nível TRL (Technology Readiness Level)**: Tipo "Lista" (ou "Inteiro"). Valores: 1, 2,..., 9.
    - **Nível MRL (Market Readiness Level)**: Tipo "Lista" (ou "Inteiro"). Valores: 1, 2,..., 9.
    - **Tipo de Atividade da Incubadora**: Tipo "Lista". Valores: "Mentoria", "Consultoria", "Formação", "Diagnóstico", "Evento", "Networking", "Suporte Infraestrutura".
    - **ODS Relacionados (Objetivos de Desenvolvimento Sustentável)**: Tipo "Lista" (multi-select). Valores: ODS 1, ODS 2,..., ODS 17.
- **Outros Campos Úteis Sugeridos para a Gestão da Incubadora:**
    - **ID da Deeptech (Externo)**: Tipo "Texto". Se as Deeptechs possuem um identificador único fora do OpenProject.
    - **Área de Foco da Deeptech**: Tipo "Lista". Ex: "HealthTech", "FinTech", "EdTech", "AgriTech".
    - **KPI Principal da Deeptech (Descrição)**: Tipo "Texto longo". Para descrever o principal indicador que a Deeptech está focando.
    - **Valor do KPI Principal (Atual)**: Tipo "Texto" ou "Número".
    - **Data da Próxima Reunião de Acompanhamento (Deeptech)**: Tipo "Data".
    - **Pontuação de Ranking da Deeptech**: Tipo "Número". Para o sistema de ranking.
    - **Fonte de Financiamento da Deeptech**: Tipo "Lista". Ex: "Bootstrapped", "Investimento Anjo", "Seed", "VC".

**Configuração de cada Campo Personalizado:**

1. Navegar para "Administração" -> "Campos Personalizados".
2. Selecionar a aba para qual o campo se aplica (ex: "Pacotes de Trabalho", "Projetos").
3. Clicar em "+ Novo campo personalizado".
4. Definir:
    - **Nome:** O rótulo que aparecerá (ex: "Nível TRL").
    - **Formato:** O tipo de dado (Texto, Inteiro, Lista, Data, Booleano, Usuário, Projeto, etc.).
    - **Opções específicas do formato:**
        - Para Listas: Adicionar os valores possíveis. Marcar "Seleção múltipla" se aplicável.
        - Para Texto: Definir comprimento mínimo/máximo.
        - Para Usuário/Projeto: Configurar filtros se necessário.
    - **Obrigatório:** Se o campo deve ser preenchido.
    - **Para todos os projetos:** Se o campo deve estar disponível em todos os projetos por padrão. (Para campos específicos da incubadora, pode ser melhor não marcar e ativá-los seletivamente).
    - **Usado como filtro:** Se o campo deve aparecer nas opções de filtro da tabela de pacotes de trabalho.
    - **Pesquisável:** Se o conteúdo do campo deve ser incluído na busca global.
5. Salvar o campo.
6. **Ativação para Tipos de Trabalho e Projetos:**
    - Um campo personalizado de pacote de trabalho só aparece se estiver ativo para o Tipo de Trabalho específico (via "Administração" -> "Tipos de Trabalho" -> selecionar tipo -> "Configuração de formulário" -> arrastar o campo para a lista de ativos) E se estiver ativo para o projeto em questão ("Configurações do Projeto" -> "Campos Personalizados" -> ativar o campo para o projeto). A configuração de formulário por tipo de trabalho é um recurso da edição Enterprise.

**3.4.4. Ativação e Configuração de Módulos:** Conforme o documento de planejamento, os seguintes módulos devem ser ativados e configurados tanto para o projeto "IncubaScience Hub" quanto para os projetos template das Deeptechs (conforme aplicável):

- **Pacotes de Trabalho:** Essencial, sempre ativo.
- **Cronograma (Gantt):** Para visualização de prazos e dependências.
- **Quadros (Kanban/Agile Boards):** Para gestão visual.
- **Reuniões:** Para agendamento e documentação de reuniões.
- **Documentos:** Para gerenciamento de arquivos.
- **Wiki:** Para base de conhecimento e documentação colaborativa.
- **Fórum:** Para discussões.
- **Custos e Orçamentos:** Para rastreamento financeiro.
- **Relatórios:** Para visualização de dados e progresso.
- **Tempo e Custos (Time and Cost tracking):** Para registrar horas e despesas.
- **Calendário:** Para visualização de eventos e prazos.

A ativação é feita em "Configurações do Projeto" -> "Módulos". Selecionar os módulos desejados e salvar.

A tradução fiel do "Análise e Validação..." para a estrutura do OpenProject é um passo crítico. A flexibilidade da plataforma, com seus tipos de trabalho, campos personalizados e módulos, permite uma modelagem precisa das necessidades da incubadora, mas requer atenção aos detalhes durante a configuração para garantir que todos os requisitos funcionais sejam atendidos.

### 3.5. Configuração de Quadros Kanban (Boards)

Os quadros Kanban são ferramentas visuais poderosas para gerenciar fluxos de trabalho. No OpenProject, existem diferentes tipos de quadros (Básico, Ação, Versão, etc.) que podem ser adaptados para diversas finalidades dentro da IncubaScience.

- **Quadro de Gestão Geral (Incubadora - "IncubaScience Hub"):**
    - **Tipo de Quadro:** Ação (Action Board), baseado no campo "Status".
    - **Propósito:** Gerenciar o fluxo das principais iniciativas e atividades da própria incubadora.
    - **Colunas Sugeridas:**
        - Backlog de Ideias: Novas propostas, iniciativas não priorizadas.
        - Planejado: Iniciativas aprovadas e com data para iniciar.
        - Em Andamento: Atividades em execução.
        - Em Revisão Interna: Entregas aguardando validação pela equipe da incubadora.
        - Concluído: Atividades finalizadas.
        - Pendente/Bloqueado: Atividades que aguardam algo.
        - Cancelado/Adiado: Iniciativas descontinuadas ou postergadas.
    - **Filtros:** Pacotes de trabalho pertencentes ao projeto "IncubaScience Hub".
    - **Ações de Coluna:** Mover um card para uma coluna automaticamente atualiza o campo "Status" do pacote de trabalho correspondente.
- **Quadro de Acompanhamento das Deeptechs (Visão da Incubadora - "IncubaScience Hub"):**
    - **Tipo de Quadro:** Ação, baseado em um campo personalizado "Fase da Deeptech no Programa" (Lista: Ex: "Seleção", "Diagnóstico", "Desenvolvimento Inicial", "MVP/Validação", "Tração", "Escala", "Graduada").
    - **Propósito:** Fornecer à equipe da incubadora uma visão macro do estágio de cada Deeptech no programa.
    - **Cards:** Cada card representa uma Deeptech (pode ser um Pacote de Trabalho mestre para cada Deeptech, criado no projeto "IncubaScience Hub" e vinculado ao subprojeto da Deeptech, ou usar um filtro que puxe os projetos das Deeptechs se o quadro permitir visualização de projetos como cards - menos provável).
    - **Colunas:** Mapeadas para os valores do campo "Fase da Deeptech no Programa".
    - **Ações de Coluna:** Mover o card da Deeptech para uma nova coluna atualiza o campo "Fase da Deeptech no Programa".
    - **Informações no Card:** Nome da Deeptech, Principais KPIs (via campos personalizados), Próximo Marco.
- **Quadro de Tarefas por Deeptech (Dentro do projeto de cada Deeptech):**
    - **Tipo de Quadro:** Ação (baseado no Status) ou Básico.
    - **Propósito:** Para a equipe da Deeptech gerenciar suas tarefas diárias e sprints. A incubadora também pode ter visibilidade.
    - **Colunas Padrão (Exemplo para Desenvolvimento):**
        - Backlog do Produto
        - A Fazer (Sprint Atual)
        - Em Desenvolvimento
        - Em Teste/QA
        - Em Revisão (Líder Deeptech/Mentor)
        - Concluído
    - **Filtros:** Pacotes de trabalho pertencentes ao projeto da Deeptech específica.
    - **Múltiplos Quadros:** Cada Deeptech pode criar quadros adicionais para diferentes fluxos (ex: Marketing, Vendas).
- **Quadro de Solicitações de Mentoria/Consultoria (Incubadora - "IncubaScience Hub"):**
    - **Tipo de Quadro:** Ação, baseado em um campo personalizado "Status da Solicitação" (Lista: Ex: "Nova Solicitação", "Análise pela Incubadora", "Mentor/Consultor Designado", "Agendada", "Em Andamento", "Realizada", "Feedback Coletado", "Concluída").
    - **Propósito:** Gerenciar o fluxo de pedidos de apoio das Deeptechs.
    - **Cards:** Pacotes de Trabalho do tipo "Solicitação de Mentoria" ou "Solicitação de Consultoria".
    - **Ações de Coluna:** Atualizam o status da solicitação.

**Configuração dos Quadros :**

1. No projeto desejado, ir para o módulo "Quadros".
2. Clicar em "+ Criar novo quadro".
3. Escolher o tipo de quadro (Básico, Ação, etc.).
    - Para Quadros de Ação, selecionar o atributo que as colunas irão gerenciar (ex: Status, Prioridade, um campo personalizado de lista).
4. Definir as colunas e, para Quadros de Ação, mapear cada coluna para um valor específico do atributo escolhido.
5. Configurar filtros para determinar quais pacotes de trabalho aparecerão como cards no quadro.
6. Usar "Configurar visão" (menu kebab) para:
    - Definir quais informações dos pacotes de trabalho são exibidas nos cards.
    - Configurar regras de destaque de cards (ex: por prioridade alta, por prazo próximo).
    - Adicionar sub-colunas se necessário (ex: agrupar por Atribuído a dentro de cada coluna de Status).

Os quadros Kanban devem ser desenhados para espelhar os processos reais da incubadora e das Deeptechs. A capacidade dos Quadros de Ação de modificar atributos automaticamente ao mover cards é uma ferramenta poderosa para manter os dados atualizados e reduzir o esforço manual, promovendo um fluxo de trabalho mais ágil e transparente.

### 3.6. Criação de Dashboards e Relatórios

Dashboards e relatórios são cruciais para monitorar o progresso, identificar gargalos e comunicar o status dos projetos e do programa de incubação como um todo. OpenProject oferece flexibilidade na criação dessas visualizações.

- **Dashboard de Gestão Geral da Incubadora (Visão Geral do Projeto "IncubaScience Hub"):** A página "Visão Geral" de um projeto no OpenProject pode ser customizada como um dashboard, adicionando diversos widgets.
    - **Widgets Sugeridos:**
        - **Progresso Geral do Programa:** Gráfico de pizza ou barras mostrando o status (Ex: % concluído) das Etapas principais (Pacotes de Trabalho de alto nível do plano da incubadora).
        - **Próximos Marcos Globais:** Lista de Pacotes de Trabalho do tipo "Marco" com datas futuras próximas, de todo o portfólio (Incubadora e Deeptechs).
        - **Tarefas Atrasadas da Incubadora:** Lista de Pacotes de Trabalho do projeto "IncubaScience Hub" que estão com prazo vencido.
        - **Distribuição de Carga da Equipe da Incubadora:** Gráfico mostrando o número de tarefas abertas atribuídas a cada membro da equipe da incubadora.
        - **Orçamento Geral da Incubadora:** Widget de custos mostrando o planejado vs. realizado para o projeto "IncubaScience Hub".
        - **Lista de Deeptechs por Fase:** Um widget de consulta de pacotes de trabalho (se as Deeptechs forem representadas por WPs mestres) ou um relatório customizado embutido, mostrando em qual fase do programa cada Deeptech se encontra (baseado no campo personalizado "Fase da Deeptech no Programa").
        - **Notícias e Anúncios:** Widget de notícias para comunicação importante da incubadora.
- **Dashboard de Acompanhamento por Deeptech (Visão Geral do Projeto de cada Deeptech):** Similarmente, a página "Visão Geral" de cada projeto de Deeptech pode ser customizada.
    - **Widgets Sugeridos:**
        - **Evolução TRL/MRL:** Gráfico de linha ou barras mostrando a progressão dos campos personalizados Nível TRL e Nível MRL ao longo do tempo (requer snapshots periódicos ou um histórico desses valores).
        - **Horas de Mentoria/Consultoria Recebidas:** Contador ou soma de horas de pacotes de trabalho do tipo "Mentoria" ou "Consultoria" concluídos para a Deeptech.
        - **Status ESG da Deeptech:** Exibição do valor atual do campo personalizado Status ESG.
        - **Próximos Marcos da Deeptech:** Lista de Pacotes de Trabalho do tipo "Marco" específicos do projeto da Deeptech.
        - **Tarefas Críticas/Bloqueadas da Deeptech:** Lista de tarefas com alta prioridade ou status "Bloqueado" dentro do projeto da Deeptech.
        - **Orçamento da Deeptech (se aplicável):** Widget de custos para o orçamento específico da Deeptech.
        - **Progresso do Sprint Atual (se ágil):** Burndown chart ou similar.
- **Dashboard "Minha Página" para Usuários :** Cada usuário tem uma "Minha Página" personalizável. É útil configurá-la para exibir:
    - **Pacotes de Trabalho Atribuídos a Mim:** Lista de todas as tarefas pelas quais o usuário é responsável.
    - **Reuniões Agendadas:** Próximas reuniões onde o usuário é participante ou organizador.
    - **Atividade Recente:** Feed das últimas atualizações nos projetos e tarefas que o usuário acompanha.
    - **Tempo Gasto Recentemente:** Se o rastreamento de tempo for usado.
- **Relatórios Personalizados:** O módulo "Relatórios" ou a funcionalidade de salvar consultas na visualização de "Pacotes de Trabalho" permite criar relatórios tabulares e gráficos.
    - **Relatório de Progresso das Deeptechs:** Uma tabela de pacotes de trabalho (filtrada para os WPs mestres das Deeptechs ou projetos de Deeptechs), agrupada por Deeptech, mostrando colunas como Nome da Deeptech, Fase Atual, % Concluído do Plano da Deeptech, Nº de Tarefas Atrasadas, Próximo Marco Importante, Última Atualização do Gestor.
    - **Relatório de KPIs das Deeptechs:** Similar ao anterior, mas focado em colunas que exibem os campos personalizados de KPIs (TRL, MRL, Receita, Clientes, etc.). Pode ser exportado para análise externa.
    - **Relatório de Alocação de Recursos da Incubadora:** Tabela de pacotes de trabalho do projeto "IncubaScience Hub", agrupada por membro da equipe da incubadora, mostrando tarefas atribuídas, estimativa de tempo e tempo gasto.
    - **Relatório de Orçamento Detalhado:** Utilizando o módulo de Custos, gerar relatórios de custos planejados vs. reais por projeto, por tipo de custo, ou por período.

Os dashboards devem ser projetados para fornecer informações acionáveis e de fácil compreensão para os diferentes públicos. A combinação das páginas de "Visão Geral do Projeto" (para visões de portfólio e de projeto individual) e da "Minha Página" (para produtividade individual) cobre uma ampla gama de necessidades de visualização de dados no OpenProject.

### 3.7. Definição e Acompanhamento de KPIs e Ranking de Deeptechs

O acompanhamento de Indicadores Chave de Performance (KPIs) e a criação de um sistema de ranking para as Deeptechs são requisitos importantes para a gestão da IncubaScience.

- **Definição de KPIs:** Os KPIs devem abranger diferentes aspectos do progresso e impacto:
    - **KPIs de Processo da Incubação (para a IncubaScience medir sua eficiência):**
        - Número de mentorias realizadas por Deeptech.
        - Número de consultorias especializadas acionadas.
        - Número de formações/workshops oferecidos e participação.
        - Taxa de cumprimento do cronograma das etapas de incubação.
        - Nível de satisfação das Deeptechs com o programa (coletado via formulários externos).
    - **KPIs de Resultado das Deeptechs (para medir o progresso de cada Deeptech):**
        - Evolução do Nível TRL (Technology Readiness Level).
        - Evolução do Nível MRL (Market Readiness Level).
        - Número de protótipos/MVPs desenvolvidos e validados.
        - Número de clientes ativos/usuários.
        - Receita gerada (MRR/ARR, se aplicável).
        - Captação de recursos/investimentos (valor e estágio).
        - Número de conexões estratégicas estabelecidas (parcerias, investidores).
        - Evolução dos indicadores ESG (se aplicável).
    - **KPIs de Impacto do Programa (para medir o sucesso da incubadora a longo prazo):**
        - Taxa de sobrevivência das Deeptechs (ex: após 1, 2, 5 anos).
        - Número de empregos diretos gerados pelas Deeptechs graduadas.
        - Faturamento total gerado pelas Deeptechs graduadas.
        - Número de patentes ou registros de propriedade intelectual.
        - Contribuição para os Objetivos de Desenvolvimento Sustentável (ODS).
- **Implementação dos KPIs no OpenProject:**
    1. **Campos Personalizados:** Criar campos personalizados para cada KPI que precisa ser rastreado diretamente no OpenProject. Por exemplo:
        - KPI_TRL_Atual (Tipo: Lista ou Inteiro)
        - KPI_MRL_Atual (Tipo: Lista ou Inteiro)
        - KPI_Numero_Clientes (Tipo: Inteiro)
        - KPI_Receita_Mensal (Tipo: Moeda ou Número)
        - KPI_Investimento_Captado (Tipo: Moeda ou Número)
        - KPI_Data_Ultima_Medicao (Tipo: Data)
    2. **Local de Registro:** Estes campos podem ser adicionados ao Tipo de Trabalho "Projeto" (se os projetos das Deeptechs forem o objeto principal de acompanhamento de KPIs) ou a um Pacote de Trabalho mestre que represente cada Deeptech dentro do projeto "IncubaScience Hub".
    3. **Atualização:** Os valores dos KPIs podem ser atualizados:
        - **Manualmente:** Pela equipe da incubadora ou pelas próprias Deeptechs (se tiverem permissão para editar esses campos em seus "perfis" de projeto/WP).
        - **Via API:** Se os dados dos KPIs existirem em sistemas externos (CRMs, planilhas, plataformas financeiras), o script Python pode ser usado para sincronizar esses valores com os campos personalizados no OpenProject.
- **Ranking de Deeptechs:** O OpenProject não possui uma funcionalidade nativa de cálculo de ranking complexo. A implementação exigirá uma abordagem combinada:
    1. **Campo Personalizado de Pontuação:** Criar um campo personalizado chamado Deeptech_Pontuacao_Ranking (Tipo: Número) no objeto que representa a Deeptech (projeto ou WP mestre).
    2. **Lógica de Cálculo do Ranking:**
        - **Definir a Fórmula:** A IncubaScience precisará definir uma fórmula ou um conjunto de critérios e pesos para calcular a pontuação de ranking com base nos KPIs definidos. (Ex: 0.3 * (TRL/9) + 0.3 * (MRL/9) + 0.2 * (Receita_Normalizada) + 0.2 * (Clientes_Normalizados)).
        - **Cálculo:**
            - **Manual/Planilha:** Os KPIs são exportados do OpenProject (ou coletados de outras fontes), a pontuação é calculada em uma planilha, e o resultado é inserido manualmente no campo Deeptech_Pontuacao_Ranking.
            - **Script Python via API:** Um script Python pode ser desenvolvido para:
                1. Ler os valores dos KPIs de cada Deeptech via API do OpenProject.
                2. Aplicar a fórmula de ranking.
                3. Atualizar o campo Deeptech_Pontuacao_Ranking de cada Deeptech via API. Este script pode ser executado periodicamente (ex: mensalmente).
    3. **Visualização do Ranking:**
        - **Relatório de Pacotes de Trabalho:** Criar uma visualização de tabela de pacotes de trabalho (filtrada para os WPs mestres das Deeptechs), adicionar a coluna Deeptech_Pontuacao_Ranking e ordenar por ela em ordem decrescente.
        - **Dashboard:** Se possível, criar um widget de gráfico de barras (ou tabela) na Visão Geral do projeto "IncubaScience Hub" que mostre as Deeptechs e suas pontuações de ranking.

A implementação de um sistema de KPIs e ranking no OpenProject é factível através da combinação inteligente de campos personalizados e, para o ranking, de uma lógica de cálculo que pode ser manual ou automatizada via API. A clareza na definição dos KPIs e da fórmula de ranking é o primeiro passo essencial.

### 3.8. Configuração de Workflows e Automações Baseadas em Eventos

Workflows e automações são fundamentais para padronizar processos, reduzir erros e aumentar a eficiência operacional da incubadora e das Deeptechs.

- **Workflows (Transições de Status):** Workflows no OpenProject definem as transições de status permitidas para um pacote de trabalho, dependendo do seu tipo e do papel do usuário que está tentando realizar a alteração.
    - **Definição por Tipo de Trabalho:** É crucial definir workflows específicos para os diferentes Tipos de Trabalho. Por exemplo:
        - **Workflow para "Demanda da Incubadora para Deeptech":**
            1. Nova (Criada pela Incubadora)
            2. Em Análise pela Deeptech (Deeptech move para este status)
            3. Aceita / Em Desenvolvimento (Deeptech move)
            4. Entregue para Validação (Deeptech move para Incubadora validar)
            5. Concluída (Incubadora aprova) OU Rejeitada / Requer Ajustes (Incubadora devolve)
        - **Workflow para "Tarefa de Desenvolvimento (Deeptech)":**
            1. Backlog
            2. A Fazer
            3. Em Progresso
            4. Em Revisão (Pares/Líder)
            5. Concluída
        - **Workflow para "Marco de Projeto":**
            1. Planejado
            2. Em Andamento (se aplicável, ou direto para Concluído)
            3. Alcançado
            4. Atrasado (pode ser um status ou um indicador visual)
    - **Configuração:** Em "Administração" -> "Tipos de Trabalho", selecionar um tipo, ir para a aba "Fluxo de Trabalho". Para cada papel (ex: Lider_Deeptech, Gestor_Incubadora_Portfolio), marcar quais transições de status são permitidas.
- **Custom Actions (Ações Personalizadas - Recurso Enterprise) :** Custom Actions permitem criar botões em pacotes de trabalho que, ao serem clicados, executam um conjunto predefinido de atualizações de atributos. Isso é uma forma de automação iniciada pelo usuário.
    - **Exemplos para IncubaScience:**
        - **Botão "Encaminhar Demanda para Deeptech X":**
            - **Condição:** Aparece em WPs do tipo "Demanda" no projeto da Incubadora, com status "Nova".
            - **Ações:** Muda o status para "Em Análise pela Deeptech", atribui a um grupo/líder da Deeptech X, define um campo personalizado "Deeptech Responsável" para "Deeptech X".
        - **Botão "Aprovar Entrega da Deeptech":**
            - **Condição:** Aparece em WPs do tipo "Demanda" com status "Entregue para Validação", visível para Gestor_Incubadora_Portfolio.
            - **Ações:** Muda o status para "Concluída", preenche um campo "Data de Aprovação", notifica a Deeptech (via comentário automático ou esperando a notificação de mudança de status).
        - **Botão "Solicitar Revisão de Mentoria":**
            - **Condição:** Em um WP do tipo "Sessão de Mentoria" com status "Realizada".
            - **Ações:** Muda status para "Aguardando Feedback da Deeptech", atribui ao líder da Deeptech.
    - **Configuração:** Em "Administração" -> "Pacotes de Trabalho" -> "Ações Personalizadas". Definir nome do botão, descrição, condições de visibilidade (tipo de WP, status, papel, projeto) e as ações a serem executadas (mudança de status, atualização de campos).
- **Automação Baseada em Eventos (Notificações e Limitações):**
    - **Notificações por Email:** OpenProject possui um sistema robusto de notificações por email que são disparadas por eventos como:
        - Criação de pacote de trabalho.
        - Atribuição de um pacote de trabalho.
        - Mudança de status.
        - Comentários adicionados.
        - Prazos se aproximando. Estas são configuradas em "Administração" -> "Configurações do Sistema" -> "Notificações por Email" e nas preferências de notificação de cada usuário.
    - **"Atividades em Lotes" e "Enviar Notificados Emails (em Lote)":**
        - O OpenProject não possui uma funcionalidade nativa para executar "atividades em lote" (ex: mudar o status de 50 tarefas de uma vez com base em um critério complexo) ou enviar emails em lote customizados diretamente pela interface de forma altamente programática e condicional, além das notificações padrão.
        - **Para alteração de dados em lote:** A API v3, utilizada através do script Python, é a ferramenta adequada. O script pode buscar pacotes de trabalho que atendam a certos critérios e então atualizar seus atributos em lote.
        - **Para envio de emails em lote customizados:** Seria necessário usar a API para extrair os dados e destinatários e, em seguida, usar um serviço de email externo (SendGrid, Amazon SES, etc.) acionado pelo script Python para compor e enviar os emails. As notificações padrão do OpenProject são individuais e baseadas em eventos de WP.

As Custom Actions da edição Enterprise oferecem uma maneira poderosa de simplificar e padronizar fluxos de trabalho comuns. Para automações mais complexas, condicionais ou que envolvam lógica que transcende as transições de status e atualizações de campo diretas, a API do OpenProject combinada com scripts Python será a solução. É importante distinguir entre as automações configuráveis na UI (workflows, custom actions, notificações) e aquelas que exigirão desenvolvimento externo via API.

### 3.9. Gestão de Orçamentos, Formulários e Comunicação

A gestão eficaz de uma incubadora envolve o controle de orçamentos, a coleta de informações através de formulários e uma comunicação clara.

- **Orçamentos :** O OpenProject oferece um módulo de Custos e Orçamentos que pode ser utilizado pela IncubaScience para:
    1. **Planejamento de Custos:**
        - Ativar o módulo "Orçamentos" (ou "Custos") nos projetos relevantes (ex: "IncubaScience Hub" para o orçamento geral da incubadora, e opcionalmente nos projetos das Deeptechs se houver orçamentos individuais para elas).
        - Criar itens de orçamento vinculados a fases ou pacotes de trabalho específicos. Definir custos planejados para cada item.
    2. **Rastreamento de Custos Reais:**
        - **Taxas Horárias:** Definir taxas horárias para os membros da equipe (sejam da incubadora ou mentores/consultores pagos por hora). O tempo registrado por esses membros em pacotes de trabalho será automaticamente convertido em custo.
        - **Custos Unitários:** Registrar custos unitários para despesas que não são baseadas em tempo (ex: software, materiais, serviços de terceiros). Estes podem ser associados a pacotes de trabalho específicos.
    3. **Relatórios de Custos:**
        - Gerar relatórios que comparam custos planejados com custos reais.
        - Analisar despesas por projeto, por tipo de custo, ou por período.
        - Esta funcionalidade é vital para a incubadora gerenciar seus próprios recursos financeiros e, se aplicável, o uso de verbas destinadas às Deeptechs.
- **Formulários:** O termo "Formulários" no contexto do OpenProject geralmente se refere à **customização dos formulários de criação e edição de Pacotes de Trabalho**.
    - **Customização de Formulários de Pacotes de Trabalho:**
        - Em "Administração" -> "Tipos de Trabalho" -> selecionar um tipo -> "Configuração de formulário".
        - Aqui é possível definir quais campos (padrão e personalizados) aparecem no formulário para aquele tipo de trabalho, sua ordem, e se são somente leitura ou editáveis.
        - Grupos de atributos podem ser criados para organizar visualmente os campos no formulário.
    - **Formulários para Coleta de Dados Externos:**
        - O OpenProject não possui uma funcionalidade nativa para criar formulários web públicos (como Google Forms ou Typeform) para, por exemplo, inscrições de Deeptechs no programa de incubação ou coleta de feedback anônimo.
        - **Solução:** Para tais necessidades, a IncubaScience deverá utilizar ferramentas de terceiros especializadas em formulários. Os dados coletados por essas ferramentas podem, subsequentemente, ser importados para o OpenProject via:
            - **Entrada Manual:** Se o volume for baixo.
            - **Importação CSV:** OpenProject suporta importação de pacotes de trabalho via CSV.
            - **API:** Um script Python pode ler os dados de uma planilha ou da API da ferramenta de formulários e criar/atualizar pacotes de trabalho ou outros objetos no OpenProject.
- **Comunicação:** OpenProject oferece diversas ferramentas para facilitar a comunicação e colaboração:
    - **Comentários em Pacotes de Trabalho:** Principal meio para discussões contextuais sobre tarefas específicas. Permite mencionar (@username) outros usuários.
    - **Módulo de Fóruns:** Pode ser ativado por projeto para discussões temáticas mais amplas. Um fórum no "IncubaScience Hub" para anúncios gerais e outro em cada projeto de Deeptech para suas discussões internas.
    - **Módulo Wiki:** Essencial para criar e manter uma base de conhecimento colaborativa. A IncubaScience pode ter uma wiki central com processos e guias, e cada Deeptech pode ter sua própria wiki para documentação de produto, processos internos, etc..
    - **Notificações por Email:** Mantêm os usuários informados sobre atualizações relevantes (configuráveis pelo administrador e pelo usuário).
    - **Módulo de Reuniões:** Permite agendar reuniões, convidar participantes (internos e externos, se configurado), criar pautas e registrar atas. As atas podem ser vinculadas a pacotes de trabalho.
    - **Página de Notícias do Projeto:** Para anúncios importantes dentro de um projeto específico.
- **Upload e Download de Arquivos:**
    - **Anexos em Pacotes de Trabalho:** Arquivos podem ser anexados diretamente a qualquer pacote de trabalho.
    - **Módulo de Documentos:** Um local centralizado por projeto para armazenar e gerenciar arquivos, com controle de versão básico e a capacidade de organizar em pastas.
    - **Integrações (Opcional):** OpenProject oferece integrações com Nextcloud e OneDrive/SharePoint. Se a IncubaScience ou as Deeptechs já utilizam essas plataformas, a integração pode centralizar o acesso aos arquivos.

É importante que a IncubaScience compreenda que a funcionalidade de "Formulários" no OpenProject é focada na customização da interface de entrada de dados para os objetos internos da plataforma (principalmente Pacotes de Trabalho). Para interação com o público externo ou coleta de dados de forma estruturada fora do sistema, será necessário integrar soluções de formulários dedicadas, utilizando a API do OpenProject para trazer os dados para dentro da plataforma, se necessário.

### 3.10. Criação de Templates de Projeto

Templates de projeto são um recurso poderoso no OpenProject para padronizar a criação de novos projetos, economizando tempo e garantindo consistência. Para a IncubaScience, que lidará com o onboarding de múltiplas Deeptechs, a criação de um template de projeto robusto é fundamental.

**Processo de Criação de um Template de Projeto para Deeptechs:**

1. **Criar um Projeto Base:**
    - Crie um novo projeto no OpenProject que servirá como o modelo. Dê um nome claro, como "Template Padrão Deeptech IncubaScience" ou "IncubaScience - Modelo de Projeto para Deeptechs".
2. **Configurar o Projeto Modelo Detalhadamente:**
    - **Membros Padrão:** Adicionar usuários ou grupos que devem ser membros de todos os projetos de Deeptech por padrão. Por exemplo, adicionar o grupo Grupo_Gestores_Incubadora com o papel Gestor_Incubadora_Portfolio para garantir que a equipe da incubadora tenha acesso de supervisão desde o início.
    - **Módulos Ativados:** Selecionar os módulos que devem estar ativos por padrão para cada projeto de Deeptech (ex: Pacotes de Trabalho, Cronograma, Quadros, Documentos, Wiki, Orçamento).
    - **Tipos de Trabalho e Workflows:** Garantir que os Tipos de Trabalho relevantes para Deeptechs (ex: Tarefa, User Story, Bug, Marco da Deeptech) estejam configurados com seus respectivos workflows e formulários (campos visíveis/obrigatórios).
    - **Campos Personalizados:** Ativar todos os campos personalizados que são relevantes para o acompanhamento das Deeptechs (ex: Nível TRL, Nível MRL, Status ESG, KPIs específicos).
    - **Estrutura de Pacotes de Trabalho Padrão (WBS - Work Breakdown Structure):** Criar uma estrutura inicial de pacotes de trabalho que reflita as fases comuns do ciclo de vida de uma Deeptech ou as entregas esperadas pela incubadora. Por exemplo :
        - Fase 1: Diagnóstico e Planejamento
            - Tarefa 1.1: Preenchimento do Diagnóstico Inicial
            - Tarefa 1.2: Elaboração do Plano de Desenvolvimento Individual
        - Fase 2: Desenvolvimento do Produto/MVP
            - Marco 2.1: MVP Concluído
        - Fase 3: Validação de Mercado
            - ...
    - **Quadros Kanban Modelo:** Configurar quadros Kanban básicos que as Deeptechs possam usar ou adaptar (ex: um quadro de tarefas simples com colunas "A Fazer", "Em Andamento", "Concluído").
    - **Relatórios e Dashboards Modelo (Visão Geral do Projeto):** Configurar a página de "Visão Geral" do projeto modelo com widgets que seriam úteis para uma Deeptech (ex: tarefas atribuídas, próximos marcos, um gráfico de burndown se aplicável).
    - **Configurações do Projeto:** Ajustar outras configurações como categorias de pacotes de trabalho, versões (se aplicável), etc.
3. **Marcar como Template:**
    - Navegar para as "Configurações do Projeto" do projeto modelo.
    - Na aba "Informações", encontrar a opção "Definir como modelo" (ou "Set as template") e ativá-la. Esta opção geralmente está disponível apenas para administradores do sistema.
    - O projeto agora aparecerá na lista de templates disponíveis ao criar um novo projeto.

**Utilização do Template de Projeto:**

- Ao criar um novo projeto para uma Deeptech (ex: "Deeptech Delta"):
    1. Clicar em "+ Projeto" (ou a opção equivalente para adicionar um novo projeto).
    2. Fornecer o nome do novo projeto (ex: "Deeptech Delta").
    3. Na seção de seleção de template, escolher o "Template Padrão Deeptech IncubaScience" da lista.
    4. O OpenProject copiará as configurações, membros, módulos, estrutura de pacotes de trabalho, etc., do template para o novo projeto.
- **Alternativa: Copiar Projeto:** Outra forma de usar um projeto como base é copiá-lo diretamente. Nas configurações do projeto modelo, existe a opção "Copiar projeto". Isso cria uma cópia que pode então ser renomeada e ajustada. A funcionalidade de "template" é mais formal e integrada ao fluxo de criação de novos projetos.

A utilização de templates de projeto pela IncubaScience garantirá que cada nova Deeptech comece com uma estrutura de gerenciamento alinhada com as metodologias e requisitos da incubadora. Isso não apenas economiza um tempo considerável de configuração manual para cada nova incubada, mas também padroniza a coleta de dados e o acompanhamento, facilitando a geração de relatórios consolidados e a comparação entre Deeptechs.

### 3.11. Plano de Implementação Detalhado (Ordem de Cadastro pelo Requisito)

Para implementar a solução OpenProject para a IncubaScience de forma organizada, é crucial seguir uma ordem lógica de configuração, respeitando as dependências entre os diferentes elementos do sistema. O plano abaixo detalha essa sequência, baseando-se nos requisitos do documento "Análise e Validação do Planejamento para OpenProject" e nas funcionalidades da plataforma.

**Ordem de Implementação Sugerida:**

1. **Fase 1: Configurações Globais e Fundamentais (Administrador do OpenProject)**
    - **1.1. Tipos de Trabalho:**
        - Acessar: "Administração" -> "Tipos de Trabalho".
        - Criar/Verificar: "Fase", "Pacote de Trabalho", "Tarefa", "Marco", "Reunião", conforme especificado no documento de planejamento.
        - Para cada tipo: Definir atributos padrão, se está ativo, se o progresso é calculado por status ou tempo, e se as datas são manuais ou automáticas.
    - **1.2. Campos Personalizados:**
        - Acessar: "Administração" -> "Campos Personalizados".
        - Criar todos os campos listados na Seção 3.4.3 deste relatório (Responsável, Deeptech(s) Envolvida(s), Status ESG, Nível TRL, Nível MRL, Tipo de Atividade da Incubadora, ODS Relacionados, e outros sugeridos como ID da Deeptech, Área de Foco, etc.).
        - Para cada campo: Definir nome, formato (Texto, Lista, Usuário, etc.), opções (para listas), se é obrigatório, se é filtro, se é para todos os projetos.
    - **1.3. Papéis e Permissões:**
        - Acessar: "Administração" -> "Usuários e permissões" -> "Papéis e permissões".
        - Criar os papéis customizados detalhados na Seção 3.3.1 e 3.3.2 (ex: Admin_Incubadora (verificar se o padrão serve), Gestor_Incubadora_Portfolio, Lider_Deeptech, Membro_Deeptech).
        - Para cada papel: Definir meticulosamente as permissões para cada módulo (Pacotes de Trabalho, Membros, Cronograma, etc.), conforme a matriz de permissões.
    - **1.4. Grupos de Usuários:**
        - Acessar: "Administração" -> "Usuários e permissões" -> "Grupos".
        - Criar os grupos planejados (ex: Grupo_Gestores_Incubadora, e grupos genéricos para papéis de Deeptech como Template_Deeptech_Lideres, Template_Deeptech_Membros que podem ser replicados ou usados como modelo).
    - **1.5. Usuários Iniciais (Equipe da Incubadora):**
        - Acessar: "Administração" -> "Usuários e permissões" -> "Usuários".
        - Criar as contas para os membros da equipe da IncubaScience.
        - Atribuir o papel Admin_Incubadora a pelo menos um usuário.
        - Adicionar os usuários relevantes aos grupos criados (ex: gestores ao Grupo_Gestores_Incubadora).
    - **1.6. Configurações de Notificações por Email:**
        - Acessar: "Administração" -> "Configurações do Sistema" -> "Notificações por Email".
        - Configurar os eventos que disparam notificações e os templates de email, se necessário.
    - **1.7. Módulos Globais e Configurações Gerais:**
        - Verificar em "Administração" -> "Configurações do Sistema" outras configurações relevantes (ex: autenticação, layout, API).
2. **Fase 2: Criação e Configuração do Projeto Principal da Incubadora**
    - **2.1. Criar Projeto "IncubaScience Hub":**
        - Como administrador, criar um novo projeto com nome "IncubaScience Hub" (ou similar) e um identificador único.
    - **2.2. Ativar Módulos:**
        - Em "Configurações do Projeto IncubaScience Hub" -> "Módulos", ativar todos os módulos necessários (Pacotes de Trabalho, Cronograma, Quadros, Relatórios, Wiki, Fórum, Documentos, Custos, Reuniões, etc.).
    - **2.3. Adicionar Membros da Equipe:**
        - Em "Configurações do Projeto IncubaScience Hub" -> "Membros", adicionar os usuários da equipe da incubadora e/ou o Grupo_Gestores_Incubadora com os papéis apropriados (ex: Gestor_Incubadora_Portfolio).
    - **2.4. Configurar Campos Personalizados para o Projeto:**
        - Em "Configurações do Projeto IncubaScience Hub" -> "Campos Personalizados", garantir que os campos relevantes para as atividades da incubadora estejam ativos.
    - **2.5. Configurar Formulários dos Tipos de Trabalho:**
        - Em "Administração" -> "Tipos de Trabalho", para cada tipo usado no projeto da incubadora, ir em "Configuração de formulário" e ajustar quais campos (padrão e personalizados) são visíveis e sua ordem.
    - **2.6. Configurar Dashboard da Incubadora:**
        - Na página "Visão Geral" do projeto "IncubaScience Hub", adicionar e configurar os widgets conforme planejado na Seção 3.6.
3. **Fase 3: Criação e Configuração do Template de Projeto para Deeptechs**
    - **3.1. Criar Projeto Modelo:**
        - Criar um novo projeto (ex: "Template Padrão Deeptech IncubaScience").
    - **3.2. Configurar o Projeto Modelo:**
        - **Membros:** Adicionar Grupo_Gestores_Incubadora com o papel Gestor_Incubadora_Portfolio.
        - **Módulos:** Ativar os módulos padrão para Deeptechs.
        - **Campos Personalizados:** Ativar os campos personalizados relevantes para Deeptechs.
        - **Tipos de Trabalho e Formulários:** Configurar os formulários dos tipos de trabalho que as Deeptechs usarão, ativando os campos personalizados corretos.
        - **Estrutura de WBS Padrão:** Criar pacotes de trabalho representando fases e entregas comuns para Deeptechs.
        - **Quadros Kanban Modelo:** Criar exemplos de quadros.
        - **Relatórios e Dashboards Modelo:** Configurar a "Visão Geral" com widgets úteis para Deeptechs.
    - **3.3. Definir como Template:**
        - Em "Configurações do Projeto Modelo" -> "Informações", marcar "Definir como modelo".
4. **Fase 4: Cadastro das Atividades do Plano "Análise e Validação..."**
    - **4.1. Acessar Projeto "IncubaScience Hub".**
    - **4.2. Criar Pacotes de Trabalho:**
        - Para cada Etapa (0-7) do documento, criar um Pacote de Trabalho (tipo "Fase" ou "Pacote de Trabalho") no "IncubaScience Hub".
        - Para cada subitem (1.1, 2.1.1, etc.), criar Pacotes de Trabalho filhos (tipo "Tarefa" ou "Pacote de Trabalho") sob a Etapa correspondente.
        - Itens que são marcos devem ser do tipo "Marco".
    - **4.3. Preencher Detalhes:**
        - Para cada Pacote de Trabalho:
            - Definir "Assunto" conforme o texto do documento.
            - Atribuir "Responsável" (membro da equipe da incubadora).
            - Definir "Data de início" e "Data de fim" conforme os prazos (ex: Abril/Maio 2025).
            - Preencher outros campos personalizados relevantes (ex: Tipo de Atividade da Incubadora).
            - Estabelecer dependências (relações "precede/segue") entre tarefas, se necessário.
5. **Fase 5: Onboarding de uma Nova Deeptech (Processo Exemplo)**
    - **5.1. Criar Projeto para a Deeptech:**
        - Ao receber uma nova Deeptech, criar um novo projeto (ex: "Deeptech Exemplo IncubaScience").
        - Durante a criação, selecionar o "Template Padrão Deeptech IncubaScience".
        - Definir um identificador único (ex: Deeptech-exemplo).
        - Definir como subprojeto do "IncubaScience Hub" (ou de um projeto de portfólio).
    - **5.2. Adicionar Membros da Deeptech:**
        - Criar as contas de usuário para os membros da Deeptech Exemplo, se ainda não existirem.
        - No projeto "Deeptech Exemplo IncubaScience" -> "Membros":
            - Adicionar os líderes da Deeptech com o papel Lider_Deeptech.
            - Adicionar os demais membros da Deeptech com o papel Membro_Deeptech.
    - **5.3. Customizar Plano da Deeptech:**
        - Dentro do projeto da Deeptech, adaptar a estrutura de pacotes de trabalho herdada do template para refletir o plano de desenvolvimento específico e as demandas acordadas com a incubadora.

Esta ordem de implementação assegura que as configurações globais e estruturas base (como papéis e templates) estejam prontas antes de se popular os dados específicos do plano da incubadora ou de se criar projetos para as Deeptechs. Isso promove consistência e eficiência no processo de configuração.

