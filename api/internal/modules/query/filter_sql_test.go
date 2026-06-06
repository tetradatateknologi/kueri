package query

import (
	"strings"
	"testing"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

func TestPrepareFilteredPaginatedSQL_TrailingSemicolon(t *testing.T) {
	sql, args, isRead, auto, err := PrepareFilteredPaginatedSQL(
		"SELECT id, name FROM users;",
		string(sqlc.ConnectionDriverPostgres),
		nil,
		nil,
		20,
		0,
	)
	if err != nil {
		t.Fatal(err)
	}
	if !isRead || !auto {
		t.Fatalf("isRead=%v auto=%v", isRead, auto)
	}
	if strings.Contains(sql, "users;") {
		t.Fatalf("trailing semicolon should be removed: %q", sql)
	}
	if !strings.Contains(sql, "LIMIT 20 OFFSET 0") {
		t.Fatalf("expected pagination in %q", sql)
	}
	if len(args) != 0 {
		t.Fatalf("expected no args, got %v", args)
	}
}

func TestPrepareFilteredPaginatedSQL_ContainsPostgres(t *testing.T) {
	value := "hanif"
	filters := []ColumnFilter{{
		Column:   "name",
		Operator: FilterOperatorContains,
		Value:    &value,
	}}

	sql, args, _, _, err := PrepareFilteredPaginatedSQL(
		"SELECT id, name FROM users",
		string(sqlc.ConnectionDriverPostgres),
		filters,
		[]string{"id", "name"},
		20,
		0,
	)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(sql, `CAST("name" AS TEXT) ILIKE $1`) {
		t.Fatalf("expected ILIKE clause in %q", sql)
	}
	if len(args) != 1 || args[0] != "%hanif%" {
		t.Fatalf("args = %v", args)
	}
	if strings.Contains(sql, "hanif") {
		t.Fatal("filter value must not be concatenated into SQL")
	}
}

func TestPrepareFilteredPaginatedSQL_EqualsPostgres(t *testing.T) {
	value := "active"
	filters := []ColumnFilter{{
		Column:   "status",
		Operator: FilterOperatorEquals,
		Value:    &value,
	}}

	sql, args, _, _, err := PrepareFilteredPaginatedSQL(
		"SELECT id, status FROM users",
		string(sqlc.ConnectionDriverPostgres),
		filters,
		[]string{"id", "status"},
		20,
		0,
	)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(sql, `CAST("status" AS TEXT) = $1`) {
		t.Fatalf("expected equals clause in %q", sql)
	}
	if len(args) != 1 || args[0] != "active" {
		t.Fatalf("args = %v", args)
	}
}

func TestPrepareFilteredPaginatedSQL_MultipleFilters(t *testing.T) {
	name := "hanif"
	email := "@gmail.com"
	filters := []ColumnFilter{
		{Column: "name", Operator: FilterOperatorContains, Value: &name},
		{Column: "email", Operator: FilterOperatorContains, Value: &email},
	}

	sql, args, _, _, err := PrepareFilteredPaginatedSQL(
		"SELECT id, name, email FROM users",
		string(sqlc.ConnectionDriverPostgres),
		filters,
		[]string{"id", "name", "email"},
		20,
		0,
	)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(sql, " AND ") {
		t.Fatalf("expected AND between filters in %q", sql)
	}
	if len(args) != 2 {
		t.Fatalf("args = %v", args)
	}
}

func TestPrepareFilteredPaginatedSQL_UnknownColumn(t *testing.T) {
	value := "x"
	filters := []ColumnFilter{{
		Column:   "missing",
		Operator: FilterOperatorContains,
		Value:    &value,
	}}

	_, _, _, _, err := PrepareFilteredPaginatedSQL(
		"SELECT id FROM users",
		string(sqlc.ConnectionDriverPostgres),
		filters,
		[]string{"id"},
		20,
		0,
	)
	if err == nil {
		t.Fatal("expected unknown column error")
	}
}

func TestPrepareFilteredPaginatedSQL_PaginationWithFilters(t *testing.T) {
	value := "a"
	filters := []ColumnFilter{{
		Column:   "name",
		Operator: FilterOperatorContains,
		Value:    &value,
	}}

	sql, _, _, _, err := PrepareFilteredPaginatedSQL(
		"SELECT id, name FROM users",
		string(sqlc.ConnectionDriverPostgres),
		filters,
		[]string{"id", "name"},
		21,
		40,
	)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(sql, "LIMIT 21 OFFSET 40") {
		t.Fatalf("expected pagination in %q", sql)
	}
}

func TestPrepareFilteredPaginatedSQL_ExplicitLimitPreservesAutoFlag(t *testing.T) {
	_, _, _, auto, err := PrepareFilteredPaginatedSQL(
		"SELECT * FROM users LIMIT 100",
		string(sqlc.ConnectionDriverPostgres),
		nil,
		nil,
		20,
		0,
	)
	if err != nil {
		t.Fatal(err)
	}
	if auto {
		t.Fatal("expected autoLimitApplied false when query has explicit LIMIT")
	}
}

func TestBuildFilteringInfo_DisabledReason(t *testing.T) {
	info := buildFilteringInfo(QueryFilterEligibility{
		Enabled: false,
		Reason:  "Only SELECT queries support column filtering.",
	}, nil)
	if info.Enabled || info.Mode != FilterModeNone {
		t.Fatalf("info = %+v", info)
	}
	if info.Reason == nil || *info.Reason == "" {
		t.Fatal("expected reason")
	}
}
