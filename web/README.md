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

### Query execution

- **Run Query** calls `POST /query` with `{ sql, env }` (stub; ~300–800ms delay, mock rows).
- SQL containing `error` or `invalid` returns `400` with `error.code: QUERY_ERROR`.
- Scripts/workspaces load from `GET /api/v1/*` when the API and database are running.

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘↵ / Ctrl+Enter | Run query |
| ⌘E / Ctrl+E | Toggle environment |
| Escape | Close env menu |

Set `VITE_API_BASE_URL` when calling the API without the proxy.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Vitest unit tests |
