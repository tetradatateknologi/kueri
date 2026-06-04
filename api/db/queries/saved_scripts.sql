-- name: CreateSavedScript :one
INSERT INTO saved_scripts (workspace_id, user_id, title, sql_text)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetSavedScriptByID :one
SELECT *
FROM saved_scripts
WHERE id = $1
  AND deleted_at IS NULL;

-- name: ListSavedScriptsByWorkspace :many
SELECT *
FROM saved_scripts
WHERE workspace_id = $1
  AND deleted_at IS NULL
ORDER BY updated_at DESC;

-- name: UpdateSavedScript :one
UPDATE saved_scripts
SET title = $2,
    sql_text = $3,
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteSavedScript :exec
UPDATE saved_scripts
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL;

-- name: UpsertScriptTag :one
INSERT INTO script_tags (name)
VALUES ($1)
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
RETURNING *;

-- name: LinkScriptTag :exec
INSERT INTO saved_script_tags (script_id, tag_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: ListTagsForScript :many
SELECT t.*
FROM script_tags t
INNER JOIN saved_script_tags st ON st.tag_id = t.id
WHERE st.script_id = $1
ORDER BY t.name;
