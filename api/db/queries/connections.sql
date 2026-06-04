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

-- name: ListConnectionsByWorkspace :many
SELECT *
FROM connections
WHERE workspace_id = $1
  AND deleted_at IS NULL
ORDER BY environment, name;

-- name: SoftDeleteConnection :exec
UPDATE connections
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL;
