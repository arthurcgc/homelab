# Quartz

Web-based knowledge base that renders `~/notes/` as a searchable site with a graph view.

## What it does

Takes the markdown notes from `~/notes/` (synced to phone + tablet via Syncthing, viewed in Obsidian) and generates an interactive website with:

- **Graph view** — visual map of notes and their tag connections
- **Full-text search** — find anything across all notes
- **Tag pages** — auto-generated pages grouping notes by tag
- **Dark mode** — themed to match the rest of the setup

## Use case

Obsidian is great for writing and reading notes on each device. Quartz adds a bird's-eye view — see how notes connect, browse by tag, search across everything from any browser. Useful for spotting patterns and finding old notes.

## Setup

```bash
docker compose up -d
# Open http://localhost:8082
```

No config needed. Notes just need `tags: [...]` in YAML frontmatter. Quartz hot-reloads when notes change.

## Note format

```markdown
---
tags: [kubernetes, networking, cilium]
---

# Your Title Here

Content...
```

That's it. No special fields required.

## Port

8082
