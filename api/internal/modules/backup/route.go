package backup

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

	g.GET("/backup/export", h.Export)
	g.POST("/backup/import", h.Import)
}
