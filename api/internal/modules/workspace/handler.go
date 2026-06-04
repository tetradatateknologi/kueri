package workspace

import (
	"github.com/labstack/echo/v4"

	apphttp "github.com/tetradatateknologi/kueri/api/internal/http"
	"github.com/tetradatateknologi/kueri/api/internal/http/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) List(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	workspaces, err := h.svc.ListForUser(c.Request().Context(), user.ID)
	if err != nil {
		return apphttp.InternalError(c, "Failed to list workspaces", err)
	}
	return apphttp.Success(c, workspaces)
}
