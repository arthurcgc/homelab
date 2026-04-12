# Kokoro TTS server (ONNX, CPU-only)

FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    espeak-ng \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir kokoro-onnx numpy

# Download model files at build time so startup is instant
WORKDIR /models
RUN wget -q https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx && \
    wget -q https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin && \
    ls -lh /models/

WORKDIR /app
COPY server.py .

EXPOSE 9101

ENTRYPOINT ["python3", "server.py"]
CMD ["--port", "9101", "--voice", "af_heart"]
