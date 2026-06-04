package health

import (
	"github.com/labstack/echo/v4"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Health(c echo.Context) error {
	return c.JSON(200, map[string]string{"status": "ok"})
}

func (h *Handler) Ping(c echo.Context) error {
	return c.JSON(200, map[string]string{"message": "pong"})
}
