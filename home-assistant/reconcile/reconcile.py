"""Point every tuya-local bulb at its current IP.

Runs inside the homeassistant container (it has tinytuya and reaches the API on 127.0.0.1:8123).
Listens for Tuya UDP broadcasts, maps device ID to IP, and updates any tuya-local entry whose
host no longer matches through the entry's options flow, which reloads it.
"""

import json
import os
import urllib.error
import urllib.request

import tinytuya

API = "http://127.0.0.1:8123/api"
TOKEN = os.environ["T"]


def api(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(f"{API}{path}", method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def main() -> None:
    found = tinytuya.deviceScan(verbose=False, maxretry=20, color=False, poll=False)
    ip_of = {(d.get("gwId") or d.get("id")): ip for ip, d in found.items()}

    with open("/config/.storage/core.config_entries") as f:
        entries = [e for e in json.load(f)["data"]["entries"] if e["domain"] == "tuya_local"]

    for e in entries:
        cfg = {**e["data"], **e["options"]}
        new_ip = ip_of.get(cfg["device_id"])
        if not new_ip:
            print(f"{e['title']}: not seen on the network, left at {cfg['host']}")
            continue
        if new_ip == cfg["host"]:
            continue
        flow = api("POST", "/config/config_entries/options/flow", {"handler": e["entry_id"]})
        try:
            result = api("POST", f"/config/config_entries/options/flow/{flow['flow_id']}", {
            "host": new_ip,
            "local_key": cfg["local_key"],
            "protocol_version": str(cfg["protocol_version"]),
            "poll_only": cfg.get("poll_only", False),
            })
        except urllib.error.HTTPError as err:
            print(f"{e['title']}: update to {new_ip} rejected: {err.read().decode()[:200]}")
            api("DELETE", f"/config/config_entries/options/flow/{flow['flow_id']}")
            continue
        # An entry stuck in setup_retry keeps its back-off timer after an options change; reload it now.
        api("POST", f"/config/config_entries/entry/{e['entry_id']}/reload")
        print(f"{e['title']}: {cfg['host']} -> {new_ip} ({result.get('type')}, reloaded)")


if __name__ == "__main__":
    main()
