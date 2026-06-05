package seed

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/config"
	"github.com/tetradatateknologi/kueri/api/internal/secrets"
)

// EnsureDevData creates the default dev user, workspace, and sample data when missing.
func EnsureDevData(ctx context.Context, pool *pgxpool.Pool, cfg *config.Config) error {
	q := sqlc.New(pool)

	_, err := q.GetUserByEmail(ctx, cfg.Dev.UserEmail)
	if err == nil {
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("check dev user: %w", err)
	}

	user, err := q.CreateUser(ctx, sqlc.CreateUserParams{
		Name:     "Developer",
		Email:    cfg.Dev.UserEmail,
		Password: "changeme",
	})
	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}

	ws, err := q.CreateWorkspace(ctx, sqlc.CreateWorkspaceParams{
		UserID: user.ID,
		Name:   "E-Commerce App",
	})
	if err != nil {
		return fmt.Errorf("create workspace: %w", err)
	}

	box, err := secrets.NewBox(cfg.Encryption.Key)
	if err != nil {
		return fmt.Errorf("encryption: %w", err)
	}

	devPassword, err := box.Encrypt(cfg.DB.Password)
	if err != nil {
		return fmt.Errorf("encrypt dev password: %w", err)
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
			return fmt.Errorf("create connection %q: %w", c.name, err)
		}
	}

	script, err := q.CreateSavedScript(ctx, sqlc.CreateSavedScriptParams{
		WorkspaceID: ws.ID,
		UserID:      user.ID,
		Title:       "Monthly Revenue Report",
		SqlText:     "SELECT 1;",
	})
	if err != nil {
		return fmt.Errorf("create script: %w", err)
	}

	tag, err := q.UpsertScriptTag(ctx, "Reporting")
	if err != nil {
		return fmt.Errorf("upsert tag: %w", err)
	}
	if err := q.LinkScriptTag(ctx, sqlc.LinkScriptTagParams{ScriptID: script.ID, TagID: tag.ID}); err != nil {
		return fmt.Errorf("link script tag: %w", err)
	}

	slog.Info("seed complete", "user_id", user.ID, "workspace_id", ws.ID)
	return nil
}
