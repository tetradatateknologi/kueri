package query

import (
	"testing"
)

func TestAnalyzeQueryFilterEligibility_SimpleSelect(t *testing.T) {
	eligibility := AnalyzeQueryFilterEligibility("SELECT id, name FROM users", []string{"id", "name"})
	if !eligibility.Enabled {
		t.Fatalf("expected enabled, got reason %q", eligibility.Reason)
	}
	if eligibility.Strategy != FilterStrategyServerWrapper {
		t.Fatalf("strategy = %q", eligibility.Strategy)
	}
}

func TestAnalyzeQueryFilterEligibility_TrailingSemicolon(t *testing.T) {
	eligibility := AnalyzeQueryFilterEligibility("SELECT id FROM users;", []string{"id"})
	if !eligibility.Enabled {
		t.Fatalf("expected enabled, got reason %q", eligibility.Reason)
	}
}

func TestAnalyzeQueryFilterEligibility_DuplicateColumns(t *testing.T) {
	eligibility := AnalyzeQueryFilterEligibility("SELECT id, id FROM users", []string{"id", "id"})
	if eligibility.Enabled {
		t.Fatal("expected duplicate columns to disable filtering")
	}
}

func TestAnalyzeQueryFilterEligibility_NonSelect(t *testing.T) {
	eligibility := AnalyzeQueryFilterEligibility("INSERT INTO users VALUES (1)", nil)
	if eligibility.Enabled {
		t.Fatal("expected insert to disable filtering")
	}
}

func TestAnalyzeQueryFilterEligibility_MultipleStatements(t *testing.T) {
	eligibility := AnalyzeQueryFilterEligibility("SELECT 1; SELECT 2", nil)
	if eligibility.Enabled {
		t.Fatal("expected multiple statements to disable filtering")
	}
}

func TestAnalyzeQueryFilterEligibility_Union(t *testing.T) {
	eligibility := AnalyzeQueryFilterEligibility("SELECT * FROM users UNION SELECT * FROM archived_users", nil)
	if eligibility.Enabled {
		t.Fatal("expected union to disable filtering")
	}
}

func TestAnalyzeQueryFilterEligibility_GroupBy(t *testing.T) {
	eligibility := AnalyzeQueryFilterEligibility("SELECT status, COUNT(*) FROM users GROUP BY status", nil)
	if eligibility.Enabled {
		t.Fatal("expected group by to disable filtering")
	}
}

func TestAnalyzeQueryFilterEligibility_WithCTE(t *testing.T) {
	eligibility := AnalyzeQueryFilterEligibility("WITH active AS (SELECT * FROM users) SELECT * FROM active", nil)
	if eligibility.Enabled {
		t.Fatal("expected CTE to disable filtering")
	}
}

func TestAnalyzeQueryFilterEligibility_Aggregate(t *testing.T) {
	eligibility := AnalyzeQueryFilterEligibility("SELECT COUNT(*) FROM users", nil)
	if eligibility.Enabled {
		t.Fatal("expected aggregate to disable filtering")
	}
}
