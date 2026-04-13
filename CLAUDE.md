# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Docker Compose homelab — self-hosted services running on an Arch Linux PC (Ryzen 9 5900X, 32GB RAM, RX 7800 XT + second AMD GPU). Reachable on LAN at `pichau.local` via Avahi/mDNS.

There is no build system, test suite, or linter. The repo is pure infrastructure config: Docker Compose files, Dockerfiles, config YAML, and one Python server.

## Architecture

Each service lives in its own directory with a `docker-compose.yml`. There is no top-level compose file — services are started independently.

| Service | Dir | Port | Image |
|---------|-----|------|-------|
| Glance (dashboard) | `glance/` | 8080 | `glanceapp/glance` (upstream) |
| Glances (system monitor) | `glances/` | 61208 | `nicolargo/glances:latest-full` (upstream) |
| Quartz (knowledge base) | `quartz/` | 8082 | Built from source (Node 22 + Quartz v4) |
| whisper.cpp (STT) | `voice/whisper/` | 9100 | Built from source (C++ with Vulkan) |
| Kokoro (TTS) | `voice/kokoro/` | 9101 | Built from source (Python 3.12 + kokoro-onnx) |

The voice services (whisper + kokoro) share a single `voice/docker-compose.yml` and are used by the [Faye assistant](~/Documents/faye) project. Whisper requires GPU passthrough (`/dev/dri`) for Vulkan acceleration on the RX 7800 XT. Kokoro runs CPU-only.

Quartz mounts `~/notes/` read-only and hot-reloads when notes change. Whisper mounts its model from `~/Documents/faye/models/whisper/`.

## Common commands

```bash
# Start a service
cd glance && docker compose up -d
cd quartz && docker compose up -d
cd voice && docker compose up -d          # both whisper + kokoro
cd voice && docker compose up -d whisper  # just one

# Rebuild after Dockerfile changes
cd voice && docker compose up -d --build

# Logs
docker logs -f glance
docker logs -f faye-whisper
docker logs -f faye-kokoro
docker logs -f quartz

# Stop everything
docker stop glance quartz faye-whisper faye-kokoro
```

## Secrets

`.env` files are gitignored. Each service that needs secrets has a `.env.example` template. Currently only Glance uses one (`GITHUB_TOKEN` for release tracking).

## Glance customizations

Glance config is split: `glance/config/glance.yml` (theme, server settings, head injection) includes `glance/config/home.yml` (all widgets/layout) via `$include`. Custom assets in `glance/assets/`:
- `faye.js` — injects a "faye" button on feed items that sends articles to the Faye WhatsApp bot for summarization
- `user.css` — styling for the Faye button

## Adding a service

1. Create a directory with `docker-compose.yml` (and `Dockerfile` if building from source)
2. Add `.env.example` if secrets are needed
3. Document in the root `README.md`
