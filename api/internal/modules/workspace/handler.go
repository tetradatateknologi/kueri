package workspace

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

func (h *Handler) List(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	if _, hasQ := c.QueryParams()["q"]; hasQ {
		q := strings.TrimSpace(c.QueryParam("q"))
		workspaces, err := h.svc.SearchForUser(c.Request().Context(), user.ID, q)
		if err != nil {
			return apphttp.InternalError(c, "Failed to search workspaces", err)
		}
		return apphttp.Success(c, workspaces)
	}
	workspaces, err := h.svc.ListForUser(c.Request().Context(), user.ID)
	if err != nil {
		return apphttp.InternalError(c, "Failed to list workspaces", err)
	}
	return apphttp.Success(c, workspaces)
}

func (h *Handler) Create(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	var req CreateWorkspaceRequest
	if err := c.Bind(&req); err != nil {
		return apphttp.BadRequest(c, "Invalid request body")
	}
	ws, err := h.svc.Create(c.Request().Context(), user.ID, req.Name)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			return apphttp.BadRequest(c, "Workspace name is required")
		}
		return apphttp.InternalError(c, "Failed to create workspace", err)
	}
	return apphttp.Created(c, ws)
}

func (h *Handler) Update(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	workspaceID, err := parseWorkspaceID(c)
	if err != nil {
		return apphttp.BadRequest(c, "Invalid workspace ID")
	}
	var req UpdateWorkspaceRequest
	if err := c.Bind(&req); err != nil {
		return apphttp.BadRequest(c, "Invalid request body")
	}
	ws, err := h.svc.Update(c.Request().Context(), user.ID, workspaceID, req.Name)
	if err != nil {
		if errors.Is(err, ErrWorkspaceNotFound) {
			return apphttp.NotFound(c, "Workspace not found")
		}
		if errors.Is(err, ErrInvalidInput) {
			return apphttp.BadRequest(c, "Workspace name is required")
		}
		return apphttp.InternalError(c, "Failed to update workspace", err)
	}
	return apphttp.Success(c, ws)
}

func (h *Handler) Delete(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	workspaceID, err := parseWorkspaceID(c)
	if err != nil {
		return apphttp.BadRequest(c, "Invalid workspace ID")
	}
	if err := h.svc.Delete(c.Request().Context(), user.ID, workspaceID); err != nil {
		if errors.Is(err, ErrWorkspaceNotFound) {
			return apphttp.NotFound(c, "Workspace not found")
		}
		return apphttp.InternalError(c, "Failed to delete workspace", err)
	}
	return apphttp.Success(c, DeleteResponse{Deleted: true})
}

func (h *Handler) DeleteConnection(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	workspaceID, err := parseWorkspaceID(c)
	if err != nil {
		return apphttp.BadRequest(c, "Invalid workspace ID")
	}
	connectionID, err := strconv.ParseInt(c.Param("connectionId"), 10, 64)
	if err != nil {
		return apphttp.BadRequest(c, "Invalid connection ID")
	}
	if err := h.svc.DeleteConnection(c.Request().Context(), user.ID, workspaceID, connectionID); err != nil {
		if errors.Is(err, ErrWorkspaceNotFound) {
			return apphttp.NotFound(c, "Connection not found")
		}
		return apphttp.InternalError(c, "Failed to delete connection", err)
	}
	return apphttp.Success(c, DeleteResponse{Deleted: true})
}

func (h *Handler) UpdateConnection(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	workspaceID, err := parseWorkspaceID(c)
	if err != nil {
		return apphttp.BadRequest(c, "Invalid workspace ID")
	}
	connectionID, err := strconv.ParseInt(c.Param("connectionId"), 10, 64)
	if err != nil {
		return apphttp.BadRequest(c, "Invalid connection ID")
	}
	var req ConnectionInput
	if err := c.Bind(&req); err != nil {
		return apphttp.BadRequest(c, "Invalid request body")
	}
	conn, err := h.svc.UpdateConnection(c.Request().Context(), user.ID, workspaceID, connectionID, req)
	if err != nil {
		return connectionError(c, err, "Failed to update connection")
	}
	return apphttp.Success(c, conn)
}

func (h *Handler) CreateConnection(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	workspaceID, err := parseWorkspaceID(c)
	if err != nil {
		return apphttp.BadRequest(c, "Invalid workspace ID")
	}
	var req ConnectionInput
	if err := c.Bind(&req); err != nil {
		return apphttp.BadRequest(c, "Invalid request body")
	}
	conn, err := h.svc.CreateConnection(c.Request().Context(), user.ID, workspaceID, req)
	if err != nil {
		return connectionError(c, err, "Failed to create connection")
	}
	return apphttp.Created(c, conn)
}

func (h *Handler) TestConnection(c echo.Context) error {
	user, ok := middleware.UserFromContext(c.Request().Context())
	if !ok {
		return apphttp.NotFound(c, "User not found")
	}
	workspaceID, err := parseWorkspaceID(c)
	if err != nil {
		return apphttp.BadRequest(c, "Invalid workspace ID")
	}
	var req ConnectionInput
	if err := c.Bind(&req); err != nil {
		return apphttp.BadRequest(c, "Invalid request body")
	}
	if err := h.svc.TestConnection(c.Request().Context(), user.ID, workspaceID, req); err != nil {
		if errors.Is(err, ErrWorkspaceNotFound) {
			return apphttp.NotFound(c, "Workspace not found")
		}
		if errors.Is(err, ErrInvalidInput) {
			return apphttp.BadRequest(c, "Invalid connection fields")
		}
		return apphttp.QueryError(c, err.Error())
	}
	return apphttp.Success(c, TestConnectionResponse{OK: true})
}

func parseWorkspaceID(c echo.Context) (int64, error) {
	return strconv.ParseInt(c.Param("workspaceId"), 10, 64)
}

func connectionError(c echo.Context, err error, fallback string) error {
	switch {
	case errors.Is(err, ErrWorkspaceNotFound):
		return apphttp.NotFound(c, "Workspace not found")
	case errors.Is(err, ErrConnectionConflict):
		return apphttp.BadRequest(c, "A connection with this name and environment already exists")
	case errors.Is(err, ErrInvalidInput):
		return apphttp.BadRequest(c, "Invalid connection fields")
	default:
		return apphttp.InternalError(c, fallback, err)
	}
}
