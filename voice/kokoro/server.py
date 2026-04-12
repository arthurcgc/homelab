#!/usr/bin/env python3
"""Kokoro TTS HTTP server — accepts text, returns WAV audio.

Usage:
    python3 server.py [--port 9101] [--voice af_heart]

Endpoints:
    POST /tts          — JSON body: {"text": "...", "voice": "af_heart"} → audio/wav
    GET  /health       — {"ok": true}
    GET  /voices       — list available voice presets
"""

import argparse
import io
import json
import logging
import struct
import sys
import wave
from http.server import HTTPServer, BaseHTTPRequestHandler

LOG = logging.getLogger("kokoro-tts")

# Lazy-loaded on first request
_kokoro = None
_voices = {}

SAMPLE_RATE = 24000
SAMPLE_WIDTH = 2
CHANNELS = 1

# Voices to pre-describe for the /voices endpoint
VOICE_DESCRIPTIONS = {
    "af_heart": "American female, warm and expressive",
    "af_nova": "American female, clear and confident",
    "af_sky": "American female, bright and energetic",
    "af_bella": "American female, smooth and calm",
    "af_sarah": "American female, professional",
    "af_nicole": "American female, soft and gentle",
    "bf_emma": "British female, refined",
    "bf_isabella": "British female, warm",
    "am_adam": "American male, deep and steady",
    "am_michael": "American male, friendly",
    "bm_george": "British male, authoritative",
    "bm_lewis": "British male, conversational",
}


MODEL_DIR = "/models"


def get_kokoro():
    global _kokoro
    if _kokoro is None:
        LOG.info("Loading Kokoro model (first request, may take a moment)...")
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(
            f"{MODEL_DIR}/kokoro-v1.0.onnx",
            f"{MODEL_DIR}/voices-v1.0.bin",
        )
        LOG.info("Kokoro model loaded")
    return _kokoro


def synthesize(text: str, voice: str) -> bytes:
    """Generate WAV audio from text using Kokoro."""
    kokoro = get_kokoro()
    samples, sr = kokoro.create(text, voice=voice, speed=1.0)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(sr)
        # Convert float32 samples to int16
        import numpy as np
        pcm = (samples * 32767).astype(np.int16).tobytes()
        wf.writeframes(pcm)
    return buf.getvalue()


class TTSHandler(BaseHTTPRequestHandler):
    default_voice = "af_heart"

    def log_message(self, format, *args):
        LOG.info(format, *args)

    def do_GET(self):
        if self.path == "/health":
            body = json.dumps({"ok": True}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/voices":
            body = json.dumps(VOICE_DESCRIPTIONS, indent=2).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path != "/tts":
            self.send_error(404)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_error(400, "No body")
            return

        try:
            data = json.loads(self.rfile.read(content_length))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        text = data.get("text", "").strip()
        if not text:
            self.send_error(400, "No text provided")
            return

        voice = data.get("voice", self.default_voice)

        LOG.info("Synthesizing %d chars with voice '%s'", len(text), voice)
        try:
            wav = synthesize(text, voice)
        except Exception as e:
            LOG.error("Synthesis failed: %s", e)
            self.send_error(500, f"Synthesis failed: {e}")
            return

        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(wav)))
        self.end_headers()
        self.wfile.write(wav)


def main():
    parser = argparse.ArgumentParser(description="Kokoro TTS Server")
    parser.add_argument("--port", type=int, default=9101)
    parser.add_argument("--voice", default="af_heart", help="Default voice preset")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    TTSHandler.default_voice = args.voice

    # Pre-load model at startup
    get_kokoro()

    server = HTTPServer(("0.0.0.0", args.port), TTSHandler)
    LOG.info("Kokoro TTS listening on port %d (default voice: %s)", args.port, args.voice)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        LOG.info("Shutting down")
        server.server_close()


if __name__ == "__main__":
    main()
