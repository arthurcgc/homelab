# Homelab

Self-hosted services running on the home PC (Arch Linux, Ryzen 9 5900X).

## Services

| Service | Port | Description | Dir |
|---------|------|-------------|-----|
| [Glance](https://github.com/glanceapp/glance) | 8080 | Dashboard — RSS, HN, YouTube, markets, releases, weather | `glance/` |
| [Cosma](https://github.com/graphlab-fr/cosma) | 9102 | Knowledge graph visualization for ~/notes/ | `cosma/` |

## Quick Start

```bash
# Start a service
cd glance && docker compose up -d

# Stop
docker compose down
```

## Adding a New Service

1. Create a directory: `mkdir my-service`
2. Add `docker-compose.yml` and config files
3. Add `.env.example` if secrets are needed (real `.env` is gitignored)
4. Update this README

## Network

All services use `network_mode: host` where possible (no port mapping overhead). The PC is discoverable as `pichau.local` on the LAN via Avahi/mDNS.

## Secrets

`.env` files contain tokens/keys and are gitignored. Each service has a `.env.example` template with placeholder values.
