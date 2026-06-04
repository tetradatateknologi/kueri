package health

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	apphttp "github.com/tetradatateknologi/kueri/api/internal/http"
	"github.com/tetradatateknologi/kueri/api/internal/version"
)

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

func (h *Handler) Health(c echo.Context) error {
	return apphttp.Success(c, map[string]string{"status": "ok"})
}

func (h *Handler) Ping(c echo.Context) error {
	return apphttp.Success(c, map[string]string{"message": "pong"})
}

func (h *Handler) Version(c echo.Context) error {
	schemaVersion := int64(0)
	if h.pool != nil {
		_ = h.pool.QueryRow(context.Background(),
			`SELECT COALESCE(MAX(version), 0) FROM schema_migrations`,
		).Scan(&schemaVersion)
	}

	return apphttp.Success(c, map[string]any{
		"version":        version.Version,
		"mode":           version.Mode,
		"schema_version": schemaVersion,
	})
}
