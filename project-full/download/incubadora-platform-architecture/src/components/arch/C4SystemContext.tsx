'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Globe, Database, Mail, Monitor, ChevronRight, X } from 'lucide-react';

interface NodeDetail {
  title: string;
  description: string;
  tech: string[];
  role: string;
}

const nodeDetails: Record<string, NodeDetail> = {
  platform: {
    title: 'Plataforma Incubadora',
    description: 'Sistema centralizado que integra comunicacao em tempo real, gestao de projetos, documentacao e apresentacao institucional em uma unica plataforma.',
    tech: ['Kubernetes (K3s)', 'PostgreSQL 17', 'Object Storage S3', 'Ingress Controller'],
    role: 'Conteiner principal — orquestra todos os servicos internos',
  },
  equipe: {
    title: 'Equipe de Startups',
    description: 'Membros das startups incubadas que acessam a plataforma para comunicacao diaria, gestao de tarefas, acompanhamento de projetos e compartilhamento de documentos.',
    tech: ['Navegador Web', 'App Mobile', 'API REST/WebSocket'],
    role: 'Usuario primario — interage com todos os modulos da plataforma',
  },
  admin: {
    title: 'Administrador da Incubadora',
    description: 'Responsavel por gerenciar usuarios, configurar projetos, monitorar a saude do sistema e gerenciar permissoes de acesso.',
    tech: ['Painel Admin', 'CLI / API', 'Dashboard de Monitoramento'],
    role: 'Operador — gerencia a plataforma e os usuarios',
  },
  dns: {
    title: 'CDN / DNS Proxy',
    description: 'Camada de rede que gerencia resolucao DNS, terminacao SSL/TLS, cache de conteudo estatico e protecao contra ataques DDoS.',
    tech: ['Cloudflare / CDN', 'Let\'s Encrypt / SSL', 'DNS Proxy', 'WAF'],
    role: 'Boundary — ponto de entrada externo para toda a plataforma',
  },
  email: {
    title: 'Servidor de Email',
    description: 'Servico de notificacao por email para alertas do sistema, convites de usuario, relatorios automatizados e recuperacao de conta.',
    tech: ['SMTP Relay', 'Templates de Email', 'Queue System'],
    role: 'Ator externo — envia notificacoes transacionais',
  },
  storage: {
    title: 'Object Storage (S3)',
    description: 'Armazenamento de objetos compativel com S3 para documentos, anexos de projetos, avatares de usuarios, backups e arquivos estaticos da landing page.',
    tech: ['MinIO / S3 API', '20 GB Capacity', 'Bucket Policies', 'Versioning'],
    role: 'Sistema externo — persistencia de arquivos e documentos',
  },
  landing: {
    title: 'Landing Page',
    description: 'Site institucional da incubadora, servido no mesmo dominio, com informacoes sobre o programa, processo seletivo e integracao com os sistemas internos.',
    tech: ['Static Site', 'CDN Cache', 'SSR / SSG'],
    role: 'Boundary — fachada publica da incubadora',
  },
};

