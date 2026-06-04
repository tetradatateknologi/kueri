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

Dev server proxies `/health` and `/ping` to the API. Set `VITE_API_BASE_URL` when calling the API without the proxy.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
