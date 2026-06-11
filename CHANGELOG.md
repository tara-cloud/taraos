# Changelog

All notable changes to TaraOS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] — 2026-06-11

### Added in 1.2.0

- **Server-side settings** — all settings stored in `/data/settings.json`, shared across devices via `GET/POST /api/settings`
- **PersistentVolumeClaim** in Helm chart so settings survive pod restarts
- `DATA_PATH` env var wired into deployment

### Changed in 1.2.0

- All widgets load from server API instead of `localStorage`
- `localStorage` used only as write-through cache for instant local reads
- Calendar events remain device-local (personal notes, not shared)
- Helm: added cpu limits, PVC volume mount

---

## [1.1.0] — 2026-06-11

### Added in 1.1.0

- **Clock settings** — 12/24-hour format, font family (System, Monospace, Serif, Rounded), font size slider (32–96px)
- **Date format options** — Full, No year, Short, Numeric, ISO, Day only
- **Settings sidebar** — iOS-style two-column layout with Display, Clock, and Location sections
- **Multi-location weather** — add/remove custom locations, switch between them on the dashboard with arrow buttons and dot indicators
- **Background image** — paste any image URL as the dashboard background
- **PWA support** — installable, offline shell caching via service worker

### Changed in 1.1.0

- App launcher redesigned as bare icon grid (no panel), with `⌘K` search overlay
- Settings page restructured into grouped sidebar navigation
- Panels made more transparent (glass effect reduced opacity)
- Top bar stripped to minimal glass strip (no title/IP)
- Weather moved to right column, stacked above System widget

### Fixed in 1.1.0

- Duplicate React key error for Midnight theme color dots
- k3s NodePort accessibility fixed via `hostPort` binding

---

## [1.0.0] — 2026-06-10

### Added in 1.0.0

- Initial release — Next.js 15 dashboard deployed on Raspberry Pi 5 via k3s
- Clock widget with time, date, and mini calendar
- Calendar event viewer — add/delete events per day, stored in localStorage
- Weather widget via Open-Meteo API (no API key needed)
- App launcher with Docker container status dots
- File manager for `/DATA/AppData`
- System stats widget — CPU/RAM/disk/temperature with ring gauges
- Disk and network info widgets
- Settings page — theme, background, weather location
- Helm chart for k3s deployment (NodePort 30303)
- Docker image for ARM64 (`pmananthu/taraos`)
