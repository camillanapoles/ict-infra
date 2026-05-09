# K3s — Kubernetes Deployment (Multi-Namespace Architecture)

> **Architecture:** Single VM K3s cluster with namespace-based isolation.
> Oracle A1 Flex — 4 OCPU / 24 GB RAM — Ubuntu 22.04 ARM64

## Architecture: Single Node + Multi-Namespace Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│  Oracle A1 Flex — 1 VM — 4 OCPU / 24 GB RAM — Ubuntu 22.04    │
│                                                                 │
│  K3s Single-Node Cluster (control-plane + worker in 1 VM)       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Namespace: incubadora-infra                             │   │
│  │  ├─ PostgreSQL 17  (4GB RAM, 1 CPU)  [shared]           │   │
│  │  ├─ Memcached 1.6   (512MB RAM)       [shared]           │   │
│  │  └─ NetworkPolicy: allow from openproject + mattermost   │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Namespace: incubadora-openproject                       │   │
│  │  ├─ OpenProject 15  (3GB RAM, 1.5 CPU)                  │   │
│  │  ├─ PVC: openproject-data (30Gi)                         │   │
│  │  └─ NetworkPolicy: egress to infra:5432 + infra:11211   │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Namespace: incubadora-mattermost                        │   │
│  │  ├─ Mattermost Team  (2GB RAM, 0.5 CPU)                  │   │
│  │  ├─ PVC: mattermost-data (20Gi) + mattermost-plugins (2Gi)│  │
│  │  └─ NetworkPolicy: egress to infra:5432 + infra:11211   │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Namespace: incubadora-backup                            │   │
│  │  ├─ CronJob: daily pg_dump (02:00 UTC)                   │   │
│  │  ├─ CronJob: weekly verify (Sunday 04:00 UTC)            │   │
│  │  ├─ PVC: backup-data (20Gi)                              │   │
│  │  └─ NetworkPolicy: egress to infra:5432                  │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Namespace: cert-manager  (system)                       │   │
│  │  ├─ ClusterIssuers: prod + staging                       │   │
│  │  └─ Certificates: per-app                                │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Namespace: traefik  (system)                            │   │
│  │  ├─ Traefik v2 (Ingress Controller)                     │   │
│  │  └─ ACME resolver via Cloudflare DNS-01                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Resource Budget:                                                │
│  ├─ Apps:    ~10.1 GB RAM / 3.0 CPU                            │
│  ├─ K3s:     ~0.5 GB RAM / 0.3 CPU                             │
│  ├─ OS+Docker: ~1.5 GB RAM / 0.5 CPU                           │
│  └─ Free:    ~12 GB RAM / 0.7 CPU                               │
└─────────────────────────────────────────────────────────────────┘
```

## Cross-Namespace Dependencies

```
incubadora-openproject ──→ incubadora-infra (PostgreSQL:5432, Memcached:11211)
incubadora-mattermost  ──→ incubadora-infra (PostgreSQL:5432, Memcached:11211)
incubadora-backup      ──→ incubadora-infra (PostgreSQL:5432)
traefik                ──→ incubadora-openproject (HTTP:8080)
traefik                ──→ incubadora-mattermost (HTTP:8065)
```

---

## Quick Start

### 1. Install K3s + dependencies

```bash
chmod +x k3s/install-k3s.sh
./k3s/install-k3s.sh --single-node
```

### 2. Configure environment

```bash
cp k3s/.env.example k3s/.env
nano k3s/.env
```

### 3. Create required secrets

```bash
# Cloudflare API Token (for Let's Encrypt DNS-01)
kubectl create secret generic cloudflare-api-token \
  --from-literal=api-token=YOUR_CLOUDFLARE_TOKEN \
  -n cert-manager
```

### 4. Deploy everything (Kustomize)

```bash
# One command to deploy everything in the correct order:
kubectl apply -k k3s/
```

### Or deploy manually (in order)

```bash
cd k3s/

# 1. Namespaces
kubectl apply -f namespaces.yaml

# 2. Network Policies
kubectl apply -f network-policies.yaml

# 3. Infrastructure
kubectl apply -f postgresql.yaml
kubectl apply -f memcached.yaml

