//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"

	"github.com/labstack/echo/v4"

	"github.com/tetradatateknologi/kueri/api/internal/config"
	"github.com/tetradatateknologi/kueri/api/internal/http/middleware"
	"github.com/tetradatateknologi/kueri/api/internal/modules/query"
	"github.com/tetradatateknologi/kueri/api/internal/modules/workspace"
	"github.com/tetradatateknologi/kueri/api/internal/persistence"
)

func TestWorkspaceConnectionAndQuery(t *testing.T) {
	if os.Getenv("KUERI_INTEGRATION") == "" {
		t.Skip("set KUERI_INTEGRATION=1 to run integration tests")
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	pool, err := persistence.NewPool(ctx, cfg.DB)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)

	e := echo.New()
	api := e.Group("/api/v1")
	api.Use(middleware.DevUser(pool, cfg.Dev.UserEmail))
	workspace.RegisterRoutes(api, pool, cfg)
	query.RegisterRoutes(e, pool, cfg)

	// Create workspace
	wsRec := httptest.NewRecorder()
	wsReq := httptest.NewRequest(http.MethodPost, "/api/v1/workspaces", bytes.NewBufferString(`{"name":"Integration WS"}`))
	wsReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	e.ServeHTTP(wsRec, wsReq)
	if wsRec.Code != http.StatusCreated {
		t.Fatalf("create workspace: %d %s", wsRec.Code, wsRec.Body.String())
	}

	var wsEnvelope struct {
		Data struct {
			ID int64 `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(wsRec.Body.Bytes(), &wsEnvelope); err != nil {
		t.Fatal(err)
	}

	// Create connection to app database
	connBody := `{
		"name": "Integration Dev",
		"environment": "development",
		"host": "` + cfg.DB.Host + `",
		"port": ` + strconv.Itoa(cfg.DB.Port) + `,
		"database_name": "` + cfg.DB.Name + `",
		"username": "` + cfg.DB.User + `",
		"password": "` + cfg.DB.Password + `",
		"ssl_mode": "` + cfg.DB.SSLMode + `"
	}`
	connRec := httptest.NewRecorder()
	connURL := "/api/v1/workspaces/" + strconv.FormatInt(wsEnvelope.Data.ID, 10) + "/connections"
	connReq := httptest.NewRequest(http.MethodPost, connURL, bytes.NewBufferString(connBody))
	connReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	e.ServeHTTP(connRec, connReq)
	if connRec.Code != http.StatusCreated {
		t.Fatalf("create connection: %d %s", connRec.Code, connRec.Body.String())
	}

	var connEnvelope struct {
		Data struct {
			ID int64 `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(connRec.Body.Bytes(), &connEnvelope); err != nil {
		t.Fatal(err)
	}

	// Execute query
	qBody := `{"sql":"SELECT 1 AS n","connection_id":` + strconv.FormatInt(connEnvelope.Data.ID, 10) + `}`
	qRec := httptest.NewRecorder()
	qReq := httptest.NewRequest(http.MethodPost, "/query", bytes.NewBufferString(qBody))
	qReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	e.ServeHTTP(qRec, qReq)
	if qRec.Code != http.StatusOK {
		t.Fatalf("execute query: %d %s", qRec.Code, qRec.Body.String())
	}

	var qEnvelope struct {
		Data struct {
			RowCount int `json:"rowCount"`
		} `json:"data"`
	}
	if err := json.Unmarshal(qRec.Body.Bytes(), &qEnvelope); err != nil {
		t.Fatal(err)
	}
	if qEnvelope.Data.RowCount < 1 {
		t.Fatalf("expected rows, got %d", qEnvelope.Data.RowCount)
	}

	// Update connection host label (name change)
	patchBody := `{
		"name": "Integration Dev Updated",
		"environment": "development",
		"driver": "postgres",
		"host": "` + cfg.DB.Host + `",
		"port": ` + strconv.Itoa(cfg.DB.Port) + `,
		"database_name": "` + cfg.DB.Name + `",
		"username": "` + cfg.DB.User + `",
		"password": "",
		"ssl_mode": "` + cfg.DB.SSLMode + `"
	}`
	patchRec := httptest.NewRecorder()
	patchURL := connURL + "/" + strconv.FormatInt(connEnvelope.Data.ID, 10)
	patchReq := httptest.NewRequest(http.MethodPatch, patchURL, bytes.NewBufferString(patchBody))
	patchReq.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	e.ServeHTTP(patchRec, patchReq)
	if patchRec.Code != http.StatusOK {
		t.Fatalf("update connection: %d %s", patchRec.Code, patchRec.Body.String())
	}

	var patchEnvelope struct {
		Data struct {
			Name string `json:"name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(patchRec.Body.Bytes(), &patchEnvelope); err != nil {
		t.Fatal(err)
	}
	if patchEnvelope.Data.Name != "Integration Dev Updated" {
		t.Fatalf("expected updated name, got %q", patchEnvelope.Data.Name)
	}
}