function C4Node({
  id, label, icon: Icon, x, y, width = 180, height = 70,
  color = '#10B981', bgColor = 'rgba(16,185,129,0.1)', active, onClick
}: {
  id: string; label: string; icon: React.ElementType;
  x: number; y: number; width?: number; height?: number;
  color?: string; bgColor?: string; active: boolean; onClick: () => void;
}) {
  return (
    <g
      className="c4-node"
      onClick={onClick}
    >
      <rect
        x={x} y={y} width={width} height={height}
        rx={12} ry={12}
        fill={bgColor}
        stroke={active ? color : `${color}40`}
        strokeWidth={active ? 2.5 : 1.5}
      />
      {/* Icon circle */}
      <circle
        cx={x + 28} cy={y + height / 2}
        r={14}
        fill={`${color}20`}
        stroke={`${color}50`}
        strokeWidth={1}
      />
      <foreignObject x={x + 14} y={y + height / 2 - 10} width={28} height={20}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
      </foreignObject>
      {/* Label */}
      <text
        x={x + 50} y={y + height / 2 + 1}
        fill={active ? '#F1F5F9' : '#CBD5E1'}
        fontSize={12}
        fontWeight={active ? 600 : 400}
        dominantBaseline="middle"
      >
        {label}
      </text>
      {/* Active indicator */}
      {active && (
        <circle cx={x + width - 12} cy={y + 12} r={4} fill={color} opacity={0.8}>
          <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

function Connection({ x1, y1, x2, y2, label, color = '#334155' }: {
  x1: number; y1: number; x2: number; y2: number;
  label?: string; color?: string;
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="6 3"
        className="animate-dash"
      />
      {label && (
        <text x={midX} y={midY - 8} textAnchor="middle" fill="#64748B" fontSize={10}>
          {label}
        </text>
      )}
      {/* Arrowhead */}
      <circle cx={x2} cy={y2} r={3} fill={color} />
    </g>
  );
}

export default function C4SystemContext() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const detail = activeNode ? nodeDetails[activeNode] : null;

  const svgW = 900;
  const svgH = 520;

  // Node positions (responsive-friendly centered layout)
  const nodes = {
    platform: { x: 340, y: 200, w: 220, h: 80 },
    equipe:   { x: 80,  y: 80,  w: 200, h: 70 },
    admin:    { x: 80,  y: 340, w: 200, h: 70 },
    dns:      { x: 660, y: 40,  w: 200, h: 70 },
    email:    { x: 660, y: 200, w: 200, h: 70 },
    storage:  { x: 660, y: 360, w: 200, h: 70 },
    landing:  { x: 340, y: 400, w: 220, h: 70 },
  };

  return (
    <section id="c4-context" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium tracking-wider uppercase mb-4">
            C4 Model — Nivel 1
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Contexto do <span className="text-emerald-400">Sistema</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Visao macro da plataforma no contexto de usuarios, sistemas externos e 
            atores. Clique em cada elemento para ver detalhes.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr,380px] gap-8 items-start">
          {/* SVG Diagram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-6 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              <span className="text-xs text-slate-500 ml-2 font-mono">System Context</span>
            </div>

            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Background grid */}
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
              </pattern>
              <rect width={svgW} height={svgH} fill="url(#grid)" />

              {/* Connections */}
              <Connection x1={nodes.equipe.x + nodes.equipe.w} y1={nodes.equipe.y + 35}
                x2={nodes.platform.x} y2={nodes.platform.y + 30} label="usa" />
              <Connection x1={nodes.admin.x + nodes.admin.w} y1={nodes.admin.y + 35}
                x2={nodes.platform.x} y2={nodes.platform.y + 50} label="gerencia" />
              <Connection x1={nodes.platform.x + nodes.platform.w} y1={nodes.platform.y + 20}
                x2={nodes.dns.x} y2={nodes.dns.y + 35} label="roteado via" color="#64748B" />
              <Connection x1={nodes.platform.x + nodes.platform.w} y1={nodes.platform.y + 40}
                x2={nodes.email.x} y2={nodes.email.y + 35} label="notifica" />
              <Connection x1={nodes.platform.x + nodes.platform.w} y1={nodes.platform.y + 60}
                x2={nodes.storage.x} y2={nodes.storage.y + 35} label="armazena" />
              <Connection x1={nodes.platform.x + 110} y1={nodes.platform.y + 80}
                x2={nodes.landing.x + 110} y2={nodes.landing.y} label="hospeda" color="#8B5CF680" />

              {/* Nodes */}
              <C4Node id="equipe" label="Equipe de Startups" icon={Users}
                x={nodes.equipe.x} y={nodes.equipe.y}
                w={nodes.equipe.w} h={nodes.equipe.h}
                color="#3B82F6" bgColor="rgba(59,130,246,0.08)"
                active={activeNode === 'equipe'} onClick={() => setActiveNode(activeNode === 'equipe' ? null : 'equipe')} />
              <C4Node id="admin" label="Administrador" icon={Shield}
                x={nodes.admin.x} y={nodes.admin.y}
                w={nodes.admin.w} h={nodes.admin.h}
                color="#F59E0B" bgColor="rgba(245,158,11,0.08)"
                active={activeNode === 'admin'} onClick={() => setActiveNode(activeNode === 'admin' ? null : 'admin')} />
              <C4Node id="platform" label="Plataforma Incubadora" icon={Monitor}
                x={nodes.platform.x} y={nodes.platform.y}
                w={nodes.platform.w} h={nodes.platform.h}
                color="#10B981" bgColor="rgba(16,185,129,0.12)"
                active={activeNode === 'platform'} onClick={() => setActiveNode(activeNode === 'platform' ? null : 'platform')} />
              <C4Node id="dns" label="CDN / DNS Proxy" icon={Globe}
                x={nodes.dns.x} y={nodes.dns.y}
                w={nodes.dns.w} h={nodes.dns.h}
                color="#64748B" bgColor="rgba(100,116,139,0.08)"
                active={activeNode === 'dns'} onClick={() => setActiveNode(activeNode === 'dns' ? null : 'dns')} />
              <C4Node id="email" label="Servidor de Email" icon={Mail}
                x={nodes.email.x} y={nodes.email.y}
                w={nodes.email.w} h={nodes.email.h}
                color="#EC4899" bgColor="rgba(236,72,153,0.08)"
                active={activeNode === 'email'} onClick={() => setActiveNode(activeNode === 'email' ? null : 'email')} />
              <C4Node id="storage" label="Object Storage (S3)" icon={Database}
                x={nodes.storage.x} y={nodes.storage.y}
                w={nodes.storage.w} h={nodes.storage.h}
                color="#F59E0B" bgColor="rgba(245,158,11,0.08)"
                active={activeNode === 'storage'} onClick={() => setActiveNode(activeNode === 'storage' ? null : 'storage')} />
              <C4Node id="landing" label="Landing Page" icon={Globe}
                x={nodes.landing.x} y={nodes.landing.y}
                w={nodes.landing.w} h={nodes.landing.h}
                color="#8B5CF6" bgColor="rgba(139,92,246,0.08)"
                active={activeNode === 'landing'} onClick={() => setActiveNode(activeNode === 'landing' ? null : 'landing')} />

              {/* Legend */}
              <g transform="translate(20, 470)">
                <rect x={0} y={0} width={12} height={12} rx={3} fill="rgba(59,130,246,0.3)" stroke="#3B82F680" strokeWidth={1} />
                <text x={18} y={10} fill="#64748B" fontSize={10}>Pessoa</text>
                <rect x={80} y={0} width={12} height={12} rx={3} fill="rgba(16,185,129,0.15)" stroke="#10B98160" strokeWidth={1.5} />
                <text x={98} y={10} fill="#64748B" fontSize={10}>Sistema</text>
                <rect x={170} y={0} width={12} height={12} rx={3} fill="rgba(100,116,139,0.08)" stroke="#64748B40" strokeWidth={1} />
                <text x={188} y={10} fill="#64748B" fontSize={10}>Externo</text>
              </g>
            </svg>
          </motion.div>

          {/* Detail Panel */}
          <AnimatePresence mode="wait">
            {detail ? (
              <motion.div
                key={activeNode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card rounded-2xl p-6 sticky top-24"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{detail.title}</h3>
                  <button onClick={() => setActiveNode(null)} className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">{detail.description}</p>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Funcao no Sistema</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <ChevronRight size={14} className="text-emerald-400" />
                      <span className="text-sm text-emerald-300">{detail.role}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Tecnologias</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.tech.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card rounded-2xl p-6 sticky top-24 text-center"
              >
                <div className="py-8">
                  <Monitor size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Clique em qualquer elemento do diagrama para ver seus detalhes tecnicos</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
