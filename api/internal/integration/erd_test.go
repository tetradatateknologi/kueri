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
	"github.com/tetradatateknologi/kueri/api/internal/modules/schema"
	"github.com/tetradatateknologi/kueri/api/internal/modules/workspace"
	"github.com/tetradatateknologi/kueri/api/internal/persistence"
)

func TestConnectionERDMetadata(t *testing.T) {
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
	schema.RegisterRoutes(api, pool, cfg)

	wsRec := httptest.NewRecorder()
	wsReq := httptest.NewRequest(http.MethodPost, "/api/v1/workspaces", bytes.NewBufferString(`{"name":"ERD WS"}`))
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

	connBody := `{
		"name": "ERD Dev",
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

	erdRec := httptest.NewRecorder()
	erdURL := "/api/v1/connections/" + strconv.FormatInt(connEnvelope.Data.ID, 10) + "/erd"
	erdReq := httptest.NewRequest(http.MethodGet, erdURL, nil)
	e.ServeHTTP(erdRec, erdReq)
	if erdRec.Code != http.StatusOK {
		t.Fatalf("fetch erd: %d %s", erdRec.Code, erdRec.Body.String())
	}

	var erdEnvelope struct {
		Data struct {
			ConnectionID int64  `json:"connectionId"`
			Database     string `json:"database"`
			Driver       string `json:"driver"`
			Schemas      []string `json:"schemas"`
			Tables       []struct {
				ID      string `json:"id"`
				Schema  string `json:"schema"`
				Name    string `json:"name"`
				Columns []struct {
					Name         string `json:"name"`
					DataType     string `json:"dataType"`
					IsNullable   bool   `json:"isNullable"`
					IsPrimaryKey bool   `json:"isPrimaryKey"`
					IsForeignKey bool   `json:"isForeignKey"`
				} `json:"columns"`
			} `json:"tables"`
			Relations []struct {
				SourceTable  string `json:"sourceTable"`
				SourceColumn string `json:"sourceColumn"`
				TargetTable  string `json:"targetTable"`
				TargetColumn string `json:"targetColumn"`
			} `json:"relations"`
		} `json:"data"`
	}
	if err := json.Unmarshal(erdRec.Body.Bytes(), &erdEnvelope); err != nil {
		t.Fatal(err)
	}

	data := erdEnvelope.Data
	if data.ConnectionID != connEnvelope.Data.ID {
		t.Fatalf("connectionId mismatch: got %d want %d", data.ConnectionID, connEnvelope.Data.ID)
	}
	if data.Driver != "postgres" {
		t.Fatalf("driver = %q, want postgres", data.Driver)
	}
	if len(data.Tables) == 0 {
		t.Fatal("expected at least one table")
	}

	var connectionsTable *struct {
		ID      string
		Columns []struct {
			Name         string
			DataType     string
			IsNullable   bool
			IsPrimaryKey bool
			IsForeignKey bool
		}
	}
	for i := range data.Tables {
		if data.Tables[i].Name == "connections" {
			connectionsTable = &struct {
				ID      string
				Columns []struct {
					Name         string
					DataType     string
					IsNullable   bool
					IsPrimaryKey bool
					IsForeignKey bool
				}
			}{
				ID:      data.Tables[i].ID,
				Columns: data.Tables[i].Columns,
			}
			break
		}
	}
	if connectionsTable == nil {
		t.Fatal("connections table not found in ERD metadata")
	}

	var foundPK, foundFK bool
	for _, col := range connectionsTable.Columns {
		if col.Name == "id" && col.IsPrimaryKey {
			foundPK = true
		}
		if col.Name == "workspace_id" && col.IsForeignKey {
			foundFK = true
		}
		if col.Name == "id" && col.DataType == "" {
			t.Fatal("expected data type for id column")
		}
	}
	if !foundPK {
		t.Fatal("expected primary key on connections.id")
	}
	if !foundFK {
		t.Fatal("expected foreign key on connections.workspace_id")
	}

	if len(data.Relations) == 0 {
		t.Fatal("expected at least one foreign key relationship")
	}

	foundRelation := false
	for _, rel := range data.Relations {
		if rel.SourceTable == "connections" && rel.SourceColumn == "workspace_id" &&
			rel.TargetTable == "workspaces" && rel.TargetColumn == "id" {
			foundRelation = true
			break
		}
	}
	if !foundRelation {
		t.Fatal("expected connections.workspace_id -> workspaces.id relationship")
	}

	// Credentials must not leak in response body.
	body := erdRec.Body.String()
	if containsAny(body, cfg.DB.Password, "password_encrypted") {
		t.Fatal("ERD response must not expose connection credentials")
	}

	// Unauthorized connection access.
	badRec := httptest.NewRecorder()
	badReq := httptest.NewRequest(http.MethodGet, "/api/v1/connections/999999999/erd", nil)
	e.ServeHTTP(badRec, badReq)
	if badRec.Code != http.StatusNotFound {
		t.Fatalf("unauthorized erd: status %d, body %s", badRec.Code, badRec.Body.String())
	}
}

func containsAny(s string, parts ...string) bool {
	for _, p := range parts {
		if p != "" && len(p) > 0 {
			for i := 0; i <= len(s)-len(p); i++ {
				if s[i:i+len(p)] == p {
					return true
				}
			}
		}
	}
	return false
}
