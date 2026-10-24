#!/bin/bash
set -euo pipefail

case "${1:-}" in
  -h|--help)
    echo "Usage: bash mac/radar/install.sh"
    echo "Install Radar with Homebrew and start its per-user launchd service."
    exit 0
    ;;
  "") ;;
  *) echo "Unexpected argument: $1" >&2; exit 2 ;;
esac

if [ ! -x /opt/homebrew/bin/kubectl-radar ]; then
  brew install kubectl-radar
fi

source_dir="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$HOME/.radar/bin" "$HOME/Library/Logs" "$HOME/Library/LaunchAgents"
install -m 755 "$source_dir/codex-fast" "$HOME/.radar/bin/codex-fast"
python3 - "$source_dir/com.arthur.radar.plist" <<'PY'
import os
import plistlib
import sys
from pathlib import Path

home = str(Path.home())
source = Path(sys.argv[1]).read_text().replace("__HOME__", home)
config = plistlib.loads(source.encode())
target = Path.home() / "Library/LaunchAgents/com.arthur.radar.plist"
temporary = target.with_suffix(".tmp")
with temporary.open("wb") as stream:
    plistlib.dump(config, stream)
os.replace(temporary, target)
PY

domain="gui/$(id -u)"
if launchctl print "$domain/com.arthur.radar" >/dev/null 2>&1; then
  launchctl bootout "$domain/com.arthur.radar"
fi
for attempt in 1 2 3 4 5; do
  if launchctl bootstrap "$domain" "$HOME/Library/LaunchAgents/com.arthur.radar.plist"; then
    break
  fi
  if [ "$attempt" -eq 5 ]; then
    echo "Failed to bootstrap Radar after five attempts" >&2
    exit 1
  fi
  sleep 1
done
launchctl kickstart "$domain/com.arthur.radar"
echo "Radar UI: http://localhost/radar/"
echo "Read-only MCP: http://127.0.0.1:9280/radar/mcp-readonly"
