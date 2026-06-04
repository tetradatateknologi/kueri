package backup

import (
	"errors"
	"net/http"

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

func (h *Handler) Export(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}

	data, err := h.svc.Export(c.Request().Context(), user.ID)
	if err != nil {
		return apphttp.InternalError(c, "Failed to export backup", err)
	}
	return apphttp.Success(c, data)
}

func (h *Handler) Import(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}

	var req ImportRequest
	if err := c.Bind(&req); err != nil {
		return apphttp.BadRequest(c, "Invalid request body")
	}

	result, err := h.svc.Import(c.Request().Context(), user.ID, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidBackup):
			return apphttp.Error(c, http.StatusBadRequest, "INVALID_BACKUP", err.Error())
		case errors.Is(err, ErrInvalidMode):
			return apphttp.BadRequest(c, "Import mode must be merge or replace")
		case errors.Is(err, ErrBackupTooLarge):
			return apphttp.Error(c, http.StatusBadRequest, "BACKUP_TOO_LARGE", err.Error())
		default:
			return apphttp.InternalError(c, "Failed to import backup", err)
		}
	}

	return apphttp.Success(c, result)
}
