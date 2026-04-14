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
