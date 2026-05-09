'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Shield, Server, Database, HardDrive, Lock,
  Activity, X, ChevronRight, Cloud, Cpu, Network
} from 'lucide-react';

interface DeployDetail {
  title: string;
  description: string;
  specs: string[];
  color: string;
}

const deployDetails: Record<string, DeployDetail> = {
  dns_cdn: {
    title: 'DNS + CDN (Edge Layer)',
    description: 'Camada de borda responsavel pela resolucao DNS, cache de conteudo estatico, terminacao SSL/TLS e protecao contra ataques de negacao de servico (DDoS). Todo o trafego passa por esta camada antes de chegar ao VPS.',
    specs: ['DNS Proxy com rotas por subdominio', 'CDN Cache para assets estaticos', 'SSL/TLS Termination (Let\'s Encrypt)', 'DDoS Protection e WAF', 'Auto-redirecionamento HTTP -> HTTPS'],
    color: '#64748B',
  },
  vps: {
    title: 'VPS (Servidor Dedicado)',
    description: 'Servidor virtual com recursos dedicados que hospeda todo o stack da incubadora. Utiliza processador ARM para melhor eficiencia energetica e custo-beneficio.',
    specs: ['4 vCPU ARM (64-bit)', '24 GB RAM', '200 GB Armazenamento Block', '20 GB Object Storage (S3)', 'Banda: 10 Gbps (interface interna)', 'IP Publico reservado'],
    color: '#10B981',
  },
  k3s: {
    title: 'K3s (Kubernetes Leve)',
    description: 'Distribuicao Kubernetes otimizada para workloads leves e IoT. Gerencia todos os containers, balanceamento interno, rede overlay e DNS do cluster.',
    specs: ['Single-node (escalavel para HA)', 'Container Runtime: containerd', 'Network: flannel (VXLAN overlay)', 'Load Balancer interno: Traefik', 'Service Discovery integrado', 'StorageClass: Local Path Provisioner'],
    color: '#3B82F6',
  },
  namespace_infra: {
    title: 'Namespace: infra',
    description: 'Namespace que hospeda os servicos de infraestrutura compartilhados entre todos os aplicativos: roteamento de trafego, certificacao SSL, monitoramento e backup.',
    specs: ['Ingress Controller (Traefik v3)', 'Cert-Manager (Let\'s Encrypt)', 'Landing Page (Nginx Static)', 'PostgreSQL 17 (StatefulSet)', 'Prometheus + Grafana Agent', 'Backup CronJobs'],
    color: '#64748B',
  },
  namespace_openproject: {
    title: 'Namespace: openproject',
    description: 'Namespace dedicado ao OpenProject e seus componentes auxiliares. Isolamento de rede garante que problemas no OpenProject nao afetem outros servicos.',
    specs: ['OpenProject Web (2 replicas)', 'OpenProject Worker (background jobs)', 'Memcached (cache de sessao)', 'NetworkPolicy: egress apenas para infra', 'HPA: auto-scale por CPU 70%'],
    color: '#10B981',
  },
  namespace_mattermost: {
    title: 'Namespace: mattermost',
    description: 'Namespace dedicado ao Mattermost e seus processos de fundo. Suporta comunicacao em tempo real via WebSocket com isolamento completo.',
    specs: ['Mattermost App (2 replicas)', 'Mattermost Worker (jobs)', 'NetworkPolicy: egress apenas para infra', 'WebSocket persistent connections', 'File storage: S3 backend', 'HPA: auto-scale por conexoes ativas'],
    color: '#3B82F6',
  },
  storage: {
    title: 'Object Storage (S3)',
    description: 'Servico de armazenamento de objetos compativel com Amazon S3 API. Hospedado no proprio VPS via MinIO, com buckets isolados por aplicacao e politicas de acesso granulares.',
    specs: ['MinIO (S3-compatible)', 'Bucket: openproject-docs', 'Bucket: mattermost-files', 'Bucket: landing-assets', 'Bucket: backups', 'Capacity: 20 GB'],
    color: '#F59E0B',
  },
  monitoring: {
    title: 'Observabilidade',
    description: 'Stack completo de monitoramento, logging e alerting. Coleta metricas de todos os pods, gera alertas automaticos e mantem logs centralizados para troubleshooting.',
    specs: ['Prometheus (metricas)', 'Grafana (dashboards)', 'AlertManager (notificacoes)', 'Loki (log aggregation)', '10 GB logs/mes', '500M datapoints/mes'],
    color: '#EC4899',
  },
  security: {
    title: 'Seguranca e Secrets',
    description: 'Gestao centralizada de secrets (senhas, tokens, chaves) com criptografia em repouso e rotacao automatica. Nenhuma credencial em plain text nos manifests.',
    specs: ['Secrets encriptados em repouso', 'Rotacao automatica de tokens', 'RBAC por namespace', 'NetworkPolicies (whitelist)', 'Pod Security Standards (restricted)', 'Taint/Toleration para nos dedicados'],
    color: '#EF4444',
  },
};

