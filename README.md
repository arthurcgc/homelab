# Homelab

Self-hosted services running on the home PC (Arch Linux, Ryzen 9 5900X, 32GB RAM, dual AMD GPUs).

Reachable on LAN at `http://pichau` (nginx reverse proxy on port 80). Landing page links to all services.

## Services

| Service | Path | Port | Dir |
|---------|------|------|-----|
| [Nginx](#nginx) | `/` | 80 | `nginx/` |
| [Glance](#glance) | `/glance/` | 8080 | `glance/` |
| [Glances](#glances) | `/glances/` | 61208 | `glances/` |
| [Quartz](#quartz) | `/quartz/` | 8082 | `quartz/` |
| [whisper.cpp](#whispercpp--speech-to-text) | — | 9100 | `voice/whisper/` |
| [Kokoro](#kokoro--text-to-speech) | — | 9101 | `voice/kokoro/` |
| [Paperless-ngx](#paperless-ngx) | `/paperless/` | 8000 | `paperless/` |
| [Home Assistant](#home-assistant) | — | 8123 | `home-assistant/` |
| [Radar (Mac)](#radar-mac) | `/radar/` | 9280 | `mac/radar/` |

## Nginx

Reverse proxy and landing page. Routes all services under a single port (80) with path-based routing. Static HTML landing page at `/` with links to every service.

- **Image:** `nginx:alpine` (upstream)
- **Port:** 80 (`network_mode: host`)
- **Config:** `nginx/nginx.conf`
- **Landing page:** `nginx/index.html`

```bash
cd nginx && docker compose up -d
# Open http://pichau
```

## Radar (Mac)

Kubernetes dashboard and read-only MCP context for coding agents. Runs natively on the Mac through a per-user launchd service, using the host's kubeconfig and AWS SSO.

- **UI:** http://localhost/radar/ through the Mac nginx proxy.
- **Backend:** Homebrew `kubectl-radar`, bound to `127.0.0.1:9280` with `--base-path=/radar`.
- **Service definition:** `mac/radar/com.arthur.radar.plist`.
- **History:** `~/.radar/timeline.db`, seven-day retention, 1 GiB cap. Records only while running and connected to the selected cluster.
- **Logs:** `~/Library/Logs/radar.log` and `radar-error.log`.
- **MCP:** http://127.0.0.1:9280/radar/mcp-readonly. Configure `radar` once in `~/.claude.json`, then run `mcp-sync.py` to update Pi and Codex.
- **Permissions:** the MCP endpoint exposes only read tools; the UI retains the kubeconfig identity's write permissions.
- **Investigation agent:** `mac/radar/codex-fast`, installed to `~/.radar/bin/codex-fast` and selected through `RADAR_AI_CLI_BIN`. Adds `service_tier="priority"` to Codex invocations and forwards Radar's arguments unchanged, including safeguards. Model and reasoning effort remain selectable in Radar; use `gpt-6.1-sol` with medium effort. Authentication uses the existing Codex login.

```bash
bash mac/radar/install.sh
docker exec nginx nginx -t
docker exec nginx nginx -s reload
# Open http://localhost/radar/
```

The installer renders the launchd template with the current home directory and restarts Radar. The existing SQLite database is preserved. Radar starts at login without opening a browser. This service belongs to the Mac setup, not the Linux host's Compose stack.

### Radar metrics proxy

The Mac Compose stack runs upstream [prom-label-proxy](https://github.com/prometheus-community/prom-label-proxy) v0.15.1, pinned by image digest. nginx selects a cluster from the URL and overwrites `X-Radar-Cluster`; the proxy injects that label into every PromQL selector and scopes supported metadata requests. The proxy is internal to the Docker network and has no published port.

Backend addresses and cluster names stay in ignored local files:

- `mac/.env`: `RADAR_PROMETHEUS_UPSTREAM` is the full Grafana Prometheus datasource proxy URL; `RADAR_PROMETHEUS_HOST` is its hostname without a scheme or path. Copy the fields from `mac/.env.example` into the existing `.env`, or copy the example for a fresh setup.
- `mac/radar/local/metrics-clusters.conf`: nginx map entries mapping each URL context slug to its exact Prometheus `cluster` label. Copy `mac/radar/metrics-clusters.conf.example` and replace its example context slugs and cluster names.

For example, the `cluster-a` entry makes `http://127.0.0.1/radar-metrics/cluster-a` a cluster-scoped Prometheus URL. Save the matching URL under that context's Radar Metrics connection. Requests require an `Authorization: Bearer <Grafana service-account token>` header; nginx and prom-label-proxy forward it to the configured datasource proxy. Keep credentials in local Radar settings or environment-backed header references, not this repo. Unknown context paths return 404. Switching Radar contexts must select that context's saved URL; do not set one global Prometheus URL.

```bash
mkdir -p mac/radar/local
cp mac/radar/metrics-clusters.conf.example mac/radar/local/metrics-clusters.conf
# Edit the local cluster map and mac/.env before starting the services.
cd mac
docker compose up -d --no-deps radar-metrics nginx
docker exec nginx nginx -t
```

Only endpoints supported by prom-label-proxy are forwarded. This does not add collection or change cluster telemetry.

## Glance

Dashboard aggregating RSS feeds, Hacker News, YouTube, Reddit, GitHub releases, market tickers, and weather into a single page.

- **Image:** `glanceapp/glance` (upstream)
- **Port:** 8080 (`network_mode: host`)
- **Config:** `glance/config/glance.yml` + `glance/config/home.yml`
- **Assets:** `glance/assets/` (custom CSS + JS)
- **Secrets:** `glance/.env` — `GITHUB_TOKEN` for release tracking (template in `.env.example`)

```bash
cd glance && docker compose up -d
```

## Glances

Real-time system monitoring dashboard (CPU, memory, disk, network, containers, processes). Exposes a web UI and REST API.

- **Image:** `nicolargo/glances:latest-full` (upstream)
- **Port:** 61208 (`network_mode: host`)
- **Access:** Full host visibility via `pid: host`, root filesystem mounted read-only, Docker socket for container monitoring

```bash
cd glances && docker compose up -d
# Open http://localhost:61208
```

## Quartz

Static knowledge base generated from `~/notes/`. Renders markdown notes as a searchable website with an interactive graph view, tag pages, and full-text search. Built for Obsidian-style notes.

- **Image:** Built from source (Quartz v4 + Node 22)
- **Port:** 8082
- **Content:** `~/notes/` mounted read-only
- **Frontmatter:** Only needs `tags: [...]` — no special fields required
- **Rebuild:** Hot-reloads when notes change

```bash
cd quartz && docker compose up -d
# Open http://localhost:8082
```

## whisper.cpp — Speech-to-Text

Transcribes audio to text using OpenAI's Whisper model, compiled with Vulkan for AMD GPU acceleration. Used by Faye's voice client for real-time speech recognition.

- **Image:** Built from source (multi-stage: C++ build with Vulkan → runtime with RADV + ffmpeg)
- **Port:** 9100
- **GPU:** RX 7800 XT via Vulkan (`/dev/dri` passthrough)
- **Model:** `ggml-large-v3.bin` (~2.9GB, multilingual, auto-detects language) — mounted from `~/Documents/faye/models/whisper/`
- **API:** `POST /v1/audio/transcriptions` (OpenAI-compatible, multipart form: `file` + `response_format=json`)
- **Consumers:** Faye's voice client (PC mic) + OpenClaw audio pipeline (WhatsApp voice notes)

```bash
cd voice && docker compose up -d whisper

# Test
curl -X POST http://localhost:9100/v1/audio/transcriptions \
  -F "file=@test.ogg" -F "response_format=json"
```

## Kokoro — Text-to-Speech

Converts text to natural-sounding speech using the Kokoro ONNX model. Runs on CPU — no GPU needed. Used by Faye's voice client to speak responses.

- **Image:** Built from source (Python 3.12 + kokoro-onnx + espeak-ng)
- **Port:** 9101
- **Engine:** kokoro-onnx (ONNX Runtime, CPU)
- **Voice:** `af_heart` (warm American female) — configurable per request
- **Model:** Baked into the Docker image (~311MB ONNX + 27MB voices)
- **API:**
  - `POST /tts` — JSON body `{"text": "...", "voice": "af_heart"}` → returns `audio/wav`
  - `GET /voices` — lists available voice presets
  - `GET /health` — health check
- **Latency:** ~0.5-1s per sentence

Available voices: `af_heart`, `af_nova`, `af_sky`, `af_bella`, `bf_emma`, `am_adam`, `bm_george`, and more.

```bash
cd voice && docker compose up -d kokoro

# Test
curl -X POST http://localhost:9101/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}' -o test.wav
```

## Paperless-ngx

Document management system for personal documents — IDs, certificates, tax docs. OCR, auto-tagging, full-text search. Drop files into `consume/` for auto-import.

- **Image:** `ghcr.io/paperless-ngx/paperless-ngx:latest` (upstream)
- **Port:** 8000
- **Database:** SQLite (internal)
- **Broker:** Redis 8 (container: `paperless-broker`)
- **OCR:** Portuguese + English
- **Secrets:** `paperless/.env` — `PAPERLESS_SECRET_KEY` (template in `.env.example`)

```bash
cd paperless && docker compose up -d
# Create admin user on first run:
docker exec -it paperless python3 manage.py createsuperuser
# Open http://pichau.local:8000
```

## Home Assistant

Home automation for the house lights (Avant and Ekaza Wi-Fi bulbs, controlled locally through tuya-local) and the living room TV. It runs on the Raspberry Pi (`pi-faye.local`, on Wi-Fi), not on pichau. See `home-assistant/README.md` for the Casa floor-plan panel and party mode, and `home-assistant/PLAN.md` for the full plan.

- **Image:** `ghcr.io/home-assistant/home-assistant:2026.9.4` (upstream)
- **Port:** 8123 (`network_mode: host`)
- **Config:** `/opt/homeassistant/config` on the Pi (not in this repo)
- **Casa panel:** `http://pi-faye.local:8123/casa`, a floor plan of the house for toggling lights and party mode (`home-assistant/panel/`)

```bash
ssh samsepiol@pi-faye.local 'cd /opt/homeassistant && docker compose up -d'
# Open http://pi-faye.local:8123
```

## Quick Reference

```bash
# Start everything
cd nginx && docker compose up -d
cd ../glance && docker compose up -d
cd ../glances && docker compose up -d
cd ../quartz && docker compose up -d
cd ../voice && docker compose up -d
cd ../paperless && docker compose up -d

# Stop everything
docker stop nginx glance glances quartz faye-whisper faye-kokoro paperless paperless-broker

# Check what's running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Adding a New Service

1. Create a directory: `mkdir my-service`
2. Add `docker-compose.yml` and config files
3. Add `.env.example` if secrets are needed (real `.env` is gitignored)
4. Document the service in this README
5. Commit and push

## Secrets

`.env` files contain tokens/keys and are gitignored. Each service has a `.env.example` template with placeholder values.
