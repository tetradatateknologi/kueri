package script

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

func RegisterRoutes(g *echo.Group, pool *pgxpool.Pool) {
	svc := NewService(pool)
	h := NewHandler(svc)

	g.GET("/scripts", h.List)
	g.GET("/scripts/:id", h.Get)
	g.POST("/scripts", h.Create)
	g.PATCH("/scripts/:id/favorite", h.SetFavorite)
	g.PATCH("/scripts/:id", h.Update)
	g.DELETE("/scripts/:id", h.Delete)
}
