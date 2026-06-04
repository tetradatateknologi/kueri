-- name: CreateConnection :one
INSERT INTO connections (
    workspace_id,
    name,
    environment,
    driver,
    host,
    port,
    database_name,
    username,
    password_encrypted,
    ssl_mode
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
)
RETURNING *;

-- name: GetConnectionByID :one
SELECT *
FROM connections
WHERE id = $1
  AND deleted_at IS NULL;

-- name: GetConnectionForUser :one
SELECT c.*
FROM connections c
INNER JOIN workspaces w ON w.id = c.workspace_id
WHERE c.id = $1
  AND w.user_id = $2
  AND c.deleted_at IS NULL
  AND w.deleted_at IS NULL;

-- name: ListConnectionsByWorkspace :many
SELECT *
FROM connections
WHERE workspace_id = $1
  AND deleted_at IS NULL
ORDER BY environment, name;

-- name: UpdateConnection :one
UPDATE connections
SET
    name = $2,
    environment = $3,
    driver = $4,
    host = $5,
    port = $6,
    database_name = $7,
    username = $8,
    password_encrypted = COALESCE($9, password_encrypted),
    ssl_mode = $10,
    updated_at = NOW()
WHERE id = $1
  AND workspace_id = $11
  AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteConnection :exec
UPDATE connections
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL;
