# Voice Services

Speech-to-text (whisper.cpp) and text-to-speech (Kokoro) containers that power Faye's voice interface.

## What they do

Two containers that convert between audio and text:

- **whisper.cpp** (:9100) — takes audio in, returns transcribed text. Uses the GPU via Vulkan for fast inference.
- **Kokoro** (:9101) — takes text in, returns spoken audio. Runs on CPU with ONNX. Multiple voice presets available.

## Use case

These are the backend services for talking to Faye with your voice. The flow is:

1. You speak into a mic
2. **whisper** transcribes your speech to text
3. Text goes to OpenClaw (Faye's brain) for a response
4. **Kokoro** converts Faye's response to audio
5. Audio plays through your speaker

The voice client that orchestrates this lives in the [faye repo](https://github.com/arthurcgc/faye) at `voice/client.py`. These containers are the infrastructure it calls.

## Setup

```bash
# Download the whisper model first (~466MB)
mkdir -p ~/Documents/faye/models/whisper
curl -L -o ~/Documents/faye/models/whisper/ggml-small.en.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin

# Start both services
docker compose up -d
```

## whisper.cpp (STT)

- **Port:** 9100
- **GPU:** AMD RX 7800 XT via Vulkan (RADV). Needs `/dev/dri` passthrough.
- **Model:** `ggml-small.en.bin` — English, ~460MB, ~1.5GB VRAM
- **API:** `POST /inference` with multipart form (`file` + `response_format=json`)

```bash
# Test
arecord -d 3 -f S16_LE -r 16000 -c 1 /tmp/test.wav
curl -X POST http://localhost:9100/inference \
  -F "file=@/tmp/test.wav" -F "response_format=json"
```

## Kokoro (TTS)

- **Port:** 9101
- **Engine:** kokoro-onnx on CPU. No GPU needed.
- **Default voice:** `af_heart` (warm American female)
- **API:**
  - `POST /tts` — `{"text": "...", "voice": "af_heart"}` returns WAV audio
  - `GET /voices` — list all available voice presets
  - `GET /health` — health check

```bash
# Test
curl -X POST http://localhost:9101/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, I am Faye."}' -o test.wav
aplay test.wav
```

### Available voices

American female: `af_heart`, `af_nova`, `af_sky`, `af_bella`, `af_sarah`, `af_nicole`
British female: `bf_emma`, `bf_isabella`
American male: `am_adam`, `am_michael`
British male: `bm_george`, `bm_lewis`

Change the default in `docker-compose.yml` or pass per-request via the `voice` field.
