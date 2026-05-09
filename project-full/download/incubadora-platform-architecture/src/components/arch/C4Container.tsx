'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Shield, Server, Database, MessageSquare,
  FolderKanban, FileText, Lock, X, ChevronRight,
  Container, Network
} from 'lucide-react';

interface ContainerDetail {
  title: string;
  description: string;
  tech: string[];
  port: string;
  namespace: string;
}

const containerDetails: Record<string, ContainerDetail> = {
  browser: {
    title: 'Navegador Web',
    description: 'Interface do usuario acessada via navegador. Todos os servicos sao acessados via HTTPS atraves do dominio principal da incubadora.',
    tech: ['Chrome / Firefox / Edge', 'HTTPS / TLS 1.3', 'WebSocket'],
    port: '443 (HTTPS)',
    namespace: '—',
  },
  ingress: {
    title: 'Ingress Controller',
    description: 'Ponto de entrada do cluster Kubernetes. Gerencia roteamento baseado em host/path, terminacao TLS e balanceamento de carga entre os pods.',
    tech: ['Traefik v3', 'TLS Termination', 'Path-based Routing', 'Auto-discovery'],
    port: '80/443',
    namespace: 'infra',
  },
  openproject: {
    title: 'OpenProject',
    description: 'Plataforma completa de gestao de projetos com kanban, Gantt, sprints, roadmaps, time tracking, wiki e gestao de documentos integrada.',
    tech: ['OpenProject 15', 'Ruby on Rails', 'Angular Frontend', 'Worker Process'],
    port: '8080 (internal)',
    namespace: 'openproject',
  },
  mattermost: {
    title: 'Mattermost Team Edition',
    description: 'Plataforma de mensageria open-source com canais, mensagens diretas, threads, webhooks, integracoes com OpenProject e notificacoes push.',
    tech: ['Mattermost 10.x', 'Go Backend', 'React Web App', 'WebSocket Server'],
    port: '8065 (internal)',
    namespace: 'mattermost',
  },
  landing: {
    title: 'Landing Page',
    description: 'Site institucional da incubadora servido como conteudo estatico. Apresenta o programa, processo seletivo e redireciona para os servicos internos.',
    tech: ['Static HTML/CSS/JS', 'Nginx Container', 'CDN Cached', 'Same Domain'],
    port: '8081 (internal)',
    namespace: 'infra',
  },
  postgres: {
    title: 'PostgreSQL 17',
    description: 'Banco de dados relacional compartilhado entre OpenProject e Mattermost. Isolamento logico via databases e schemas separados.',
    tech: ['PostgreSQL 17', '2 Databases', 'Connection Pooling', 'Daily Backups'],
    port: '5432 (internal)',
    namespace: 'infra',
  },
  s3storage: {
    title: 'Object Storage (S3)',
    description: 'Servico de armazenamento de objetos compativel com S3. Armazena documentos de projetos, anexos, avatares e assets da landing page.',
    tech: ['MinIO', 'S3 API Compatible', 'Bucket Policies', '20 GB Storage'],
    port: '9000 (internal)',
    namespace: 'storage',
  },
  certmanager: {
    title: 'Certificate Manager',
    description: 'Gerenciamento automatico de certificados TLS via Let\'s Encrypt. Renovacao automatica e distribuicao para todos os ingress resources.',
    tech: ['cert-manager', 'Let\'s Encrypt (ACME)', 'HTTP-01 Challenge', 'Auto-renewal'],
    port: '—',
    namespace: 'infra',
  },
};

