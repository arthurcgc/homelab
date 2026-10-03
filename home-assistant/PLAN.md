# Home Assistant plan

Home Assistant controls the lights in the house. It runs on the Raspberry Pi, not on the Mac, because the Pi can use host networking and USB directly.

## Target

| Item | Value |
|------|-------|
| Host | Raspberry Pi 4 Model B, 8 GB RAM, hostname `pi-faye` |
| Address | `192.168.0.17` on ethernet |
| OS | Debian 13 (trixie), 64-bit |
| Container runtime | Docker Engine 29.8.2 with Compose v5.6.0, from Docker's apt repository |
| Install method | Home Assistant Container, image pinned to `2026.9.4` |
| Web UI | `http://192.168.0.17:8123` |

Home Assistant Container shares the Pi with other services. Home Assistant OS would replace the whole operating system, so it is not used.

## Layout

- `docker-compose.yml` in this directory is the source of truth for the container. It is copied to `/opt/homeassistant/docker-compose.yml` on the Pi.
- The Home Assistant configuration lives on the Pi at `/opt/homeassistant/config`, on the internal 235 GB card.
- The container uses `network_mode: host`, so device discovery (mDNS and SSDP) reaches the home network without extra setup.
- Only hand-written YAML files (`configuration.yaml`, automations, scripts) may be tracked in this repository. The `.storage` directory and `secrets.yaml` hold tokens and must never be committed.

## Storage

A 1 TB Seagate Expansion Portable drive is attached to the Pi. It has an ext4 filesystem labeled `storage` (UUID `75eb5c56-ce0f-4a73-8ce5-2f89f92486da`), is empty, and is not mounted automatically. Its intended use is Home Assistant backups and other bulk data. The Home Assistant database stays on the card, because it writes constantly and a portable hard drive suits that poorly.

## Devices

The lights are Avant and Ekaza Wi-Fi bulbs, which are built on the Tuya platform.

