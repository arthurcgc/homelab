# Homelab

Self-hosted services running on the home PC (Arch Linux, Ryzen 9 5900X, 32GB RAM, dual AMD GPUs).

Reachable on LAN at `pichau.local` via Avahi/mDNS.

## Services

| Service | Port | Dir |
|---------|------|-----|
| [Glance](#glance) | 8080 | `glance/` |
| [Quartz](#quartz) | 8082 | `quartz/` |
| [whisper.cpp](#whispercpp--speech-to-text) | 9100 | `voice/whisper/` |
| [Kokoro](#kokoro--text-to-speech) | 9101 | `voice/kokoro/` |

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
- **Model:** `ggml-small.en.bin` (~460MB, English) — mounted from `~/Documents/faye/models/whisper/`
- **API:** `POST /inference` (multipart form: `file` + `response_format=json`)
- **Latency:** ~1-2s for a typical voice command

```bash
cd voice && docker compose up -d whisper

# Test
curl -X POST http://localhost:9100/inference \
  -F "file=@test.wav" -F "response_format=json"
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

## Quick Reference

```bash
# Start everything
cd glance && docker compose up -d
cd ../quartz && docker compose up -d
cd ../voice && docker compose up -d

# Stop everything
docker stop glance quartz faye-whisper faye-kokoro

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
