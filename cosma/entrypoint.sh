#!/bin/bash
set -e

NOTES_DIR="/data/notes"
OUTPUT_DIR="/var/www/cosma"
CONFIG_DIR="/root/.local/share/cosma-cli"

# Set up cosma config
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_DIR/defaults.yml" << YAML
select_origin: directory
files_origin: $NOTES_DIR
nodes_origin: null
links_origin: null
export_target: $OUTPUT_DIR
history: false
record_types:
  undefined:
    fill: "#858585"
    stroke: "#858585"
link_types:
  undefined:
    stroke: simple
    color: "#e1e1e1"
record_metas:
  - tags
title: "Arthur's Knowledge Graph"
author: Arthur
description: "Cosma visualization of ~/notes/"
graph_background_color: "#1a1a2e"
graph_highlight_color: "#e94560"
graph_highlight_on_hover: true
graph_text_size: 10
graph_arrows: true
focus_max: 2
generate_id: always
lang: en
YAML

generate() {
    echo "[cosma] Generating cosmoscope..."
    cosma modelize 2>&1 || echo "[cosma] Generation failed"
    echo "[cosma] Done at $(date)"
}

# Generate on startup
generate

# Regenerate every 5 minutes via background loop (simpler than cron in container)
while true; do
    sleep 300
    generate
done &

# Start nginx in foreground
echo "[cosma] Serving on port 9102"
nginx -g 'daemon off;'
