CREATE TYPE connection_environment AS ENUM ('development', 'staging', 'production');

CREATE TYPE connection_driver AS ENUM ('postgres', 'mysql', 'sqlite');

CREATE TABLE connections (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces (id),
    name VARCHAR(150) NOT NULL,
    environment connection_environment NOT NULL DEFAULT 'development',
    driver connection_driver NOT NULL DEFAULT 'postgres',
    host VARCHAR(255) NOT NULL DEFAULT 'localhost',
    port INT NOT NULL DEFAULT 5432,
    database_name VARCHAR(150) NOT NULL,
    username VARCHAR(150),
    password_encrypted TEXT,
    ssl_mode VARCHAR(20) NOT NULL DEFAULT 'disable',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_connections_workspace_name_env UNIQUE (workspace_id, name, environment)
);

CREATE INDEX idx_connections_workspace_id ON connections (workspace_id) WHERE deleted_at IS NULL;
