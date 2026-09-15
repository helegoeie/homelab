# Homelab — Copilot Instructions

Public GitOps repo for the **Barrows Cluster** — a Talos Linux + Kubernetes homelab deployed
via ArgoCD. This repo contains no application source code, only Helm charts/values and
ArgoCD Application manifests. Node provisioning and Terraform live in the sibling
`homelab-private` repo (never made public).

## Architecture

- **Bootstrap:** `bootstrap/root-app.yaml` (ArgoCD root Application) + `bootstrap/appset.yaml`
  (an ApplicationSet that auto-discovers every `apps/**/app.yaml`). Adding an app = adding a
  directory under `apps/`; no manual ArgoCD registration needed.
- **App layout:** each `apps/<name>/` is a Helm umbrella chart:
  ```
  apps/<name>/
  ├── app.yaml        # ArgoCD Application (references namespace <namespace>)
  ├── Chart.yaml       # upstream chart dependency (if wrapping a public chart)
  ├── values.yaml      # chart values, committed to git
  └── templates/       # namespace.yaml, ingress.yaml, etc.
  ```
- **After bootstrap, everything is deployed via ArgoCD — never `kubectl apply` directly.**
  Changing a running app means editing `values.yaml`/`templates/` here and letting ArgoCD sync.
- **Ingress duality** — every app is reachable on at most two hostnames, and both must be
  wired independently:
  - Internal: `<app>.barrows.helegoeie.dev` → A record → 192.168.1.240 (MetalLB) → ingress-nginx.
  - Public: `<app>.helegoeie.dev` → CNAME → Cloudflare Tunnel → cloudflared → ClusterIP. Public
    exposure additionally requires an entry under `ingress:` in `apps/cloudflared/values.yaml`
    (its tunnel catch-all 404s anything not listed there).
  - Never put Plex/streaming behind the Cloudflare Tunnel (violates Cloudflare free-plan ToS).
- All Ingress resources use `cert-manager.io/cluster-issuer: letsencrypt` (DNS01 via Cloudflare).
- `apps/log01` is the Helm chart deploying the `log01` application (source in the separate
  `log01` repo, built by Forgejo Actions there); this repo only holds the deployment manifest.

## Key conventions

- One ArgoCD Application per tool/app; app name = directory name under `apps/`.
- Helm values live in git next to the Application manifest — no external values stores.
- Media-stack app wiring (Prowlarr → *arr apps → qBittorrent/Solvearr, Seerr → Plex, etc.) is
  done once through each app's own UI, not declared in Helm values, except for Decluttarr's
  `RADARR_KEY`/`SONARR_KEY`/`QBITTORRENT_USERNAME`/`QBITTORRENT_PASSWORD` in its `values.yaml`.
- Some secrets are created once manually (never in git): Tailscale OAuth (`tailscale` ns),
  Cloudflare API token (`cert-manager` ns), Cloudflare Tunnel credentials (`cloudflared` ns).

There is no build/test/lint tooling in this repo — validate changes by checking the rendered
Helm output (`helm template apps/<name>`) and letting ArgoCD reconcile.

## ⚠️ Critical: `apps/workout` is shared infrastructure, not just a leftover app

Despite its name, `apps/workout` (namespace `workout`) hosts a **shared CNPG Postgres
cluster (`workout-pg`) and Redis instance** used by other apps' databases/caches — currently
**Forgejo** (`apps/forgejo/values.yaml`) and previously also **Zitadel**
(`apps/zitadel/values.yaml`, still points at it but its DB was lost — see below). It is *not*
a dedicated database for the `log01` app (which is fully self-contained on SQLite).

- **Before deleting or modifying any namespace/service here, grep every other app's
  `values.yaml` for references to that namespace** (e.g. `workout.svc.cluster.local`,
  `workout-pg`, `workout-redis`). Don't assume a namespace is single-purpose just because its
  name matches one app.
- **There is no backup target configured in Longhorn** (`kubectl get backuptargets.longhorn.io`
  is empty) despite docs mentioning Backblaze B2 — treat all PVC data in this cluster as
  **unrecoverable if deleted**. Set up real backups before relying on any "we can restore it"
  assumption.
- CNPG **1.29.0** (current version here) has **no standalone `Role` CRD** — DB roles must be
  declared via `spec.managed.roles` on the `Cluster` resource (with a `passwordSecret` ref),
  not a separate `Role` kind.
- Zitadel's Postgres role/database (`zitadel-role`/`zitadel-db`) was lost in a prior incident
  and has **not** been restored — `apps/zitadel/values.yaml` still points at credentials that
  no longer exist. Recovering Zitadel means recreating its role/db in `apps/workout`'s CNPG
  cluster, rotating its password in `values.yaml`, and re-running its init — after which **all
  prior SSO identities/orgs/OIDC clients are gone** and must be recreated from scratch.
- The Forgejo ingress (`apps/forgejo/templates/ingress.yaml`) needs
  `nginx.ingress.kubernetes.io/proxy-body-size: 512m` for its container registry — nginx's
  1MB default causes `docker push` to fail with `413 Request Entity Too Large` on image layers.
