package query

import (
	"math/rand"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	apphttp "github.com/tetradatateknologi/kueri/api/internal/http"
)

const maxSQLLength = 100_000

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Execute(c echo.Context) error {
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

	lower := strings.ToLower(sql)
	if strings.Contains(lower, "error") || strings.Contains(lower, "invalid") {
		return apphttp.QueryError(c, "query execution failed: simulated error for demo SQL containing 'error' or 'invalid'")
	}

	// Simulate network / DB latency for loading states in the UI.
	delay := time.Duration(300+rand.Intn(500)) * time.Millisecond
	time.Sleep(delay)

	result := mockResult()
	result.DurationMs = delay.Milliseconds()
	if strings.Contains(lower, "cache") {
		result.Cached = true
	}

	return apphttp.Success(c, result)
}

func mockResult() ExecuteResult {
	columns := []string{"id", "customer", "email", "total", "status", "created_at"}
	rows := [][]interface{}{
		{1024, "Ava Martinez", "ava@northwind.io", "$248.00", "paid", "2026-05-31 14:02"},
		{1025, "Liam Chen", "liam.c@acme.dev", "$1,820.50", "paid", "2026-05-31 14:11"},
		{1026, "Noah Patel", "noah@studio.co", "$72.10", "refunded", "2026-05-31 14:24"},
		{1027, "Mia Thompson", "mia.t@hello.com", "$540.00", "pending", "2026-05-31 14:48"},
		{1028, "Ethan Brooks", "ethan@brooks.dev", "$96.75", "paid", "2026-05-31 15:02"},
		{1029, "Sofia Rivera", "sofia@rivera.io", "$2,310.00", "paid", "2026-05-31 15:33"},
		{1030, "Lucas Wright", "lucas@wright.co", "$18.40", "failed", "2026-05-31 15:51"},
		{1031, "Zoe Nakamura", "zoe@nakamura.jp", "$415.20", "paid", "2026-05-31 16:09"},
	}
	return ExecuteResult{
		Columns:  columns,
		Rows:     rows,
		RowCount: len(rows),
		Cached:   false,
	}
}
