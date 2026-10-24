#!/bin/sh
# Hourly: keep tuya-local bulb IPs and yt-remote's TV_HOST in step with DHCP.
set -eu
cd /opt/homeassistant
TV_MAC=c8:a6:ef:15:a9:21
T=$(grep ^HA_TOKEN= .env | cut -d= -f2-)

docker exec -e T="$T" homeassistant python3 /config/reconcile/reconcile.py

for i in $(seq 2 254); do ping -c1 -W1 "192.168.0.$i" >/dev/null 2>&1 & done
wait
tv=$(ip -4 neigh | grep -i "$TV_MAC" | awk '{print $1}' | head -1)
current=$(grep ^TV_HOST= .env | cut -d= -f2- || true)
if [ -n "$tv" ] && [ "$tv" != "$current" ]; then
  if grep -q ^TV_HOST= .env; then sed -i "s/^TV_HOST=.*/TV_HOST=$tv/" .env; else echo "TV_HOST=$tv" >> .env; fi
  docker compose up -d yt-remote >/dev/null 2>&1
  echo "TV: ${current:-unset} -> $tv (yt-remote restarted)"
fi
