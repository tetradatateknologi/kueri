# kueri

Monorepo for **kueri**, a modern database workspace: a **Go (Echo) REST API** (`kueri-api`) and a **Vite + React** web app (`kueri-web`).

---

## Repository layout

| Path | Role |
|------|------|
| [`api/`](api/) | Go API, SQL migrations, `sqlc` queries, package docs |
| [`web/`](web/) | Vite + React frontend (not Next.js) |
| [`docker-compose.yml`](docker-compose.yml) | Local Postgres + Redis |
| [`docs/`](docs/) | Monorepo documentation |
| [`scripts/`](scripts/) | Helper scripts |

Per-package quick starts: [api/README.md](api/README.md), [web/README.md](web/README.md).

---

## Tech stack

| Area | Stack |
|------|--------|
| **API** | Go 1.22+, Echo, `godotenv`, structured logging (`slog`) |
| **Web** | Vite 7, React 19, Tailwind CSS 4, TanStack Query, Radix UI |

---

## Prerequisites

- **Go** 1.22+
- **Node.js** 22+ (for `web/`)
- **Docker** (optional, for Postgres/Redis via Compose)

---

## Quick start

```bash
# Infrastructure (optional)
make docker-up

# API + database
cp api/.env.example api/.env
cd api && make migrate-up && make sqlc && cd ..
make dev-api

# Web (separate terminal)
cd web && cp .env.example .env && npm install && npm run dev
```

Or run both:

```bash
npm install          # root: concurrently
cd web && npm install
npm run dev
```

| Service | URL |
|---------|-----|
| API | http://localhost:8080 |
| Web | http://localhost:5173 |

---

## Project tree (aligned with `one`)

```
kueri/
├── api/                 # Go backend (same layout as one/api)
│   ├── cmd/
│   ├── db/
│   ├── docs/
│   ├── internal/
│   ├── scripts/
│   ├── Dockerfile
│   ├── Makefile
│   ├── README.md
│   ├── sqlc.yaml
│   └── VERSION
├── web/                 # Vite frontend (one/web uses Next.js)
│   ├── public/
│   ├── src/
│   ├── Dockerfile
│   ├── README.md
│   └── VERSION
├── docs/
├── scripts/
├── docker-compose.yml
├── Makefile
└── README.md
```

`one` also includes `notif/`, `garage/`, and `extension/` — add those when kueri needs them.
