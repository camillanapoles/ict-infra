'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, UserPlus, MessageSquare, FolderKanban, Upload,
  Bell, Users, CheckCircle2, ArrowRight, ArrowLeft, X,
  Monitor, Smartphone, Mail, Clock, FileText,
  Search, RefreshCw, Zap, Shield
} from 'lucide-react';

const useCases = [
  {
    phase: 'Primeiro Acesso',
    icon: Globe,
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.1)',
    borderColor: 'border-purple-500/20',
    steps: [
      {
        title: 'Acessa a Landing Page',
        description: 'O usuario entra em incubadora.io e ve informacoes sobre o programa, processo seletivo e beneficios da plataforma.',
        icon: Globe,
        before: 'Pesquisa em Google, encontra PDF desatualizado, envia email que nunca e respondido.',
        after: 'Encontra tudo em um so lugar: informacoes atualizadas, formulario de aplicacao e demonstracao ao vivo da plataforma.',
      },
      {
        title: 'Cria sua Conta',
        description: 'Cadastro simplificado com SSO. Recebe acesso automatico ao Mattermost e OpenProject em um unico login.',
        icon: UserPlus,
        before: 'Precisa criar conta separada em Google Drive, Discord, Trello, Slack — cada uma com senha diferente.',
        after: 'Um cadastro = acesso a todos os servicos. SSO centralizado com gestao de permissoes automatica.',
      },
    ],
  },
  {
    phase: 'Comunicacao Diaria',
    icon: MessageSquare,
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.1)',
    borderColor: 'border-blue-500/20',
    steps: [
      {
        title: 'Entra no Canal do Projeto',
        description: 'Canal dedicado ao projeto com todos os membros. Historico completo, threads organizadas e busca full-text.',
        icon: MessageSquare,
        before: 'Informacoes espalhadas entre WhatsApp, Discord e emails. Contexto perdido entre trocas de ferramenta.',
        after: 'Toda a conversa do projeto em um lugar. Busca instantanea. Threads para discussoes paralelas sem poluir o canal.',
      },
      {
        title: 'Recebe Notificacao de Tarefa',
        description: 'Quando uma tarefa e atribuida no OpenProject, o usuario recebe notificacao automatica no canal do projeto.',
        icon: Bell,
        before: 'Precisa checar manualmente Trello/Jira/Asana. Notificacoes de email enterradas na caixa de entrada.',
        after: 'Notificacao aparece no canal do projeto, em contexto. Clica e vai direto para a tarefa no OpenProject.',
      },
    ],
  },
  {
    phase: 'Gestao de Projetos',
    icon: FolderKanban,
    color: '#10B981',
    bgColor: 'rgba(16,185,129,0.1)',
    borderColor: 'border-emerald-500/20',
    steps: [
      {
        title: 'Cria/Atualiza Work Package',
        description: 'Define tarefas no OpenProject com responsavel, prazo, prioridade e vinculacao com documentos do S3.',
        icon: FolderKanban,
        before: 'Planilha no Google Sheets sem integracao com nada. Status desatualizado, ninguem sabe o que esta acontecendo.',
        after: 'Kanban board, Gantt chart, sprints. Todos veem o mesmo status atualizado em tempo real.',
      },
      {
        title: 'Compartilha Documento',
        description: 'Faz upload de um documento no S3 integrado ao OpenProject. Versao automatica, controle de acesso e preview inline.',
        icon: Upload,
        before: 'Envia PDF por email, fica perdido na conversa do WhatsApp. Nao sabe qual e a versao mais recente.',
        after: 'Documento atrelado ao work package. Historico de versoes automatico. Preview sem download. Permissoes por equipe.',
      },
    ],
  },
  {
    phase: 'Colaboracao e Escala',
    icon: Users,
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
    borderColor: 'border-amber-500/20',
    steps: [
      {
        title: 'Review Cruzado',
        description: 'Solicita review de um entregavel. O revisor recebe notificacao e pode comentar diretamente no documento e na tarefa.',
        icon: RefreshCw,
        before: 'Envia por email, nao tem rastreabilidade. Review fica perdido no meio de conversas paralelas.',
        after: 'Comment thread atrelado ao work package. Revisor e notificado. Status muda automaticamente ao aprovar.',
      },
      {
        title: 'Dashboard do Gestor',
        description: 'Admin da incubadora tem visao consolidada de todos os projetos, equipes, entregas e metricas de engajamento.',
        icon: Monitor,
        before: 'Reune dados manualmente de 5+ ferramentas para montar relatorio mensal.',
        after: 'Dashboard em tempo real com KPIs automaticos. Export em PDF. Alertas quando projetos estao em risco.',
      },
    ],
  },
];

