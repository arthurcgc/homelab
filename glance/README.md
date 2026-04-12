# Glance

Personal dashboard that aggregates everything into a single page.

## What it does

Pulls data from multiple sources and displays it in a clean, customizable layout:

- **RSS feeds** — SRE, Kubernetes, Go, Istio, Cilium blogs
- **Hacker News + Lobsters** — tech news
- **YouTube** — subscribed channels (Jeff Geerling, Fireship, Rawkode, etc.)
- **Reddit** — r/kubernetes, r/selfhosted
- **GitHub releases** — k8s, argo-cd, istio, cilium, prometheus, helm, k9s
- **Markets** — SPY, BTC, USDBRL, TSM, ASML, GOOGL, MSFT
- **Podcasts** — All-In, Acquired, Lex Fridman, Darknet Diaries, Flagrant, etc.
- **Weather** — Sao Paulo + Rio de Janeiro
- **Docker containers** — live status of running containers

## Use case

One tab to check in the morning instead of opening 10 different sites. Added to phone home screen as a PWA via `pichau.local:8080`.

## Setup

```bash
cp .env.example .env
# Edit .env — add your GitHub PAT (read-only, for release tracking)
docker compose up -d
```

## Config

- `config/glance.yml` — main config (theme, pages)
- `config/home.yml` — home page layout and widgets
- `assets/user.css` — custom CSS overrides
- `assets/faye.js` — custom JS (Faye integration button)

## Port

8080 (`network_mode: host`)
