'use client';

import { motion } from 'framer-motion';
import {
  Server, Cpu, HardDrive, Database, Shield, Activity,
  Globe, Network, Lock, Layers, GitBranch, Box,
  ChevronRight, ExternalLink
} from 'lucide-react';

const specs = [
  {
    category: 'Infraestrutura Base',
    icon: Server,
    color: '#10B981',
    items: [
      { label: 'Compute', value: '4 vCPU ARM + 24 GB RAM' },
      { label: 'Storage', value: '200 GB Block + 20 GB Object (S3)' },
      { label: 'Network', value: '10 Gbps internal, IP publico reservado' },
      { label: 'OS', value: 'Linux ARM64 (Ubuntu/Debian)' },
    ],
  },
  {
    category: 'Kubernetes (K3s)',
    icon: Layers,
    color: '#3B82F6',
    items: [
      { label: 'Runtime', value: 'containerd' },
      { label: 'Network', value: 'flannel VXLAN overlay' },
      { label: 'Ingress', value: 'Traefik v3 (auto-discovery)' },
      { label: 'StorageClass', value: 'Local Path Provisioner' },
      { label: 'Scale', value: 'Single-node, HA-ready' },
    ],
  },
  {
    category: 'Namespaces',
    icon: Box,
    color: '#8B5CF6',
    items: [
      { label: 'infra', value: 'Ingress + PostgreSQL + Cert-Manager + Landing' },
      { label: 'openproject', value: 'Web (2 replicas) + Worker + Memcached' },
      { label: 'mattermost', value: 'App (2 replicas) + Worker (WebSockets)' },
      { label: 'storage', value: 'MinIO S3-compatible (5 buckets)' },
      { label: 'backup', value: 'CronJobs: PG dump + S3 sync (30d retention)' },
    ],
  },
  {
    category: 'Seguranca',
    icon: Shield,
    color: '#EF4444',
    items: [
      { label: 'TLS', value: 'Let\'s Encrypt (auto-renew via cert-manager)' },
      { label: 'Secrets', value: 'Encriptados em repouso, rotacao automatica' },
      { label: 'Network', value: 'NetworkPolicies whitelist por namespace' },
      { label: 'RBAC', value: 'Role + RoleBinding por namespace' },
      { label: 'Pod Security', value: 'restricted profile (no privileged)' },
    ],
  },
  {
    category: 'Observabilidade',
    icon: Activity,
    color: '#EC4899',
    items: [
      { label: 'Metricas', value: 'Prometheus (500M datapoints/mes)' },
      { label: 'Dashboards', value: 'Grafana (pre-built para K3s)' },
      { label: 'Logs', value: 'Loki (10 GB agregacao/mes)' },
      { label: 'Alertas', value: 'AlertManager (Mattermost webhook)' },
      { label: 'Uptime', value: 'Health checks + auto-restart pods' },
    ],
  },
  {
    category: 'CI/CD e Automacao',
    icon: GitBranch,
    color: '#F59E0B',
    items: [
      { label: 'IaC', value: 'Terraform + Kustomize (infra as code)' },
      { label: 'Deploy', value: 'GitHub Actions (auto-deploy on merge)' },
      { label: 'Backup', value: 'CronJob diario (PG + S3 + manifests)' },
      { label: 'Rollback', value: 'kubectl rollback + Terraform state' },
      { label: 'Monitoring', value: 'Automated health checks + SLA alerts' },
    ],
  },
];

const domainStructure = [
  { subdomain: 'incubadora.io', service: 'Landing Page (institucional)', ns: 'infra', type: 'Public' },
  { subdomain: 'app.incubadora.io', service: 'OpenProject (gestao de projetos)', ns: 'openproject', type: 'Auth' },
  { subdomain: 'chat.incubadora.io', service: 'Mattermost (comunicacao)', ns: 'mattermost', type: 'Auth' },
  { subdomain: 's3.incubadora.io', service: 'MinIO Console (documentos)', ns: 'storage', type: 'Admin' },
  { subdomain: 'grafana.incubadora.io', service: 'Grafana (monitoramento)', ns: 'infra', type: 'Admin' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function TechSpecsSection() {
  return (
    <section id="specs" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-wider uppercase mb-4">
            Especificacoes Tecnicas
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Detalhes da <span className="text-amber-400">Implantacao</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Toda a infraestrutura definida como codigo (IaC). Reproduzivel em qualquer
            provedor cloud ou VPS bare-metal.
          </p>
        </motion.div>

        {/* Spec Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {specs.map((spec, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="glass-card rounded-2xl p-6 hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl border" style={{ backgroundColor: `${spec.color}10`, borderColor: `${spec.color}30` }}>
                  <spec.icon size={18} style={{ color: spec.color }} />
                </div>
                <h3 className="text-white font-semibold">{spec.category}</h3>
              </div>
              <div className="space-y-3">
                {spec.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <ChevronRight size={14} style={{ color: spec.color }} className="mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500">{item.label}: </span>
                      <span className="text-xs text-slate-300">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Domain Structure */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-6 sm:p-8 mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Globe size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Estrutura de Dominio</h3>
              <p className="text-xs text-slate-500">Roteamento via Ingress Controller com subdominios dedicados</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-slate-500 font-medium pb-3 pr-4">Subdominio</th>
                  <th className="text-left text-xs text-slate-500 font-medium pb-3 pr-4">Servico</th>
                  <th className="text-left text-xs text-slate-500 font-medium pb-3 pr-4">Namespace</th>
                  <th className="text-left text-xs text-slate-500 font-medium pb-3">Acesso</th>
                </tr>
              </thead>
              <tbody>
                {domainStructure.map((item, i) => (
                  <tr key={i} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-sm font-mono text-emerald-400">{item.subdomain}</span>
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-300">{item.service}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-xs text-slate-400 font-mono">{item.ns}</span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        item.type === 'Public' ? 'bg-emerald-500/10 text-emerald-400' :
                        item.type === 'Auth' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Resource Allocation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-6 sm:p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Cpu size={18} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Alocacao de Recursos (10 usuarios)</h3>
              <p className="text-xs text-slate-500">Distribuicao otimizada com buffer para picos e escalabilidade</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { name: 'OpenProject (Web + Worker)', cpu: '2.0 vCPU', ram: '6 GB', pct: 45, color: '#10B981' },
              { name: 'Mattermost (App + Worker)', cpu: '1.5 vCPU', ram: '4 GB', pct: 35, color: '#3B82F6' },
              { name: 'PostgreSQL 17', cpu: '1.0 vCPU', ram: '4 GB', pct: 25, color: '#F59E0B' },
              { name: 'Infra (K3s + Monitor + S3)', cpu: '0.5 vCPU', ram: '2 GB', pct: 12, color: '#64748B' },
              { name: 'Reserva (buffer para picos)', cpu: '1.0 vCPU', ram: '8 GB', pct: 25, color: '#475569' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-300">{item.name}</span>
                  <span className="text-xs text-slate-500 font-mono">{item.cpu} / {item.ram}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <p className="text-xs text-emerald-300/70 leading-relaxed">
              <strong className="text-emerald-400">Escalabilidade:</strong> Para 50+ usuarios, adicione um segundo VPS e configure
              K3s em modo HA (etcd + multiple control planes). A arquitetura de namespaces e NetworkPolicies
              garante isolamento mesmo em clusters multi-node.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
