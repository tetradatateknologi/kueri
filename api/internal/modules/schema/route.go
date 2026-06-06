package schema

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/tetradatateknologi/kueri/api/internal/config"
	"github.com/tetradatateknologi/kueri/api/internal/secrets"
)

func RegisterRoutes(g *echo.Group, pool *pgxpool.Pool, cfg *config.Config) {
	box, err := secrets.NewBox(cfg.Encryption.Key)
	if err != nil {
		panic("invalid encryption config: " + err.Error())
	}
	svc := NewService(pool, box)
	h := NewHandler(svc)

	g.GET("/connections/:connectionId/schema", h.Overview)
	g.GET("/connections/:connectionId/schema/columns", h.TableColumns)
	g.GET("/connections/:connectionId/erd", h.ERD)
}