# 4. Certificates
kubectl apply -f cert-manager.yaml

# 5. Applications
kubectl apply -f openproject.yaml
kubectl apply -f mattermost.yaml

# 6. Backup
kubectl apply -f backup-cronjob.yaml
```

---

## File Inventory

```
k3s/
├── scaffold.yaml            Project scaffold & complete reference
├── kustomization.yaml       Kustomize root (kubectl apply -k .)
├── namespaces.yaml          4 namespaces (infra, openproject, mattermost, backup)
├── network-policies.yaml    Default deny + DNS allow for all namespaces
├── postgresql.yaml          PostgreSQL 17 (incubadora-infra) + NetworkPolicy
├── memcached.yaml           Memcached 1.6 (incubadora-infra) + NetworkPolicy
├── openproject.yaml         OpenProject 15 (incubadora-openproject) + IngressRoute
├── mattermost.yaml          Mattermost Team (incubadora-mattermost) + IngressRoute
├── cert-manager.yaml        ClusterIssuers + per-namespace Certificates
├── backup-cronjob.yaml      Daily + weekly backup CronJobs (incubadora-backup)
├── traefik-values.yaml      Helm values for Traefik Ingress Controller
├── install-k3s.sh           K3s + Helm + cert-manager + Traefik installer
├── .env.example             Environment variables template
└── README.md                This file
```

---

## Resource Allocation

| Namespace | Component | CPU req | CPU lim | RAM req | RAM lim |
|---|---|---|---|---|---|
| incubadora-infra | PostgreSQL 17 | 500m | 1000m | 2Gi | 4Gi |
| incubadora-infra | Memcached 1.6 | 100m | 200m | 256Mi | 512Mi |
| incubadora-openproject | OpenProject 15 | 500m | 1500m | 2Gi | 3Gi |
| incubadora-mattermost | Mattermost Team | 250m | 500m | 1Gi | 2Gi |
| incubadora-backup | Backup CronJobs | 150m | 700m | 192Mi | 768Mi |
| traefik | Traefik v2 | 100m | 1000m | 128Mi | 512Mi |
| cert-manager | cert-manager | 50m | 200m | 64Mi | 256Mi |
| **Total** | | **1750m** | **5350m** | **~6.1Gi** | **~11.2Gi** |

### Storage

| Namespace | PVC | Size | StorageClass |
|---|---|---|---|
| incubadora-infra | postgres-data | 50Gi | local-path |
| incubadora-openproject | openproject-data | 30Gi | local-path |
| incubadora-mattermost | mattermost-data | 20Gi | local-path |
| incubadora-mattermost | mattermost-plugins | 2Gi | local-path |
| incubadora-backup | backup-data | 20Gi | local-path |
| **Total** | | **122Gi** | |

---

## Useful Commands

```bash
# All incubadora pods
kubectl get pods -A -l app.kubernetes.io/part-of=incubadora

# All incubadora namespaces
kubectl get namespaces -l app.kubernetes.io/part-of=incubadora

# Network policies
kubectl get networkpolicies -A -l app.kubernetes.io/part-of=incubadora

# Certificates
kubectl get certificates -A -l app.kubernetes.io/part-of=incubadora

# Ingress routes
kubectl get ingressroutes -A -l app.kubernetes.io/part-of=incubadora

# PVCs
kubectl get pvc -A -l app.kubernetes.io/part-of=incubadora

# OpenProject logs
kubectl logs -f deployment/openproject -n incubadora-openproject

# Mattermost logs
kubectl logs -f deployment/mattermost -n incubadora-mattermost

# PostgreSQL logs
kubectl logs -f statefulset/postgresql -n incubadora-infra

# Backup job logs
kubectl logs -n incubadora-backup -l app.kubernetes.io/name=postgres-backup
```

---

## Teardown

```bash
# Remove all incubadora resources
kubectl delete -k k3s/

# Or remove individual namespaces (WARNING: deletes all data!)
kubectl delete namespace incubadora-backup
kubectl delete namespace incubadora-mattermost
kubectl delete namespace incubadora-openproject
kubectl delete namespace incubadora-infra

# Uninstall K3s
/usr/local/bin/k3s-uninstall.sh
```
