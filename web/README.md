# kueri-web

Vite + React frontend for kueri (not Next.js).

## Prerequisites

- Node.js 22+ recommended
- Running API on port **8080** (see [`../api/README.md`](../api/README.md))

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

App: **http://localhost:5173**

Dev server proxies `/api`, `/health`, `/ping`, and `/query` to the API.

### Shareable URL state

The app syncs key UI state to query parameters so you can bookmark or share links:

| Parameter | Example | Effect |
|-----------|---------|--------|
| `project` | `?project=one.tetradata.id` | Sidebar filter: show only that workspace (name or numeric id) |
| `script` | `?script=42` | Open script tab by id |
| `connection` | `?connection=7` | Select database connection by id |
| `view` | `?view=settings` | Open Settings instead of the editor |
| `section` | `?section=shortcuts` | Settings section (with `view=settings`) |

Examples:

- `http://localhost:5173?project=pids.asdp.id`
- `http://localhost:5173?project=one.tetradata.id&script=12&connection=3`
- `http://localhost:5173?view=settings&section=backup`

Changing the project filter, active script, connection, or settings navigation updates the URL automatically (browser back/forward is supported).

### Query execution

- **Run Query** calls `POST /query` with `{ sql, env }` (stub; ~300–800ms delay, mock rows).
- SQL containing `error` or `invalid` returns `400` with `error.code: QUERY_ERROR`.
- Scripts/workspaces load from `GET /api/v1/*` when the API and database are running.

### Keyboard shortcuts

Press `?` in the workspace or open **Settings** in the sidebar for the full guide and shortcut list. Common shortcuts:

| Shortcut | Action |
|----------|--------|
| ⌘↵ / Ctrl+Enter | Run query |
| ⌘S / Ctrl+S | Save script |
| F2 | Rename active script |
| ⌘E / Ctrl+E (in SQL editor) | Edit script name & tags |
| ⌘⇧S / Ctrl+Shift+S | Edit script name & tags (anywhere in workspace) |
| ⌘⇧B / Ctrl+Shift+B | Toggle favorite on active script |
| ⌘N / Ctrl+N | New script tab |
| ⌘W / Ctrl+W | Close active tab |
| ⌘H / Ctrl+H | Query history |
| ⌘E / Ctrl+E (outside editor) | Cycle database connection |
| ⌘B / Ctrl+B | Toggle sidebar |
| ⌘1–9 / Ctrl+1–9 | Switch to tab N |
| ⌘/ / Ctrl+/ | Toggle SQL line comment (in editor) |

Set `VITE_API_BASE_URL` when calling the API without the proxy.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Vitest unit tests |
