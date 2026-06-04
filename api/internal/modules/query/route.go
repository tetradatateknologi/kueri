package query

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/tetradatateknologi/kueri/api/internal/config"
	"github.com/tetradatateknologi/kueri/api/internal/http/middleware"
	"github.com/tetradatateknologi/kueri/api/internal/secrets"
)

func RegisterRoutes(e *echo.Echo, pool *pgxpool.Pool, cfg *config.Config) {
	box, err := secrets.NewBox(cfg.Encryption.Key)
	if err != nil {
		panic("invalid encryption config: " + err.Error())
	}
	exec := NewExecutor(pool, box)
	h := NewHandler(exec)

	g := e.Group("")
	g.Use(middleware.DevUser(pool, cfg.Dev.UserEmail))
	g.POST("/query", h.Execute)
}
