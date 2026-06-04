package workspace

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

func RegisterRoutes(g *echo.Group, pool *pgxpool.Pool) {
	svc := NewService(pool)
	h := NewHandler(svc)
	g.GET("/workspaces", h.List)
}
