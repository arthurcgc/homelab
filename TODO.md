# Homelab TODO

## Fix YouTube videos widget in Glance

**Status:** Broken on both pichau and mac  
**Widget:** `videos` in `glance/config/home.yml`

### What's broken

YouTube's RSS feed endpoints (`/feeds/videos.xml`) return 404 for all request formats:
- `?channel_id=UC...` → 404
- `?playlist_id=UU...` → 404  
- `?playlist_id=UULF...` → 404 (what Glance v0.8.4 uses by default)

This appears to be a YouTube-side change after ~mid-2025. Glance issue [#910](https://github.com/glanceapp/glance/issues/910) tracks it.

Workaround attempted: `include-shorts: true` makes Glance use `channel_id=UC...` format, but YouTube still returns 404. Reverted to `include-shorts: true` anyway (no harm, cleaner URL).

Public Invidious instances tried — all rate-limited or blocked within minutes.

### Fix options

**Option A — YouTube Data API v3 key (recommended)**
- Go to Google Cloud Console → create project → enable YouTube Data API v3 → create API key
- Glance supports it natively, keeps the visual `videos` widget with thumbnails
- Free tier: 10,000 units/day (more than enough)
- Add key to `glance/.env` as `YOUTUBE_API_KEY` and update `home.yml` accordingly
- Check Glance docs for the exact config key name

**Option B — Self-hosted RSSHub**
- Add RSSHub as a service to the Docker stack (both `mac/` and root compose)
- RSS feed URL format: `http://rsshub:1200/youtube/channel/CHANNEL_ID`
- Switch `videos` widget to `rss` widget (loses thumbnails)
- Heavier but no API key needed

### Channels to restore

```yaml
- UCR-DXc1voovS8nhAvccRZhg # Jeff Geerling
- UCsBjURrPoezykLs9EqgamOA # Fireship
- UCZgt6AzoyjslHTC9dz0UoTw # eBPF Summit / Isovalent
- UCrber_mFvp_FEF7D9u8PDEA # Rawkode Academy (K8s/DevOps)
- UC9x0AN7BWHpCDHSm9NiJFJQ # NetworkChuck
```
