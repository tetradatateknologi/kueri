// Dev database seed. Run from api/: make seed
package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/config"
	"github.com/tetradatateknologi/kueri/api/internal/persistence"
	"github.com/tetradatateknologi/kueri/api/internal/secrets"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("config", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := persistence.NewPool(ctx, cfg.DB)
	if err != nil {
		slog.Error("database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	q := sqlc.New(pool)

	_, err = q.GetUserByEmail(ctx, "dev@kueri.local")
	if err == nil {
		slog.Info("seed skipped: dev user already exists")
		return
	}

	user, err := q.CreateUser(ctx, sqlc.CreateUserParams{
		Name:     "Developer",
		Email:    "dev@kueri.local",
		Password: "changeme",
	})
	if err != nil {
		slog.Error("create user", "error", err)
		os.Exit(1)
	}

	ws, err := q.CreateWorkspace(ctx, sqlc.CreateWorkspaceParams{
		UserID: user.ID,
		Name:   "E-Commerce App",
	})
	if err != nil {
		slog.Error("create workspace", "error", err)
		os.Exit(1)
	}

	box, err := secrets.NewBox(cfg.Encryption.Key)
	if err != nil {
		slog.Error("encryption", "error", err)
		os.Exit(1)
	}

	devPassword, err := box.Encrypt(cfg.DB.Password)
	if err != nil {
		slog.Error("encrypt dev password", "error", err)
		os.Exit(1)
	}

	for _, c := range []struct {
		name         string
		env          sqlc.ConnectionEnvironment
		host         string
		port         int32
		databaseName string
		username     string
		passwordEnc  *string
	}{
		{
			"Development",
			sqlc.ConnectionEnvironmentDevelopment,
			cfg.DB.Host,
			int32(cfg.DB.Port),
			cfg.DB.Name,
			cfg.DB.User,
			&devPassword,
		},
		{"Staging", sqlc.ConnectionEnvironmentStaging, "staging.db.internal", 5432, "app", "app", nil},
		{"Production", sqlc.ConnectionEnvironmentProduction, "prod-cluster.aws", 5432, "app", "app", nil},
	} {
		username := c.username
		if _, err := q.CreateConnection(ctx, sqlc.CreateConnectionParams{
			WorkspaceID:       ws.ID,
			Name:              c.name,
			Environment:       c.env,
			Driver:            sqlc.ConnectionDriverPostgres,
			Host:              c.host,
			Port:              c.port,
			DatabaseName:      c.databaseName,
			Username:          &username,
			PasswordEncrypted: c.passwordEnc,
			SslMode:           cfg.DB.SSLMode,
		}); err != nil {
			slog.Error("create connection", "name", c.name, "error", err)
			os.Exit(1)
		}
	}

	script, err := q.CreateSavedScript(ctx, sqlc.CreateSavedScriptParams{
		WorkspaceID: ws.ID,
		UserID:      user.ID,
		Title:       "Monthly Revenue Report",
		SqlText:     "SELECT 1;",
	})
	if err != nil {
		slog.Error("create script", "error", err)
		os.Exit(1)
	}

	tag, err := q.UpsertScriptTag(ctx, "Reporting")
	if err != nil {
		slog.Error("upsert tag", "error", err)
		os.Exit(1)
	}
	_ = q.LinkScriptTag(ctx, sqlc.LinkScriptTagParams{ScriptID: script.ID, TagID: tag.ID})

	slog.Info("seed complete", "user_id", user.ID, "workspace_id", ws.ID)
}
