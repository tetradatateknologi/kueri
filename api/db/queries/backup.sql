-- name: SoftDeleteAllUserData :exec
UPDATE saved_scripts
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE user_id = $1
  AND deleted_at IS NULL;

-- name: SoftDeleteAllUserConnections :exec
UPDATE connections
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE workspace_id IN (
    SELECT id FROM workspaces WHERE user_id = $1 AND deleted_at IS NULL
)
  AND deleted_at IS NULL;

-- name: SoftDeleteAllUserWorkspaces :exec
UPDATE workspaces
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE user_id = $1
  AND deleted_at IS NULL;
