'use client';

import { motion } from 'framer-motion';
import { 
  MessageCircle, HardDrive, FileSpreadsheet, Mail, 
  AlertTriangle, Clock, Users, Search, 
  MessageSquare, FolderKanban, Database, Bell,
  CheckCircle2, ArrowRight, X
} from 'lucide-react';

const problems = [
  {
    icon: MessageCircle,
    title: 'Comunicacao Fragmentada',
    description: 'Discord para equipes tecnicas, WhatsApp para gestao, emails para externos. Contexto perdido entre ferramentas.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    pain: 'Decisoes importantes enterradas em threads do Discord'
  },
  {
    icon: HardDrive,
    title: 'Documentos Descentralizados',
    description: 'Cada membro usa seu proprio Google Drive. Versoes conflitantes, documentos duplicados, arquivos perdidos.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    pain: '3 versoes diferentes do mesmo documento de visao'
  },
  {
    icon: FileSpreadsheet,
    title: 'Planejamento Manual',
    description: 'Planilhas individuais no Excel/Sheets sem integracao. Status desatualizado, dependencias invisiveis.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    pain: 'Sprint planning leva 4h por ser manual'
  },
  {
    icon: Mail,
    title: 'Notificacoes Caoticas',
    description: 'Emails misturados com notificacoes de 5 ferramentas diferentes. Alertas criticos ignorados no ruido.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    pain: 'Deadline perdido por notificacao ignorada no email'
  },
];

const solutions = [
  {
    icon: MessageSquare,
    title: 'Comunicacao Unificada',
    description: 'Um canal central para todas as equipes. Integracao automatica com projetos e documentos.',
    detail: 'Canais por projeto, DMs, threads, webhook notifications',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    icon: FolderKanban,
    title: 'Gestao Integrada de Projetos',
    description: 'Kanban, Gantt, sprints, roadmaps — tudo conectado com a comunicacao em tempo real.',
    detail: 'Work packages, time tracking, sprint planning automatizado',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  {
    icon: Database,
    title: 'Documentacao Centralizada',
    description: 'Object Storage compativel com S3. Uma unica fonte de verdade para todos os documentos.',
    detail: 'Versionamento automatico, controle de acesso, busca full-text',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  {
    icon: Bell,
    title: 'Notificacoes Inteligentes',
    description: 'Alertas contextuais baseados no projeto e na equipe. Sem ruido, so o que importa.',
    detail: 'Mentions, atualizacoes de status, deadlines, reviews',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
];

const painPoints = [
  { icon: Clock, label: '8h/semana perdidas em contexto-switching' },
  { icon: AlertTriangle, label: '23% das decisoes atrasadas por info fragmentada' },
  { icon: Users, label: '3 ferramentas minimas por membro' },
  { icon: Search, label: '15 min/media para encontrar um documento' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function ProblemSection() {
  return (
    <section id="problema" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium tracking-wider uppercase mb-4">
            Diagnostico
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            O Problema <span className="text-red-400">Hoje</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Ferramentas desconectadas criam silos de informacao, atrasam decisoes 
            e comprometem a produtividade de toda a equipe.
          </p>
        </motion.div>

        {/* Pain Points Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16"
        >
          {painPoints.map((point, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10"
            >
              <point.icon size={18} className="text-red-400 shrink-0" />
              <span className="text-sm text-slate-300">{point.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Problem Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          {problems.map((problem, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className={`relative p-6 rounded-2xl ${problem.bg} border ${problem.borderColor} transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${problem.bg} border ${problem.borderColor} shrink-0`}>
                  <problem.icon size={22} className={problem.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold ${problem.color} mb-2`}>{problem.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-3">{problem.description}</p>
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-black/20">
                    <X size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-red-300/70">{problem.pain}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Arrow Transition */}
        <div className="flex justify-center my-16">
          <div className="flex flex-col items-center gap-2">
            <div className="w-px h-12 bg-gradient-to-b from-red-500/30 to-emerald-500/30" />
            <ArrowRight size={24} className="text-emerald-400 rotate-90" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Solucao Proposta</span>
          </div>
        </div>

        {/* Solution Section */}
        <div id="solucao" className="-mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium tracking-wider uppercase mb-4">
              Proposta
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              A Solucao <span className="text-emerald-400">Integrada</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Uma plataforma unificada que conecta comunicacao, projetos e documentos, 
              eliminando silos e acelerando decisoes.
            </p>
          </motion.div>

          {/* Solution Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-6"
          >
            {solutions.map((solution, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className={`p-6 rounded-2xl ${solution.bg} border ${solution.borderColor} transition-all duration-300 hover:scale-[1.02]`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${solution.bg} border ${solution.borderColor} shrink-0`}>
                    <solution.icon size={22} className={solution.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-semibold ${solution.color} mb-2`}>{solution.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">{solution.description}</p>
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5">
                      <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-emerald-300/70">{solution.detail}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
