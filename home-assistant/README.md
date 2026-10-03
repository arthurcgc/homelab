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
- `script.living_room_party_tv` wakes the TV with Wake on LAN, plays a random video from the **Party Videos** to-do list through `yt-remote` (below) in the TV's signed-in Premium profile, and sets the volume to 55%, tuned for the JBL Xtreme 2 speaker connected to the TV over Bluetooth.
- Turning the toggle off leaves the TV alone, so YouTube keeps playing, and restores the lights: each bulb goes back on or off as it was before the party, and the ones that are on return to the default warm yellow (2700 K, full brightness), even if the snapshot was taken while they still had party colors. The restore takes about 3 seconds; switching the party back on during it queues the new wave, which starts as soon as the restore ends.
- An automation turns the party off after 2 hours.
- **The video list** is the local to-do list **Party Videos** (`todo.party_videos`), so it can be edited from Home Assistant's To-do page on any device. Each item's title is a YouTube video or playlist URL, and its description can hold the name. Every party plays one open item at random; ticking an item off takes it out of rotation without deleting it. With no open items, party mode plays the Groove Never Dies mix (`HR7y3f18Ug8`).
- The wave keeps going when a bulb drops off Wi-Fi, because each bulb command skips errors. If the wave stops for any other reason while the party is on (an error, or a script reload, which aborts running scripts), the wave watchdog automation restarts it after 5 seconds in resume mode. Resume mode keeps the original snapshot, so stopping the party still restores the lights from before it.

`PLAN.md` explains how each part was tuned.

## yt-remote

`yt-remote` (`yt-remote/`) plays YouTube videos on the TV without ads. It runs as a third container in `docker-compose.yml` and listens only on the Pi itself, at `http://127.0.0.1:8091`.

Casting from Home Assistant always plays as an anonymous viewer, so YouTube Premium does not apply and ads play. `yt-remote` instead controls the TV's own YouTube app, which is signed in to the Premium account, through YouTube's lounge API (the protocol phones use after "Link with TV code"), using the `pyytlounge` library. It stays connected to the app for as long as the app runs, because a remote that sends one command and disconnects leaves the app stuttering.

| Endpoint | What it does |
|----------|--------------|
| `POST /play` with `{"video": "..."}` | Opens YouTube on the TV in the Premium profile if it is not running, waits for it, and plays the video. `video` is a YouTube URL (`youtu.be`, `watch?v=`, Shorts, live, or a playlist link with `list=`) or a bare video ID. A playlist plays in order from its first video, which the service reads from the playlist page when the link names no video |
| `POST /stop` | Closes YouTube on the TV |
| `POST /pause` | Pauses playback |
| `GET /status` | Pairing, connection, and what is playing |

Home Assistant calls it through `rest_command.yt_remote_play`, `rest_command.yt_remote_pause` and `rest_command.yt_remote_stop` in `configuration.yaml`. Party mode only uses `yt_remote_play`; the other two are available for manual use.

How it reaches the TV:

- **Opening the app** uses the TV's DIAL endpoint, `POST http://192.168.0.16:8080/ws/apps/YouTube` with the header `Origin: package:com.google.android.youtube`. Without that header the TV answers 403. The app ignores any video ID passed this way, which is why playback goes through the lounge.
- **Pairing** uses the TV app's permanent lounge screen ID, `YT_SCREEN_ID` in `/opt/homeassistant/.env`. It was obtained once by starting the app over DIAL with a `pairingCode` and asking YouTube's `get_screen` endpoint for that code. The login it derives is kept in the `yt-remote-data` volume.
- **Volume and mute go through Google Cast.** The Samsung integration sets volume over UPnP, which the TV rejects while its audio goes to the Bluetooth speaker, and its unmute presses the remote's mute key, which toggles. Cast sets both directly and works without starting a Cast copy of YouTube.
- **Only one player may run.** A Google Cast copy of YouTube left running in the background answers the same lounge session and makes both players stutter and jump. The party script closes it (`media_player.turn_off` on the Cast entity) before playing.

Deploy a change:

```bash
scp -r home-assistant/yt-remote samsepiol@pi-faye.local:/opt/homeassistant/
ssh samsepiol@pi-faye.local 'cd /opt/homeassistant && docker compose up -d --build yt-remote'
```
