"""yt-remote: keeps a persistent YouTube lounge connection to the TV's YouTube app.

Playing through the lounge plays in the TV app's signed-in profile (YouTube Premium, no ads).
A one-shot lounge command makes the TV stutter once the sender disappears, so this service
stays subscribed for as long as the app runs.
"""

import asyncio
import json
import logging
import os
import re
from pathlib import Path
from typing import Optional

import aiohttp
from aiohttp import web
from pyytlounge import (
    DisconnectedEvent,
    EventListener,
    NowPlayingEvent,
    PlaybackStateEvent,
    YtLoungeApi,
)

SCREEN_ID = os.environ["SCREEN_ID"]
TV_HOST = os.environ.get("TV_HOST", "192.168.0.16")
DEVICE_NAME = os.environ.get("DEVICE_NAME", "Home Assistant")
AUTH_FILE = Path(os.environ.get("AUTH_FILE", "/data/auth.json"))
PORT = int(os.environ.get("PORT", "8091"))
DIAL_URL = f"http://{TV_HOST}:8080/ws/apps/YouTube"
DIAL_HEADERS = {"Origin": "package:com.google.android.youtube"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("yt-remote")


class Listener(EventListener):
    def __init__(self) -> None:
        self.video_id: Optional[str] = None
        self.state: Optional[str] = None
        self.position: Optional[float] = None
        self.duration: Optional[float] = None

    async def now_playing_changed(self, event: NowPlayingEvent) -> None:
        self.video_id = event.video_id
        self.state = str(event.state)
        self.position = event.current_time
        self.duration = event.duration

    async def playback_state_changed(self, event: PlaybackStateEvent) -> None:
        self.state = str(event.state)
        self.position = event.current_time
        self.duration = event.duration

    async def disconnected(self, event: DisconnectedEvent) -> None:
        log.info("screen disconnected: %s", event.reason)
        self.video_id = None
        self.state = None


class Remote:
    def __init__(self) -> None:
        self.listener = Listener()
        self.api = YtLoungeApi(DEVICE_NAME, self.listener, log)
        self.connected = asyncio.Event()
        self.lock = asyncio.Lock()

    async def ensure_paired(self) -> None:
        if AUTH_FILE.exists() and not self.api.paired():
            self.api.load_auth_state(json.loads(AUTH_FILE.read_text()))
        if not self.api.paired():
            if not await self.api.pair_with_screen_id(SCREEN_ID, "YouTube on TV"):
                raise RuntimeError("pairing with the screen ID failed")
            log.info("paired with screen %s", SCREEN_ID[:8])
        else:
            await self.api.refresh_auth()
        AUTH_FILE.parent.mkdir(parents=True, exist_ok=True)
        AUTH_FILE.write_text(json.dumps(self.api.auth.serialize()))

    async def keep_connected(self) -> None:
        """Connect whenever the TV app is available and stay subscribed until it goes away."""
        while True:
            try:
                await self.ensure_paired()
                if await self.api.is_available() and await self.api.connect():
                    log.info("connected to %s (%s)", self.api.screen_name, self.api.screen_device_name)
                    self.connected.set()
                    await self.api.subscribe()
                    log.info("subscription ended")
            except Exception as exc:  # keep the loop alive across network and auth errors
                log.warning("connection loop error: %r", exc)
            self.connected.clear()
            await asyncio.sleep(5)

    async def open_app(self, session: aiohttp.ClientSession) -> int:
        async with session.post(DIAL_URL, headers={**DIAL_HEADERS, "Content-Type": "text/plain; charset=utf-8"},
                                data="theme=cl") as resp:
            return resp.status

    async def close_app(self, session: aiohttp.ClientSession) -> int:
        async with session.delete(f"{DIAL_URL}/run", headers=DIAL_HEADERS) as resp:
            return resp.status

    async def app_running(self, session: aiohttp.ClientSession) -> bool:
        async with session.get(DIAL_URL) as resp:
            return "<state>running</state>" in await resp.text()

    async def drop_connection(self) -> None:
        self.connected.clear()
        try:
            await self.api.disconnect()
        except Exception as exc:  # the TV may already have dropped it
            log.info("disconnect: %r", exc)

    async def play(self, video_id: str, list_id: Optional[str] = None) -> dict:
        async with self.lock:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                if not await self.app_running(session):
                    await self.drop_connection()
                    status = await self.open_app(session)
                    log.info("opened YouTube on the TV: HTTP %s", status)
            try:
                await asyncio.wait_for(self.connected.wait(), timeout=45)
            except asyncio.TimeoutError:
                return {"ok": False, "error": "TV YouTube app did not become reachable within 45s"}
            await asyncio.sleep(3)
            if list_id:
                # pyytlounge's play_video sends setPlaylist with a videoId only; the lounge command also takes a listId.
                ok = await self.api._command("setPlaylist", {"videoId": video_id, "listId": list_id, "currentIndex": "0"})
            else:
                ok = await self.api.play_video(video_id)
            log.info("play %s (list %s): %s", video_id, list_id, ok)
            return {"ok": bool(ok)}

    async def stop(self) -> dict:
        async with self.lock:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                status = await self.close_app(session)
            await self.drop_connection()
            return {"ok": status == 200, "dial_status": status}


remote = Remote()

VIDEO_ID = re.compile(r"(?:v=|youtu\.be/|/shorts/|/live/|/embed/)([A-Za-z0-9_-]{11})")
LIST_ID = re.compile(r"[?&]list=([A-Za-z0-9_-]+)")


def parse_video(value: str) -> tuple[Optional[str], Optional[str]]:
    """Return (video ID, playlist ID) from a bare video ID or any common YouTube URL."""
    value = value.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
        return value, None
    video = VIDEO_ID.search(value)
    playlist = LIST_ID.search(value)
    if not video and not playlist:
        raise ValueError(f"no YouTube video or playlist ID in {value!r}")
    return (video.group(1) if video else None), (playlist.group(1) if playlist else None)


async def first_video_of(list_id: str) -> str:
    """The TV's setPlaylist needs a starting video; read the first one from the playlist page."""
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15)) as session:
        async with session.get(f"https://www.youtube.com/playlist?list={list_id}",
                               headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "en"}) as resp:
            page = await resp.text()
    match = re.search(r'"videoId":"([A-Za-z0-9_-]{11})"', page)
    if not match:
        raise ValueError(f"could not find a video in playlist {list_id}")
    return match.group(1)


