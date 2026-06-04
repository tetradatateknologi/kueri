package health

import (
	"github.com/labstack/echo/v4"

	apphttp "github.com/tetradatateknologi/kueri/api/internal/http"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Health(c echo.Context) error {
	return apphttp.Success(c, map[string]string{"status": "ok"})
}

func (h *Handler) Ping(c echo.Context) error {
	return apphttp.Success(c, map[string]string{"message": "pong"})
}
