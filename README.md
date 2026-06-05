# Kueri

A modern, open-source database workspace for exploring schemas, running queries, and organizing scripts across environments.

Kueri ships as a **desktop app** (single binary with embedded PostgreSQL and UI) and as a **developer monorepo** (Go API + React web app) for contributors.

---

## Features

- **Query workspace** — write and run SQL with environment-aware connections (development, staging, production)
- **Schema explorer** — browse tables and columns from connected databases
- **Saved scripts & tags** — organize queries and favorites in workspaces
- **Offline desktop mode** — self-contained binary with embedded PostgreSQL and auto-migrations
- **Backup & restore** — export and import workspace data as JSON
- **Auto-updates** — release manifest on GitHub with in-app and CLI update support

---

## Install

The fastest way to get started on **macOS** or **Linux** — no Go, Node.js, or build tools required:

```bash
curl -fsSL https://raw.githubusercontent.com/tetradatateknologi/kueri/main/scripts/install.sh | bash
```

Then launch Kueri:

```bash
kueri
```

The app opens in your browser at `http://127.0.0.1:8765`.

### Safer install (review script first)

```bash
curl -fsSL https://raw.githubusercontent.com/tetradatateknologi/kueri/main/scripts/install.sh -o install.sh
less install.sh
bash install.sh
```

Binaries are downloaded from [GitHub Releases](https://github.com/tetradatateknologi/kueri/releases) and verified with **SHA256** before installation. The install script itself is served from the `main` branch.

### Supported platforms

| Platform | Install support |
|----------|-----------------|
| macOS Intel (x86_64) | `install.sh` |
| macOS Apple Silicon (M1+) | `install.sh` |
| Linux x86_64 | `install.sh` |
| Windows amd64 | [Manual download](https://github.com/tetradatateknologi/kueri/releases) |

### Update

```bash
kueri update
```

Or re-run the install command above.

### Uninstall

```bash
rm -f ~/.kueri/bin/kueri
sudo rm -f /usr/local/bin/kueri
rm -rf ~/.kueri   # optional: removes local data
```

See [docs/desktop.md](docs/desktop.md) for install flags, PATH setup, macOS Gatekeeper notes, and full desktop documentation.

---

## Development

For contributors working on the API or web UI locally.

### Prerequisites

- **Go** 1.22+
- **Node.js** 22+
- **Docker** (optional — local Postgres/Redis via Compose)

### Quick start

```bash
# Optional infrastructure
make docker-up

# API
cp api/.env.example api/.env
cd api && make migrate-up && make sqlc && cd ..
make dev-api

# Web (separate terminal)
cd web && cp .env.example .env && npm install && npm run dev
```

Or run API and web together:

```bash
npm install
cd web && npm install && cd ..
npm run dev
```

| Service | URL |
|---------|-----|
| API | http://localhost:8080 |
| Web | http://localhost:5173 |

### Desktop build (from source)

```bash
make desktop-build
./api/bin/kueri-desktop
```

### Keyboard shortcuts (web)

| Shortcut | Action |
|----------|--------|
| ⌘↵ / Ctrl+Enter | Run query |
| ⌘E / Ctrl+E | Toggle environment menu |
| Escape | Close environment menu |

---

## Project structure

```
kueri/
├── api/                  # Go REST API and desktop binary
│   ├── cmd/              # api and desktop entrypoints
│   ├── db/               # migrations and sqlc queries
│   └── internal/         # application packages
├── web/                  # Vite + React frontend
├── docs/                 # project documentation
├── scripts/              # install, release, and build scripts
├── docker-compose.yml    # local Postgres + Redis
└── Makefile
```

| Path | Description |
|------|-------------|
| [api/README.md](api/README.md) | API setup and endpoints |
| [web/README.md](web/README.md) | Frontend setup |
| [docs/desktop.md](docs/desktop.md) | Desktop install, update, and release |
| [api/db/README.md](api/db/README.md) | Database migrations and seeding |

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **API** | Go, Echo, sqlc, golang-migrate, structured logging (`slog`) |
| **Web** | Vite, React, Tailwind CSS, TanStack Query, Radix UI |
| **Desktop** | Embedded PostgreSQL 16, single Go binary, GitHub Releases |

---

## Releases

Desktop binaries are published on [GitHub Releases](https://github.com/tetradatateknologi/kueri/releases).

Maintainers: see [docs/desktop.md](docs/desktop.md#release-flow-maintainers) for the release workflow.

---

## Contributing

1. Fork the repository and create a feature branch from `main`
2. Make your changes and ensure tests pass (`cd api && go test ./...`, `cd web && npm run test`)
3. Open a pull request with a clear description of the change

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/tetradatateknologi/kueri/issues).

---

## Links

- [Desktop documentation](docs/desktop.md)
- [Latest release](https://github.com/tetradatateknologi/kueri/releases/latest)
- [Install script](scripts/install.sh)
