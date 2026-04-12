# Cosma — knowledge graph visualization for markdown notes
# Generates a static cosmoscope and serves it via nginx

FROM node:22-slim AS base

RUN npm install -g @graphlab-fr/cosma

# Install nginx for serving
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Create user data dir for cosma
RUN cosma --create-user-data-dir

COPY entrypoint.sh /entrypoint.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chmod +x /entrypoint.sh

# Remove default nginx site
RUN rm -f /etc/nginx/sites-enabled/default

RUN mkdir -p /data/notes /var/www/cosma

EXPOSE 9102

ENTRYPOINT ["/entrypoint.sh"]
