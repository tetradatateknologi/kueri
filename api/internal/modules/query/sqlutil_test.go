package query

import (
	"strings"
	"testing"
)

func TestIsReadQuery(t *testing.T) {
	tests := []struct {
		name string
		sql  string
		want bool
	}{
		{"select uppercase", "SELECT * FROM users", true},
		{"select lowercase", "select * from users", true},
		{"multiline select", "SELECT *\nFROM users", true},
		{"trailing semicolon", "SELECT * FROM users;", true},
		{"with cte", "WITH cte AS (SELECT 1) SELECT * FROM cte", true},
		{"insert", "INSERT INTO users (name) VALUES ('a')", false},
		{"update", "UPDATE users SET name = 'a'", false},
		{"delete", "DELETE FROM users", false},
		{"truncate", "TRUNCATE users", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsReadQuery(tt.sql); got != tt.want {
				t.Fatalf("IsReadQuery(%q) = %v, want %v", tt.sql, got, tt.want)
			}
		})
	}
}

func TestHasExplicitLimit(t *testing.T) {
	tests := []struct {
		name string
		sql  string
		want bool
	}{
		{"no limit", "SELECT * FROM users", false},
		{"explicit limit", "SELECT * FROM users LIMIT 50", true},
		{"limit with semicolon", "SELECT * FROM users LIMIT 50;", true},
		{"limit in comment ignored", "SELECT * FROM users -- LIMIT 99", false},
		{"limit in string ignored", "SELECT 'LIMIT 99' AS label FROM users", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := HasExplicitLimit(tt.sql); got != tt.want {
				t.Fatalf("HasExplicitLimit(%q) = %v, want %v", tt.sql, got, tt.want)
			}
		})
	}
}

func TestPreparePaginatedSQL(t *testing.T) {
	t.Run("select without limit applies wrapper pagination", func(t *testing.T) {
		sql, isRead, auto := PreparePaginatedSQL("SELECT * FROM users", 20, 0)
		if !isRead || !auto {
			t.Fatalf("isRead=%v auto=%v", isRead, auto)
		}
		if !strings.Contains(sql, "LIMIT 20 OFFSET 0") {
			t.Fatalf("expected LIMIT/OFFSET in %q", sql)
		}
		if !strings.Contains(sql, "SELECT * FROM users") {
			t.Fatalf("expected original query preserved in %q", sql)
		}
	})

	t.Run("select with explicit limit does not set auto limit", func(t *testing.T) {
		_, isRead, auto := PreparePaginatedSQL("SELECT * FROM users LIMIT 100", 20, 0)
		if !isRead || auto {
			t.Fatalf("isRead=%v auto=%v", isRead, auto)
		}
	})

	t.Run("insert is unchanged", func(t *testing.T) {
		sql, isRead, auto := PreparePaginatedSQL("INSERT INTO users VALUES (1)", 20, 0)
		if isRead || auto {
			t.Fatalf("isRead=%v auto=%v", isRead, auto)
		}
		if sql != "INSERT INTO users VALUES (1)" {
			t.Fatalf("unexpected sql %q", sql)
		}
	})

	t.Run("offset increments", func(t *testing.T) {
		sql, _, _ := PreparePaginatedSQL("SELECT * FROM users", 20, 40)
		if !strings.Contains(sql, "LIMIT 20 OFFSET 40") {
			t.Fatalf("expected OFFSET 40 in %q", sql)
		}
	})
}
