package query

import (
	"errors"
	"strings"

	"github.com/labstack/echo/v4"

	apphttp "github.com/tetradatateknologi/kueri/api/internal/http"
	"github.com/tetradatateknologi/kueri/api/internal/http/middleware"
)

const maxSQLLength = 100_000

type Handler struct {
	exec *Executor
}

func NewHandler(exec *Executor) *Handler {
	return &Handler{exec: exec}
}

func (h *Handler) Execute(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}

	var req ExecuteRequest
	if err := c.Bind(&req); err != nil {
		return apphttp.BadRequest(c, "Invalid request body")
	}

	sql := strings.TrimSpace(req.SQL)
	if sql == "" {
		return apphttp.BadRequest(c, "sql is required")
	}
	if len(sql) > maxSQLLength {
		return apphttp.BadRequest(c, "sql exceeds maximum length")
	}
	if req.ConnectionID <= 0 {
		return apphttp.BadRequest(c, "connection_id is required")
	}

	result, err := h.exec.Execute(c.Request().Context(), user.ID, req.ConnectionID, sql)
	if err != nil {
		if errors.Is(err, ErrConnectionNotFound) {
			return apphttp.NotFound(c, "Connection not found")
		}
		return apphttp.QueryError(c, err.Error())
	}

	return apphttp.Success(c, result)
}