1. Install the Smart Life app (Tuya's consumer app) on a phone and create an account. The Ekaza and Avant NEO apps are not used, because Home Assistant's documentation lists only Smart Life and Tuya Smart.
2. Pair each bulb in Smart Life with the phone on the 2.4 GHz Wi-Fi network.
3. In Home Assistant, add the Tuya integration and sign in with the QR code, using the user code from the Smart Life app. No Tuya developer account is needed.

The official Tuya integration is cloud based: every command goes from Home Assistant to Tuya's servers and back down to the bulb, with uneven delays. The bulbs are therefore controlled locally with **tuya-local** (`make-all/tuya-local`, installed through HACS as a custom repository), which talks to each bulb over the LAN on TCP port 6668.

- tuya-local's cloud-assisted setup logs in once with the Smart Life app and fetches each bulb's local key. After that login is cached, more bulbs can be added with `setup_mode: cloud`, the Tuya device ID, and `hub_id: None`, with no new QR scan.
- A pending tuya-local discovery suggestion for a device blocks a manual add with `already_in_progress`. Abort that flow first (`DELETE /api/config/config_entries/flow/<flow_id>`).
- Re-pairing a bulb in Smart Life changes its local key, so the tuya-local entry must be re-added afterwards.
- tuya-local creates entities with a `_2` suffix while the cloud entities hold the original IDs. The cloud entities were renamed to `light.<name>_cloud` and the official Tuya integration is disabled, so the tuya-local lights carry the original IDs. A newly added bulb needs the same rename.
- The bulbs report `supported_features: 4`, which is the effect flag, not transitions. Home Assistant drops any `transition` value. The smooth fades come from the bulb firmware, which fades on every color change at its own fixed speed.
- The bulbs still keep their own connection to Tuya's cloud. Blocking their internet access at the router would cut it entirely, at the cost of the Smart Life app.

The router is Claro's ZTE F6600P, with one network name ("Don") for both bands. On 2026-10-03 its client list showed the Living Room and Guest Room bulbs at −76 to −81 dBm, against a noise floor near −92 dBm, which is too weak for cheap bulbs to stay connected reliably. The Corridor and Office bulbs were at −59 to −69 dBm. `sala-2-2` dropped at −70 dBm, but it has a different Wi-Fi chip (`lwip0`) and uses protocol 3.5, so its drops may be firmware. If drops become a problem, add an access point near the Living Room and Guest Room with the same network name and password, so the bulbs reconnect without re-pairing.

Before buying more bulbs or relying on a model, check that its box says Wi-Fi. Some Ekaza products use Zigbee or Bluetooth.

## Claude access

`ha-mcp` (image `ghcr.io/homeassistant-ai/ha-mcp:8.6.0`) lets Claude Code read and control Home Assistant through the Model Context Protocol. It runs as a second container in the same compose file and listens on port 8086 of the Pi.

- The container authenticates to Home Assistant with the long-lived token of a dedicated administrator user named `claude-mcp`, so the token can be revoked without affecting any other login.
- The token and the endpoint path live only in `/opt/homeassistant/.env` on the Pi, with mode 600. The compose file refuses to start without both values.
- The endpoint has no other authentication. The URL path is the credential, and its default (`/mcp`) is guessable, so `HA_MCP_SECRET_PATH` must be a long random value. Anyone on the LAN who knows the full URL has administrator control of Home Assistant.
- Read-only mode is off, so Claude can change entities, automations, dashboards, and helpers.

## Phases

- [x] Pi reachable over SSH with key login
- [x] USB controller working and external drive reformatted
- [x] Docker Engine and Compose installed
- [ ] Reserve `192.168.0.17` for the Pi in the router's DHCP settings
- [x] Copy the compose file to the Pi and start the container
- [x] Create the Home Assistant user through the web UI
- [x] Pair the bulbs in Smart Life and add the Tuya integration
- [x] Create the `claude-mcp` administrator user and its token, then start `ha-mcp`
- [x] Connect Claude Code to `ha-mcp`
- [x] Living Room party mode: `input_boolean.living_room_party`, `script.living_room_party_wave`, and two automations (start, 2-hour auto stop). The wave sends a 4.5° hue step every 100 ms to the tuya-local entities, about 8 updates per second and 36° per second. Fixture 1 (`sala-jantar-1-1`, `1-2`) sits at offsets 0° and 15°, and fixture 2 (`sala-2-2`, `sala-jantar-2-1`, `2-3`) at 60°, 75° and 90°
- [x] Move all 14 lights to tuya-local
- [x] Rename the cloud light entities to `light.<name>_cloud`, give the tuya-local entities the original IDs, hide tuya-local's scene, timer and do-not-disturb entities, and point the party script at the original IDs
- [x] Disable the official Tuya cloud integration (re-enable it under Settings, then Devices & Services, if tuya-local ever fails)
- [x] Samsung TV (QN55Q60D, `192.168.0.16`, MAC `c8:a6:ef:15:a9:21`) in party mode: `script.living_room_party_tv` wakes it with the Wake on LAN button (the Samsung integration's own turn_on does not wake it), casts the Groove Never Dies mix (`HR7y3f18Ug8`) through the TV's built-in Google Cast via `script.living_room_tv_cast_mix`, retries once, unmutes, and sets the volume to 20%. The first cast after YouTube was closed fails with a lounge `screen_ids` error that `continue_on_error` cannot catch, so the cast runs in its own script started with `script.turn_on`. Stopping closes the cast app with `media_player.turn_off`, because `media_stop` only pauses YouTube
- [ ] Run the full party from a TV in standby once, to prove the wake, failed first cast and retry happen in one run
- [ ] Mount the `storage` drive and schedule backups to it
- [ ] Boot the Pi without the desktop and close port 111 (`rpcbind`)

## Deploy

```bash
ssh samsepiol@192.168.0.17 'sudo mkdir -p /opt/homeassistant/config && sudo chown -R samsepiol:samsepiol /opt/homeassistant'
scp home-assistant/docker-compose.yml samsepiol@192.168.0.17:/opt/homeassistant/docker-compose.yml
ssh samsepiol@192.168.0.17 'cd /opt/homeassistant && docker compose up -d'
```

Open `http://192.168.0.17:8123` and create the first user.

## Upgrade

Change the image tag in `docker-compose.yml`, copy the file to the Pi, and run `docker compose pull && docker compose up -d` in `/opt/homeassistant`. Read the release notes for breaking changes first.