function ContainerBox({
  id, label, sublabel, icon: Icon, x, y, width = 160, height = 65,
  color, bgColor, active, onClick
}: {
  id: string; label: string; sublabel?: string; icon: React.ElementType;
  x: number; y: number; width?: number; height?: number;
  color: string; bgColor: string; active: boolean; onClick: () => void;
}) {
  return (
    <g className="c4-node" onClick={onClick}>
      <rect
        x={x} y={y} width={width} height={height}
        rx={8} ry={8}
        fill={bgColor}
        stroke={active ? color : `${color}30`}
        strokeWidth={active ? 2 : 1}
      />
      <foreignObject x={x + 8} y={y + 8} width={20} height={20}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
      </foreignObject>
      <text x={x + 34} y={y + 22} fill={active ? '#F1F5F9' : '#CBD5E1'} fontSize={11} fontWeight={600}>{label}</text>
      {sublabel && <text x={x + 34} y={y + 38} fill="#64748B" fontSize={9}>{sublabel}</text>}
      {active && (
        <circle cx={x + width - 10} cy={y + 10} r={3} fill={color} opacity={0.8}>
          <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

function K8sBoundary({ x, y, width, height, label, color = '#10B981' }: {
  x: number; y: number; width: number; height: number;
  label: string; color?: string;
}) {
  return (
    <g>
      <rect
        x={x} y={y} width={width} height={height}
        rx={12} ry={12}
        fill="none"
        stroke={`${color}30`}
        strokeWidth={1.5}
        strokeDasharray="8 4"
      />
      <text x={x + 12} y={y + 18} fill={`${color}80`} fontSize={10} fontWeight={600}>{label}</text>
    </g>
  );
}

export default function C4Container() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const detail = activeNode ? containerDetails[activeNode] : null;

  const svgW = 920;
  const svgH = 580;

  return (
    <section id="c4-container" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium tracking-wider uppercase mb-4">
            C4 Model — Nivel 2
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Diagrama de <span className="text-blue-400">Containers</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Containers e servicos que compoem a plataforma, suas responsabilidades
            e como se comunicam dentro do cluster Kubernetes.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr,380px] gap-8 items-start">
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
              <span className="text-xs text-slate-500 ml-2 font-mono">Container Diagram</span>
            </div>

            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
              <defs>
                <pattern id="grid2" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={svgW} height={svgH} fill="url(#grid2)" />

              {/* Kubernetes Cluster Boundary */}
              <K8sBoundary x={220} y={50} width={680} height={510} label="Kubernetes Cluster (K3s)" />

              {/* Namespace: infra */}
              <K8sBoundary x={240} y={70} width={640} height={130} label="Namespace: infra" color="#64748B" />

              {/* Namespace: openproject */}
              <K8sBoundary x={240} y={210} width={310} height={150} label="Namespace: openproject" color="#10B981" />

              {/* Namespace: mattermost */}
              <K8sBoundary x={560} y={210} width={320} height={150} label="Namespace: mattermost" color="#3B82F6" />

              {/* Namespace: storage */}
              <K8sBoundary x={240} y={370} width={310} height={130} label="Namespace: storage" color="#F59E0B" />

              {/* Namespace: backup */}
              <K8sBoundary x={560} y={370} width={320} height={130} label="Namespace: backup" color="#EC4899" />

              {/* Browser */}
              <ContainerBox id="browser" label="Navegador Web" sublabel="HTTPS" icon={Globe}
                x={20} y={240} width={170} height={65}
                color="#64748B" bgColor="rgba(100,116,139,0.08)"
                active={activeNode === 'browser'} onClick={() => setActiveNode(activeNode === 'browser' ? null : 'browser')} />

              {/* Ingress */}
              <ContainerBox id="ingress" label="Ingress Controller" sublabel="Traefik v3" icon={Network}
                x={260} y={90} width={170} height={55}
                color="#10B981" bgColor="rgba(16,185,129,0.08)"
                active={activeNode === 'ingress'} onClick={() => setActiveNode(activeNode === 'ingress' ? null : 'ingress')} />

              {/* Cert Manager */}
              <ContainerBox id="certmanager" label="Cert Manager" sublabel="Let's Encrypt" icon={Lock}
                x={460} y={90} width={170} height={55}
                color="#10B981" bgColor="rgba(16,185,129,0.08)"
                active={activeNode === 'certmanager'} onClick={() => setActiveNode(activeNode === 'certmanager' ? null : 'certmanager')} />

              {/* Landing Page */}
              <ContainerBox id="landing" label="Landing Page" sublabel="Nginx Static" icon={FileText}
                x={660} y={90} width={170} height={55}
                color="#8B5CF6" bgColor="rgba(139,92,246,0.08)"
                active={activeNode === 'landing'} onClick={() => setActiveNode(activeNode === 'landing' ? null : 'landing')} />

              {/* OpenProject */}
              <ContainerBox id="openproject" label="OpenProject" sublabel="Gestao de Projetos" icon={FolderKanban}
                x={260} y={240} width={170} height={65}
                color="#10B981" bgColor="rgba(16,185,129,0.08)"
                active={activeNode === 'openproject'} onClick={() => setActiveNode(activeNode === 'openproject' ? null : 'openproject')} />

              {/* Mattermost */}
              <ContainerBox id="mattermost" label="Mattermost" sublabel="Mensageria" icon={MessageSquare}
                x={580} y={240} width={170} height={65}
                color="#3B82F6" bgColor="rgba(59,130,246,0.08)"
                active={activeNode === 'mattermost'} onClick={() => setActiveNode(activeNode === 'mattermost' ? null : 'mattermost')} />

              {/* PostgreSQL */}
              <ContainerBox id="postgres" label="PostgreSQL 17" sublabel="Banco de Dados" icon={Database}
                x={260} y={400} width={170} height={65}
                color="#F59E0B" bgColor="rgba(245,158,11,0.08)"
                active={activeNode === 'postgres'} onClick={() => setActiveNode(activeNode === 'postgres' ? null : 'postgres')} />

              {/* S3 Storage */}
              <ContainerBox id="s3storage" label="Object Storage" sublabel="MinIO (S3 API)" icon={Server}
                x={580} y={400} width={170} height={65}
                color="#F59E0B" bgColor="rgba(245,158,11,0.08)"
                active={activeNode === 's3storage'} onClick={() => setActiveNode(activeNode === 's3storage' ? null : 's3storage')} />

              {/* Connections */}
              {/* Browser -> Ingress */}
              <line x1={190} y1={265} x2={260} y2={117} stroke="#475569" strokeWidth={1} strokeDasharray="6 3" className="animate-dash" />
              <text x={210} y={185} fill="#475569" fontSize={9} transform="rotate(-38, 210, 185)">HTTPS</text>

              {/* Ingress -> OpenProject */}
              <line x1={345} y1={145} x2={345} y2={240} stroke="#10B98150" strokeWidth={1} strokeDasharray="4 2" />
              {/* Ingress -> Mattermost */}
              <line x1={400} y1={130} x2={580} y2={265} stroke="#3B82F650" strokeWidth={1} strokeDasharray="4 2" />
              {/* Ingress -> Landing */}
              <line x1={430} y1={117} x2={660} y2={117} stroke="#8B5CF650" strokeWidth={1} strokeDasharray="4 2" />

              {/* OpenProject -> PostgreSQL */}
              <line x1={345} y1={305} x2={345} y2={400} stroke="#F59E0B30" strokeWidth={1} strokeDasharray="4 2" />
              <text x={355} y={355} fill="#F59E0B60" fontSize={9}>SQL</text>

              {/* Mattermost -> PostgreSQL */}
              <line x1={580} y1={290} x2={430} y2={430} stroke="#F59E0B30" strokeWidth={1} strokeDasharray="4 2" />

              {/* OpenProject -> S3 */}
              <line x1={430} y1={290} x2={580} y2={430} stroke="#F59E0B30" strokeWidth={1} strokeDasharray="4 2" />

              {/* Backup label */}
              <text x={620} y={445} fill="#EC489960" fontSize={10} fontWeight={500}>CronJob Backup</text>
              <text x={620} y={460} fill="#EC489940" fontSize={9}>PG + S3 snapshots</text>
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
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Namespace K8s</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <ChevronRight size={14} className="text-emerald-400" />
                      <span className="text-sm text-emerald-300 font-mono">{detail.namespace}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Porta</p>
                    <span className="text-sm text-slate-300 font-mono">{detail.port}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Tecnologias</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.tech.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-300">{t}</span>
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
                  <Container size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Clique em qualquer container para ver seus detalhes tecnicos, porta e namespace</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
