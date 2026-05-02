# Quartz — Obsidian-style knowledge base with graph view
# Serves markdown notes from a mounted volume

FROM node:22-slim

WORKDIR /usr/src/app

# Clone Quartz v4
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && \
    rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch v4 https://github.com/jackyzha0/quartz.git . && \
    npm ci && \
    node -e " \
      const fs = require('fs'); \
      let c = fs.readFileSync('quartz/components/scripts/graph.inline.ts', 'utf8'); \
      c = c.replace( \
        '} else if (visited.has(d.id) || d.id.startsWith(\"tags/\")) {\n      return computedStyleMap[\"--tertiary\"]', \
        '} else if (d.id.startsWith(\"tags/\")) {\n      return \"#363636\"\n    } else if (visited.has(d.id)) {\n      return \"#33ff66\"' \
      ); \
      c = c.replace( \
        'return computedStyleMap[\"--secondary\"]\n    } else', \
        'return \"#ffffff\"\n    } else' \
      ); \
      c = c.replace( \
        'return computedStyleMap[\"--gray\"]\n', \
        'return \"#33ff66\"\n' \
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