function DeployBox({
  id, label, sublabel, icon: Icon, x, y, width = 170, height = 55,
  color, active, onClick
}: {
  id: string; label: string; sublabel?: string; icon: React.ElementType;
  x: number; y: number; width?: number; height?: number;
  color: string; active: boolean; onClick: () => void;
}) {
  return (
    <g className="c4-node" onClick={onClick}>
      <rect x={x} y={y} width={width} height={height} rx={6} ry={6}
        fill={`${color}10`} stroke={active ? color : `${color}25`} strokeWidth={active ? 2 : 1} />
      <foreignObject x={x + 6} y={y + 8} width={18} height={18}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={color} />
        </div>
      </foreignObject>
      <text x={x + 30} y={y + 20} fill={active ? '#F1F5F9' : '#CBD5E1'} fontSize={10} fontWeight={600}>{label}</text>
      {sublabel && <text x={x + 30} y={y + 35} fill="#64748B" fontSize={8}>{sublabel}</text>}
    </g>
  );
}

function Boundary({ x, y, width, height, label, color = '#10B981', dashed = true }: {
  x: number; y: number; width: number; height: number;
  label: string; color?: string; dashed?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8} ry={8}
        fill="none" stroke={`${color}20`} strokeWidth={1} strokeDasharray={dashed ? "6 3" : "none"} />
      <text x={x + 8} y={y + 14} fill={`${color}60`} fontSize={9} fontWeight={600}>{label}</text>
    </g>
  );
}

