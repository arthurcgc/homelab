# whisper.cpp with Vulkan for AMD GPUs (RADV)
# Multi-stage: build with dev deps, runtime with mesa drivers only

# ── Build stage ──
FROM ubuntu:24.04 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    git cmake make g++ \
    libvulkan-dev \
    glslang-tools glslc \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN git clone --depth 1 https://github.com/ggml-org/whisper.cpp .
RUN cmake -B build \
    -DGGML_VULKAN=ON \
    -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --config Release -j$(nproc)

# ── Runtime stage ──
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    libvulkan1 \
    mesa-vulkan-drivers \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy server binary and shared libs
COPY --from=builder /build/build/bin/whisper-server /usr/local/bin/
COPY --from=builder /build/build/src/libwhisper.so.1.8.4 /usr/local/lib/
COPY --from=builder /build/build/ggml/src/libggml-base.so.0.9.8 /usr/local/lib/
COPY --from=builder /build/build/ggml/src/libggml-cpu.so.0.9.8 /usr/local/lib/
COPY --from=builder /build/build/ggml/src/libggml.so.0.9.8 /usr/local/lib/
COPY --from=builder /build/build/ggml/src/ggml-vulkan/libggml-vulkan.so.0.9.8 /usr/local/lib/

# Create symlinks and update cache
RUN cd /usr/local/lib && \
    ln -sf libwhisper.so.1.8.4 libwhisper.so.1 && \
    ln -sf libwhisper.so.1 libwhisper.so && \
    ln -sf libggml-base.so.0.9.8 libggml-base.so.0 && \
    ln -sf libggml-base.so.0 libggml-base.so && \
    ln -sf libggml-cpu.so.0.9.8 libggml-cpu.so.0 && \
    ln -sf libggml-cpu.so.0 libggml-cpu.so && \
    ln -sf libggml.so.0.9.8 libggml.so.0 && \
    ln -sf libggml.so.0 libggml.so && \
    ln -sf libggml-vulkan.so.0.9.8 libggml-vulkan.so.0 && \
    ln -sf libggml-vulkan.so.0 libggml-vulkan.so && \
    ldconfig

EXPOSE 9100

ENTRYPOINT ["whisper-server"]
CMD ["--host", "0.0.0.0", "--port", "9100"]
