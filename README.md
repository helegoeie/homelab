# Barrows Cluster

Homelab Kubernetes cluster built on Talos Linux, managed with ArgoCD.

## Access

| Service    | URL                                      |
|------------|------------------------------------------|
| ArgoCD     | https://argocd.barrows.helegoeie.dev     |
| Hubble UI  | https://hubble.barrows.helegoeie.dev     |

Remote access via Tailscale — connect before accessing any service.

## Stack

| Layer         | Tool                                      |
|---------------|-------------------------------------------|
| OS            | Talos Linux                               |
| GitOps        | ArgoCD                                    |
| Bootstrap     | OpenTofu                                  |
| Remote access | Tailscale                                 |
| Load balancer | MetalLB                                   |
| Ingress       | ingress-nginx                             |
| TLS           | cert-manager + Let's Encrypt (Cloudflare) |
| Observability | Hubble UI (Cilium)                        |
| Storage       | Longhorn + Backblaze B2                   |
| Secrets       | Vault + External Secrets Operator         |
| Monitoring    | Prometheus + Grafana                      |
| Media         | Plex, Radarr, Sonarr, Prowlarr            |

## Nodes

| Hostname | Role          | IP            |
|----------|---------------|---------------|
| ahrim    | control-plane | 192.168.1.201 |
| dharok   | worker        | 192.168.1.202 |

## Adding a new app

Follow the Helm umbrella chart pattern:

```
kubernetes/apps/<appname>/
├── app.yaml        # namespace: <namespace>
├── Chart.yaml      # upstream chart dependency
├── values.yaml     # chart values
└── templates/
    ├── namespace.yaml
    └── ingress.yaml  # host: <appname>.barrows.helegoeie.dev
```

ArgoCD auto-discovers any `app.yaml` under `kubernetes/apps/` and deploys it.