export default function C4Deployment() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const detail = activeNode ? deployDetails[activeNode] : null;

  const svgW = 920;
  const svgH = 600;

  return (
    <section id="c4-deploy" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-wider uppercase mb-4">
            C4 Model — Nivel 3
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Diagrama de <span className="text-amber-400">Deploy</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Visao completa do deployment em producao: VPS, Kubernetes, namespaces,
            rede, seguranca e monitoramento.
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
              <span className="text-xs text-slate-500 ml-2 font-mono">Deployment Diagram</span>
            </div>

            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
              <defs>
                <pattern id="grid3" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={svgW} height={svgH} fill="url(#grid3)" />

              {/* DNS / CDN Layer */}
              <Boundary x={20} y={10} width={880} height={55} label="Edge Layer" color="#64748B" dashed={false} />
              <DeployBox id="dns_cdn" label="DNS + CDN" sublabel="Proxy / WAF / SSL" icon={Cloud}
                x={40} y={18} width={200} height={40}
                color="#64748B" active={activeNode === 'dns_cdn'} onClick={() => setActiveNode(activeNode === 'dns_cdn' ? null : 'dns_cdn')} />
              <text x={300} y={42} fill="#475569" fontSize={10}>app.incubadora.io → CDN → VPS IP:443</text>

              {/* VPS Boundary */}
              <Boundary x={20} y={75} width={880} height={510} label="VPS — Servidor Dedicado (4 vCPU ARM / 24 GB RAM / 200 GB)" color="#10B981" dashed={false} />
              <DeployBox id="vps" label="Host OS" sublabel="Linux ARM64" icon={Cpu}
                x={40} y={83} width={150} height={40} color="#10B981"
                active={activeNode === 'vps'} onClick={() => setActiveNode(activeNode === 'vps' ? null : 'vps')} />

              {/* Connection: CDN -> VPS */}
              <line x1={140} y1={65} x2={140} y2={83} stroke="#475569" strokeWidth={1} markerEnd="url(#arrow)" />

              {/* K3s Boundary */}
              <Boundary x={40} y={130} width={840} height={445} label="K3s — Kubernetes Leve" color="#3B82F6" />
              <DeployBox id="k3s" label="K3s Control Plane" sublabel="Single-node / HA-ready" icon={Network}
                x={60} y={140} width={200} height={40} color="#3B82F6"
                active={activeNode === 'k3s'} onClick={() => setActiveNode(activeNode === 'k3s' ? null : 'k3s')} />

              {/* Namespace: infra */}
              <Boundary x={60} y={190} width={400} height={100} label="ns: infra" color="#64748B" />
              <DeployBox id="namespace_infra" label="Ingress + Cert + Landing" sublabel="Traefik / cert-manager / Nginx" icon={Shield}
                x={80} y={210} width={210} height={40} color="#64748B"
                active={activeNode === 'namespace_infra'} onClick={() => setActiveNode(activeNode === 'namespace_infra' ? null : 'namespace_infra')} />
              <DeployBox id="monitoring" label="Monitoramento" sublabel="Prometheus / Grafana / Loki" icon={Activity}
                x={80} y={255} width={210} height={30} color="#EC4899"
                active={activeNode === 'monitoring'} onClick={() => setActiveNode(activeNode === 'monitoring' ? null : 'monitoring')} />

              {/* Security box */}
              <DeployBox id="security" label="Secrets & RBAC" sublabel="Encripted / NetworkPolicies" icon={Lock}
                x={310} y={210} width={140} height={75} color="#EF4444"
                active={activeNode === 'security'} onClick={() => setActiveNode(activeNode === 'security' ? null : 'security')} />

              {/* Namespace: openproject */}
              <Boundary x={60} y={300} width={400} height={80} label="ns: openproject" color="#10B981" />
              <DeployBox id="namespace_openproject" label="OpenProject (Web + Worker + Memcached)" sublabel="2 replicas / HPA por CPU" icon={Server}
                x={80} y={320} width={340} height={40} color="#10B981"
                active={activeNode === 'namespace_openproject'} onClick={() => setActiveNode(activeNode === 'namespace_openproject' ? null : 'namespace_openproject')} />

              {/* Namespace: mattermost */}
              <Boundary x={60} y={390} width={400} height={80} label="ns: mattermost" color="#3B82F6" />
              <DeployBox id="namespace_mattermost" label="Mattermost (App + Worker)" sublabel="2 replicas / WebSocket" icon={Server}
                x={80} y={410} width={340} height={40} color="#3B82F6"
                active={activeNode === 'namespace_mattermost'} onClick={() => setActiveNode(activeNode === 'namespace_mattermost' ? null : 'namespace_mattermost')} />

              {/* Right side: Storage + Security details */}
              <Boundary x={480} y={190} width={380} height={280} label="ns: storage + backup" color="#F59E0B" />
              <DeployBox id="storage" label="Object Storage (S3)" sublabel="MinIO — 20 GB / 5 Buckets" icon={Database}
                x={500} y={210} width={200} height={45} color="#F59E0B"
                active={activeNode === 'storage'} onClick={() => setActiveNode(activeNode === 'storage' ? null : 'storage')} />
              <DeployBox id="namespace_infra" label="PostgreSQL 17" sublabel="2 databases / Connection Pool" icon={Database}
                x={500} y={270} width={200} height={45} color="#64748B"
                active={false} onClick={() => setActiveNode('namespace_infra')} />

              {/* Backup visual */}
              <text x={720} y={225} fill="#EC489960" fontSize={10} fontWeight={500}>Backup CronJob</text>
              <text x={720} y={240} fill="#EC489940" fontSize={9}>PG dump + S3 sync</text>
              <text x={720} y={255} fill="#EC489940" fontSize={9}>Retencao: 30 dias</text>

              {/* Network flow arrows */}
              <line x1={140} y1={65} x2={140} y2={75} stroke="#475569" strokeWidth={1.5} />
              <line x1={140} y1={230} x2={140} y2={320} stroke="#10B98130" strokeWidth={1} strokeDasharray="4 2" />
              <line x1={140} y1={360} x2={140} y2={410} stroke="#3B82F630" strokeWidth={1} strokeDasharray="4 2" />

              {/* Connection: apps -> PostgreSQL */}
              <line x1={420} y1={340} x2={500} y2={295} stroke="#64748B30" strokeWidth={1} strokeDasharray="4 2" />
              <line x1={420} y1={430} x2={500} y2={295} stroke="#64748B30" strokeWidth={1} strokeDasharray="4 2" />

              {/* Resource allocation legend */}
              <g transform="translate(500, 390)">
                <text x={0} y={0} fill="#64748B" fontSize={9} fontWeight={600}>Alocacao de Recursos (estimativa)</text>
                <text x={0} y={18} fill="#475569" fontSize={8}>OpenProject: 2 vCPU / 6 GB RAM</text>
                <text x={0} y={30} fill="#475569" fontSize={8}>Mattermost: 1.5 vCPU / 4 GB RAM</text>
                <text x={0} y={42} fill="#475569" fontSize={8}>PostgreSQL: 1 vCPU / 4 GB RAM</text>
                <text x={0} y={54} fill="#475569" fontSize={8}>Infra (K3s + Monitor): 0.5 vCPU / 2 GB RAM</text>
                <text x={0} y={66} fill="#475569" fontSize={8}>Reserva: 1 vCPU / 8 GB RAM (buffer)</text>
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
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: detail.color }} />
                    <h3 className="text-lg font-semibold text-white">{detail.title}</h3>
                  </div>
                  <button onClick={() => setActiveNode(null)} className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">{detail.description}</p>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Especificacoes Tecnicas</p>
                  <div className="space-y-2">
                    {detail.specs.map((spec, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                        <ChevronRight size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-xs text-slate-300">{spec}</span>
                      </div>
                    ))}
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
                  <HardDrive size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Clique em qualquer camada para ver especificacoes detalhadas de deploy</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
