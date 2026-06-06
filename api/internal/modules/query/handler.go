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

	if len(req.Filters) > 0 {
		if err := validateFilters(req.Filters); err != nil {
			return apphttp.BadRequest(c, err.Error())
		}
		eligibility := AnalyzeQueryFilterEligibility(sql, nil)
		if !eligibility.Enabled {
			return apphttp.BadRequest(c, eligibility.Reason)
		}
	}

	limit := DefaultQueryLimit
	if req.Limit != nil && *req.Limit > 0 {
		limit = *req.Limit
	}
	offset := 0
	if req.Offset != nil && *req.Offset >= 0 {
		offset = *req.Offset
	}

	result, err := h.exec.Execute(c.Request().Context(), user.ID, req.ConnectionID, sql, limit, offset, req.Filters)
	if err != nil {
		if errors.Is(err, ErrConnectionNotFound) {
			return apphttp.NotFound(c, "Connection not found")
		}
		if errors.Is(err, ErrInvalidFilter) {
			return apphttp.BadRequest(c, err.Error())
		}
		return apphttp.QueryError(c, err.Error())
	}

	return apphttp.Success(c, result)
}
