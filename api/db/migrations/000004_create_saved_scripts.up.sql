CREATE TABLE saved_scripts (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces (id),
    user_id BIGINT NOT NULL REFERENCES users (id),
    title VARCHAR(200) NOT NULL,
    sql_text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_saved_scripts_workspace_id ON saved_scripts (workspace_id) WHERE deleted_at IS NULL;

CREATE TABLE script_tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE saved_script_tags (
    script_id BIGINT NOT NULL REFERENCES saved_scripts (id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES script_tags (id) ON DELETE CASCADE,
    PRIMARY KEY (script_id, tag_id)
);

CREATE INDEX idx_saved_script_tags_tag_id ON saved_script_tags (tag_id);
