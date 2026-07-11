# Quartz — Obsidian-style knowledge base with graph view
# Serves markdown notes from a mounted volume

FROM node:22-slim@sha256:f3a68cf41a855d227d1b0ab832bed9749469ef38cf4f58182fb8c893bc462383

WORKDIR /usr/src/app

# Clone Quartz v4, pinned to the last v4 commit (2026-04-20) for reproducible
# builds — the branch is in maintenance mode since v5 and could move or vanish.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && \
    rm -rf /var/lib/apt/lists/*
RUN git init . && \
    git remote add origin https://github.com/jackyzha0/quartz.git && \
    git fetch --depth 1 origin d25a6eabf96751ffca56f8a8139272def7a65041 && \
    git checkout FETCH_HEAD && \
    npm ci && \
    node -e " \
      const fs = require('fs'); \
      let c = fs.readFileSync('quartz/components/scripts/graph.inline.ts', 'utf8'); \
      c = c.replace( \
        '} else if (visited.has(d.id) || d.id.startsWith(\"tags/\")) {\n      return computedStyleMap[\"--tertiary\"]', \
        '} else if (d.id.startsWith(\"tags/\")) {\n      return \"#414868\"\n    } else if (visited.has(d.id)) {\n      return \"#bb9af7\"' \
      ); \
      c = c.replace( \
        'return computedStyleMap[\"--secondary\"]\n    } else', \
        'return \"#f7768e\"\n    } else' \
      ); \
      c = c.replace( \
        'return computedStyleMap[\"--gray\"]\n', \
        'return \"#bb9af7\"\n' \
      ); \
      c = c.replace( \
        'isTagNode ? computedStyleMap[\"--light\"] : color(n)', \
        'color(n)' \
      ); \
      c = c.replace( \
        'gfx.stroke({ width: 2, color: computedStyleMap[\"--tertiary\"] })', \
        'gfx.stroke({ width: 0 })' \
      ); \
      fs.writeFileSync('quartz/components/scripts/graph.inline.ts', c); \
    "

# Copy custom config, layout, styles, and components
COPY quartz.config.ts ./quartz.config.ts
COPY quartz.layout.ts ./quartz.layout.ts
COPY custom.scss ./quartz/styles/custom.scss
COPY TagColors.tsx ./quartz/components/TagColors.tsx

# Content will be mounted at /usr/src/app/content
RUN mkdir -p content

EXPOSE 8082

CMD ["npx", "quartz", "build", "--serve", "--port", "8082"]
