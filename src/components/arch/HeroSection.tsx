'use client';

import { motion } from 'framer-motion';
import { ArrowDown, Server, MessageSquare, FolderKanban, Globe, Shield } from 'lucide-react';

export default function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/3 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
            <Server size={14} />
            <span>Arquitetura Agnostica &bull; Kubernetes on VPS</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          <span className="text-white">Plataforma Integrada de</span>
          <br />
          <span className="gradient-text">Gestao e Comunicacao</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed"
        >
          Uma solucao unificada para incubadoras de startups que integra comunicacao
          em tempo real, gestao de projetos e documentacao centralizada — tudo
          em uma unica plataforma, escalavel e independente de provedor cloud.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mb-16"
        >
          {[
            { icon: MessageSquare, label: 'Comunicacao', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { icon: FolderKanban, label: 'Gestao de Projetos', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { icon: Globe, label: 'Object Storage (S3)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { icon: Shield, label: 'Landing Page', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
          ].map((item, i) => (
            <div
              key={i}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${item.color}`}
            >
              <item.icon size={16} />
              {item.label}
            </div>
          ))}
        </motion.div>

        {/* Tech Stack */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto mb-16"
        >
          {[
            { label: 'Orquestracao', value: 'Kubernetes (K3s)', color: 'from-emerald-500/20 to-emerald-500/5' },
            { label: 'Comunicacao', value: 'Mattermost', color: 'from-blue-500/20 to-blue-500/5' },
            { label: 'Projetos', value: 'OpenProject', color: 'from-teal-500/20 to-teal-500/5' },
            { label: 'Banco de Dados', value: 'PostgreSQL 17', color: 'from-amber-500/20 to-amber-500/5' },
          ].map((item, i) => (
            <div
              key={i}
              className={`rounded-xl bg-gradient-to-b ${item.color} border border-white/5 p-4`}
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-white font-semibold text-sm">{item.value}</p>
            </div>
          ))}
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          onClick={() => document.getElementById('problema')?.scrollIntoView({ behavior: 'smooth' })}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-400 transition-colors"
        >
          <span className="text-sm">Explorar a Arquitetura</span>
          <ArrowDown size={16} className="animate-bounce" />
        </motion.button>
      </div>
    </section>
  );
}