const comparisonItems = [
  { metric: 'Tempo para encontrar um documento', before: '15 min', after: '5 seg', improvement: '99%' },
  { metric: 'Ferramentas por membro', before: '4-5 apps', after: '1 plataforma', improvement: '80%' },
  { metric: 'Contexto-switching por dia', before: '12x', after: '2x', improvement: '83%' },
  { metric: 'Tempo de onboarding', before: '2 dias', after: '30 min', improvement: '98%' },
  { metric: 'Fontes de informacao', before: '5+ silos', after: '1 unified', improvement: '80%' },
];

export default function UserFlowSection() {
  const [activePhase, setActivePhase] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [showComparison, setShowComparison] = useState(false);

  return (
    <section id="userflow" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium tracking-wider uppercase mb-4">
            Jornada do Usuario
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Fluxo de <span className="text-purple-400">Uso Real</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Siga a jornada de um membro da incubadora desde o primeiro acesso ate a
            colaboracao completa. Veja como era antes e como fica com a integracao.
          </p>
        </motion.div>

        {/* Metrics Comparison Toggle */}
        <div className="flex justify-center mb-12">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              showComparison
                ? 'bg-amber-500/15 border border-amber-500/20 text-amber-400'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Zap size={14} />
            {showComparison ? 'Ver Fluxo de Uso' : 'Ver Metricas de Impacto'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {showComparison ? (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="glass-card rounded-2xl p-6 sm:p-8 mb-8">
                <h3 className="text-xl font-semibold text-white mb-6 text-center">
                  Antes vs Depois — Metricas de Impacto
                </h3>
                <div className="grid gap-4">
                  {comparisonItems.map((item, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-4 rounded-xl bg-white/3 border border-white/5">
                      <span className="text-sm text-slate-300 sm:w-64 shrink-0">{item.metric}</span>
                      <div className="flex items-center gap-3 flex-1">
                        <span className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono">
                          {item.before}
                        </span>
                        <ArrowRight size={16} className="text-slate-600 shrink-0" />
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-mono">
                          {item.after}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-400 sm:w-16 text-right">
                        -{item.improvement}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="flow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Phase Navigation */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {useCases.map((phase, i) => (
                  <button
                    key={i}
                    onClick={() => { setActivePhase(i); setActiveStep(0); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activePhase === i
                        ? `${phase.bgColor} ${phase.borderColor} border text-white`
                        : 'bg-white/3 border border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <phase.icon size={14} />
                    {phase.phase}
                  </button>
                ))}
              </div>

              {/* Step Navigation */}
              <div className="flex justify-center gap-2 mb-8">
                {useCases[activePhase].steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeStep === i
                        ? `${useCases[activePhase].bgColor} border ${useCases[activePhase].borderColor}`
                        : 'bg-white/3 border border-white/5 text-slate-500'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">{i + 1}</span>
                    {useCases[activePhase].steps[i].title}
                  </button>
                ))}
              </div>

              {/* Step Detail */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activePhase}-${activeStep}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Before */}
                    <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                      <div className="flex items-center gap-2 mb-4">
                        <ArrowLeft size={16} className="text-red-400" />
                        <h4 className="text-red-400 font-semibold">Como era antes</h4>
                      </div>
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                          <X size={16} className="text-red-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm mb-2">
                            {useCases[activePhase].steps[activeStep].title}
                          </p>
                          <p className="text-red-300/60 text-sm leading-relaxed">
                            {useCases[activePhase].steps[activeStep].before}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* After */}
                    <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-center gap-2 mb-4">
                        <ArrowRight size={16} className="text-emerald-400" />
                        <h4 className="text-emerald-400 font-semibold">Como fica agora</h4>
                      </div>
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm mb-2">
                            {useCases[activePhase].steps[activeStep].title}
                          </p>
                          <p className="text-emerald-300/60 text-sm leading-relaxed">
                            {useCases[activePhase].steps[activeStep].after}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mt-6 p-4 rounded-xl bg-white/3 border border-white/5 text-center">
                    <p className="text-slate-400 text-sm">
                      {useCases[activePhase].steps[activeStep].description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="flex justify-center gap-2 mt-8">
                {useCases.map((phase, pi) =>
                  phase.steps.map((_, si) => (
                    <button
                      key={`${pi}-${si}`}
                      onClick={() => { setActivePhase(pi); setActiveStep(si); }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        activePhase === pi && activeStep === si
                          ? 'w-6 bg-emerald-400'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
