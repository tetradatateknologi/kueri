package health

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

func RegisterRoutes(e *echo.Echo, pool *pgxpool.Pool) {
	h := NewHandler(pool)
	e.GET("/health", h.Health)
	e.GET("/ping", h.Ping)
	e.GET("/version", h.Version)
}
