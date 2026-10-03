# Home Assistant

Home Assistant runs on the Raspberry Pi `pi-faye` (reachable as `pi-faye.local`, Wi-Fi only) and controls the house lights and the living room TV. All 14 lights are Tuya Wi-Fi bulbs controlled over the LAN through tuya-local, with no cloud in the path. `PLAN.md` holds the setup history, the decisions behind it and the open checklist.

| What | Where |
|------|-------|
| Web UI | `http://pi-faye.local:8123` |
| Casa floor-plan panel | `http://pi-faye.local:8123/casa` |
| Compose file (Home Assistant and ha-mcp) | `docker-compose.yml`, deployed to `/opt/homeassistant/` on the Pi |
| Home Assistant config | `/opt/homeassistant/config` on the Pi (not in this repo) |
| Claude access | ha-mcp on `http://pi-faye.local:8086/<secret path>` (see `PLAN.md`) |

## Casa panel

Casa is the house's own control page: a high-contrast floor plan of the house where every light sits in its room. It is a custom Home Assistant panel, so it lives at its own address, uses the normal Home Assistant login, and needs no token of its own. It is meant to grow: each new Home Assistant feature in the house gets its control on this plan.

What it does today:

- Tap a light to toggle it. A light that is on glows in its real color and brightness, so party mode shows up on the plan.
- Tap a room to switch all of its lights off if any are on, or on if all are off.
- The **Party mode** button starts and stops the living room party (light wave and the YouTube mix on the TV).
- **All lights off** switches off every light in the house.
- The TV box shows whether the TV is on and which app is casting, and tapping it opens the TV controls.
- An unreachable bulb has a dashed red outline, which usually means its wall switch is off.

### Files

| File | Role |
|------|------|
| `panel/casa-panel.js` | The whole panel: floor plan geometry, styling and behavior, in one web component |
| `/opt/homeassistant/config/www/casa/casa-panel.js` | The deployed copy, served by Home Assistant at `/local/casa/casa-panel.js` |
| `/opt/homeassistant/config/configuration.yaml` | Registers the panel under `panel_custom` |

The registration in `configuration.yaml`:

```yaml
panel_custom:
  - name: casa-panel
    url_path: casa
    sidebar_title: Casa
    sidebar_icon: mdi:floor-plan
    module_url: /local/casa/casa-panel.js?v=1
```

### Deploying a change

```bash
scp home-assistant/panel/casa-panel.js samsepiol@pi-faye.local:/opt/homeassistant/config/www/casa/casa-panel.js
```

Browsers cache files under `/local/` for 31 days. After changing the panel, raise the `?v=` number in `module_url`, then restart Home Assistant so every browser loads the new file:

```bash
ssh samsepiol@pi-faye.local 'sudo sed -i "s/casa-panel.js?v=[0-9]*/casa-panel.js?v=2/" /opt/homeassistant/config/configuration.yaml && docker restart homeassistant'
```

### Extending it

The plan is drawn on a 2000 by 1117 grid that matches the original hand-drawn floor plan. The constants at the top of `casa-panel.js` describe the house:

- `ROOMS`: the room rectangles, names and outline colors.
- `FIXTURES`: the dashed ellipses for multi-bulb fixtures in the living room.
- `LIGHTS`: one entry per bulb, with its entity, room, position and an optional short label.
- `TV` and `PARTY`: the TV entities and the party toggle.

To add a feature, add its entity next to the others, draw it in `_build()`, and refresh it from Home Assistant state in `_update()`. Every state change in Home Assistant calls `_update()`, and actions go through `this._hass.callService(domain, service, data)`.

## Party mode

Party mode is `input_boolean.living_room_party`. It always starts off after a Home Assistant restart.

- `script.living_room_party_wave` rolls a color wave across the living room bulbs.
- `script.living_room_party_tv` wakes the TV with Wake on LAN, casts the YouTube mix and sets the volume to 55%, tuned for the JBL Xtreme 2 speaker connected to the TV over Bluetooth.
- Turning the toggle off restores the lights and closes YouTube on the TV. The restore takes about 3 seconds; switching the party back on during it queues the new wave, which starts as soon as the restore ends.
- An automation turns the party off after 2 hours.

`PLAN.md` explains how each part was tuned.
