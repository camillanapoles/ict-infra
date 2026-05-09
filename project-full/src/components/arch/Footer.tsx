'use client';

import { motion } from 'framer-motion';
import { Github, ExternalLink, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative py-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white">
                IN
              </div>
              <span className="text-lg font-semibold text-white">
                Incubadora <span className="text-emerald-400">Platform</span>
              </span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Plataforma integrada de gestao e comunicacao para incubadoras de startups.
              Arquitetura agnostica, reproduzivel em qualquer provedor.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Arquitetura</h4>
            <div className="space-y-2">
              {['C4 System Context', 'C4 Containers', 'C4 Deployment', 'Especificacoes Tecnicas'].map((item, i) => (
                <a key={i} href={`#${['c4-context', 'c4-container', 'c4-deploy', 'specs'][i]}`}
                  className="block text-sm text-slate-500 hover:text-emerald-400 transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Stack Tecnico</h4>
            <div className="flex flex-wrap gap-2">
              {['K3s', 'Kubernetes', 'Terraform', 'Kustomize', 'PostgreSQL', 'MinIO', 'Traefik', 'Prometheus'].map((item, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-slate-400 border border-white/5">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="section-divider mb-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            Documento de Arquitetura v1.0 — Entrega para Scrum Master
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-1">
            Feito com <Heart size={12} className="text-red-500/50" /> para incubadoras de startups
          </p>
        </div>
      </div>
    </footer>
  );
}
