package update

import (
	"net/http"

	"github.com/labstack/echo/v4"

	apphttp "github.com/tetradatateknologi/kueri/api/internal/http"
)

type Handler struct {
	checker *Checker
}

func NewHandler(opts Options) *Handler {
	return &Handler{checker: NewChecker(opts)}
}

func RegisterRoutes(g *echo.Group, opts Options) {
	h := NewHandler(opts)
	g.GET("/updates/check", h.Check)
}

func (h *Handler) Check(c echo.Context) error {
	result, err := h.checker.Check(c.Request().Context())
	if err != nil {
		return apphttp.Error(c, http.StatusBadGateway, "UPDATE_CHECK_FAILED", err.Error())
	}
	return apphttp.Success(c, result)
}
