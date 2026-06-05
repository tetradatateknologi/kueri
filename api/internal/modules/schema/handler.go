package schema

import (
	"errors"
	"strconv"
	"strings"

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

func (h *Handler) Overview(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}

	connectionID, err := strconv.ParseInt(c.Param("connectionId"), 10, 64)
	if err != nil || connectionID <= 0 {
		return apphttp.BadRequest(c, "Invalid connection id")
	}

	out, err := h.svc.Overview(c.Request().Context(), user.ID, connectionID)
	if err != nil {
		if errors.Is(err, ErrConnectionNotFound) {
			return apphttp.NotFound(c, "Connection not found")
		}
		return apphttp.QueryError(c, err.Error())
	}

	return apphttp.Success(c, out)
}

func (h *Handler) TableColumns(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}

	connectionID, err := strconv.ParseInt(c.Param("connectionId"), 10, 64)
	if err != nil || connectionID <= 0 {
		return apphttp.BadRequest(c, "Invalid connection id")
	}

	schemaName := strings.TrimSpace(c.QueryParam("schema"))
	tableName := strings.TrimSpace(c.QueryParam("table"))
	if schemaName == "" || tableName == "" {
		return apphttp.BadRequest(c, "schema and table query parameters are required")
	}

	out, err := h.svc.TableColumns(c.Request().Context(), user.ID, connectionID, schemaName, tableName)
	if err != nil {
		if errors.Is(err, ErrConnectionNotFound) {
			return apphttp.NotFound(c, "Connection not found")
		}
		return apphttp.QueryError(c, err.Error())
	}

	return apphttp.Success(c, out)
}
