package script

import (
	"errors"
	"strconv"

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
	scripts, err := h.svc.ListForUser(c.Request().Context(), user.ID)
	if err != nil {
		return apphttp.InternalError(c, "Failed to list scripts", err)
	}
	return apphttp.Success(c, scripts)
}

func (h *Handler) Get(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return apphttp.BadRequest(c, "Invalid script ID")
	}
	script, err := h.svc.GetByID(c.Request().Context(), user.ID, id)
	if err != nil {
		if errors.Is(err, ErrScriptNotFound) {
			return apphttp.NotFound(c, "Script not found")
		}
		return apphttp.InternalError(c, "Failed to get script", err)
	}
	return apphttp.Success(c, script)
}

func (h *Handler) Update(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return apphttp.BadRequest(c, "Invalid script ID")
	}
	var req UpdateScriptRequest
	if err := c.Bind(&req); err != nil {
		return apphttp.BadRequest(c, "Invalid request body")
	}
	script, err := h.svc.Update(c.Request().Context(), user.ID, id, req)
	if err != nil {
		if errors.Is(err, ErrScriptNotFound) {
			return apphttp.NotFound(c, "Script not found")
		}
		return apphttp.InternalError(c, "Failed to update script", err)
	}
	return apphttp.Success(c, script)
}

func (h *Handler) Create(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	var req CreateScriptRequest
	if err := c.Bind(&req); err != nil {
		return apphttp.BadRequest(c, "Invalid request body")
	}
	if req.WorkspaceID <= 0 {
		return apphttp.BadRequest(c, "workspace_id is required")
	}
	script, err := h.svc.Create(c.Request().Context(), user.ID, req)
	if err != nil {
		if errors.Is(err, ErrScriptNotFound) {
			return apphttp.NotFound(c, "Workspace not found")
		}
		return apphttp.InternalError(c, "Failed to create script", err)
	}
	return apphttp.Created(c, script)
}