async def handle_play(request: web.Request) -> web.Response:
    body = await request.json()
    try:
        video_id, list_id = parse_video(body.get("video") or body["video_id"])
        if list_id and not video_id:
            video_id = await first_video_of(list_id)
    except (KeyError, ValueError) as exc:
        return web.json_response({"ok": False, "error": str(exc)}, status=400)
    return web.json_response({**await remote.play(video_id, list_id), "video_id": video_id, "list_id": list_id})


async def handle_stop(request: web.Request) -> web.Response:
    return web.json_response(await remote.stop())


async def handle_pause(request: web.Request) -> web.Response:
    return web.json_response({"ok": bool(await remote.api.pause())})


async def handle_status(request: web.Request) -> web.Response:
    l = remote.listener
    return web.json_response({
        "paired": remote.api.paired(),
        "connected": remote.connected.is_set(),
        "video_id": l.video_id,
        "state": l.state,
        "position": l.position,
        "duration": l.duration,
    })


async def start_background(app: web.Application) -> None:
    await remote.api.__aenter__()
    app["loop_task"] = asyncio.create_task(remote.keep_connected())


def main() -> None:
    app = web.Application()
    app.add_routes([web.post("/play", handle_play), web.post("/stop", handle_stop), web.post("/pause", handle_pause), web.get("/status", handle_status)])
    app.on_startup.append(start_background)
    web.run_app(app, host="0.0.0.0", port=PORT, access_log=None)


if __name__ == "__main__":
    main()
