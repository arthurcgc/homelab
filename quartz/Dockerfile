# Quartz — Obsidian-style knowledge base with graph view
# Serves markdown notes from a mounted volume

FROM node:22-slim

WORKDIR /usr/src/app

# Clone Quartz v4
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && \
    rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch v4 https://github.com/jackyzha0/quartz.git . && \
    npm ci

# Copy custom config
COPY quartz.config.ts ./quartz.config.ts

# Content will be mounted at /usr/src/app/content
RUN mkdir -p content

EXPOSE 8082

CMD ["npx", "quartz", "build", "--serve", "--port", "8082"]
