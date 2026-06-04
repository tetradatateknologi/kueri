-- name: CreateWorkspace :one
INSERT INTO workspaces (user_id, name)
VALUES ($1, $2)
RETURNING *;

-- name: GetWorkspaceByID :one
SELECT *
FROM workspaces
WHERE id = $1
  AND deleted_at IS NULL;

-- name: ListWorkspacesByUser :many
SELECT *
FROM workspaces
WHERE user_id = $1
  AND deleted_at IS NULL
ORDER BY name;

-- name: ListWorkspacesByUserSearch :many
SELECT *
FROM workspaces
WHERE user_id = sqlc.arg('user_id')
  AND deleted_at IS NULL
  AND name ILIKE '%' || sqlc.arg('search') || '%'
ORDER BY name
LIMIT 50;

-- name: UpdateWorkspaceName :one
UPDATE workspaces
SET name = $2,
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteWorkspace :exec
UPDATE workspaces
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL;
