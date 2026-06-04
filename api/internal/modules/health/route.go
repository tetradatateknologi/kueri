package health

import "github.com/labstack/echo/v4"

func RegisterRoutes(e *echo.Echo) {
	h := NewHandler()
	e.GET("/health", h.Health)
	e.GET("/ping", h.Ping)
}
