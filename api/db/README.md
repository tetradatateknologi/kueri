# Database layout

Aligned with [`one/api/db`](../../reference/one/api/db).

| Path | Purpose |
|------|---------|
| [`migrations/`](migrations/) | Versioned SQL migrations ([golang-migrate](https://github.com/golang-migrate/migrate)) |
| [`queries/`](queries/) | Hand-written SQL for [sqlc](https://sqlc.dev/) |
| [`sqlc/`](sqlc/) | Generated Go code (`make sqlc`) — do not edit by hand |

## Initial schema (migrations)

| # | Migration | Tables |
|---|-----------|--------|
| 000001 | `create_users` | `users` |
| 000002 | `create_workspaces` | `workspaces` |
| 000003 | `create_connections` | `connections` (+ enums) |
| 000004 | `create_saved_scripts` | `saved_scripts`, `script_tags`, `saved_script_tags` |

## Dev seed

```bash
make seed
```

Creates a demo user, workspace, connections, and sample script (see [`scripts/seed.go`](../scripts/seed.go)).

## Apply migrations

From `api/` (with Postgres running, e.g. `make docker-up` from repo root):

```bash
cp .env.example .env
make migrate-up
make sqlc
```

`DATABASE_URL` or `DB_*` variables in `.env` are used by the Makefile (see [`Makefile`](../Makefile)).

## Create a new migration

```bash
make migrate-create
# Enter migration name when prompted, e.g. add_query_history
```

This creates paired `NNNNNN_name.up.sql` and `NNNNNN_name.down.sql` files under `migrations/`.
