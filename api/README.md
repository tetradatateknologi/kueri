# kueri-api

Go REST API (Echo) for kueri. SQL migrations live under `db/migrations/` when you add a database.

## Prerequisites

- Go 1.22+ (see `go.mod`)
- Docker Compose (optional, for local Postgres/Redis via repo root)

## Quick start

From this directory:

```bash
cp .env.example .env
make docker-up    # from repo root, or use your own Postgres
make migrate-up
make sqlc
make run
```

The API listens on `APP_PORT` (default **8080**). Full stack setup: [../README.md](../README.md).

Database layout: [db/README.md](db/README.md).

## Endpoints (starter)

| Method | Path | Response |
|--------|------|----------|
| GET | `/health` | `{"status":"ok"}` |
| GET | `/ping` | `{"message":"pong"}` |

## Makefile targets

| Target | Description |
|--------|-------------|
| `make run` | Run API (`go run ./cmd/api`) |
| `make build` | Build `bin/api` |
| `make test` | Run tests |
| `make migrate-up` | Apply migrations (requires `migrate` CLI + DB) |
| `make migrate-down` | Roll back one migration |
| `make migrate-create` | Create new migration pair under `db/migrations/` |
| `make sqlc` | Generate Go code into `db/sqlc/` |
| `make seed` | Insert dev workspace data |
| `make docker-up` | Start Postgres/Redis from repo root Compose |
