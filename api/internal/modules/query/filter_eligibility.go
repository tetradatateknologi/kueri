package query

import (
	"regexp"
	"strings"
)

const (
	FilterStrategyServerWrapper = "server-wrapper"
	FilterStrategyNone          = "none"
	FilterModeServer              = "server"
	FilterModeNone                = "none"
)

var (
	reLeadingSelect = regexp.MustCompile(`(?is)^\s*select\b`)
	reUnion         = regexp.MustCompile(`(?is)\b(union|intersect|except)\b`)
	reGroupBy       = regexp.MustCompile(`(?is)\bgroup\s+by\b`)
	reHaving        = regexp.MustCompile(`(?is)\bhaving\b`)
	reWindow        = regexp.MustCompile(`(?is)\bover\s*\(`)
	reAggregate     = regexp.MustCompile(`(?is)\b(count|sum|avg|min|max)\s*\(`)
)

// QueryFilterEligibility describes whether UI column filtering is safe for a query.
type QueryFilterEligibility struct {
	Enabled           bool
	Reason            string
	Strategy          string
	FilterableColumns []string
}

// IsSimpleSelectQuery reports whether sql is a plain SELECT (not WITH ... SELECT).
func IsSimpleSelectQuery(sql string) bool {
	cleaned := trimStatement(sql)
	return reLeadingSelect.MatchString(cleaned)
}

// HasMultipleStatements reports whether sql contains more than one statement.
func HasMultipleStatements(sql string) bool {
	normalized := stripSQLCommentsAndLiterals(trimStatement(sql))
	return strings.Contains(normalized, ";")
}

// AnalyzeQueryFilterEligibility decides if server-side column filtering is safe.
// resultColumns may be empty on pre-execution checks; column-specific rules run when provided.
func AnalyzeQueryFilterEligibility(sql string, resultColumns []string) QueryFilterEligibility {
	disabled := func(reason string) QueryFilterEligibility {
		return QueryFilterEligibility{
			Enabled:  false,
			Reason:   reason,
			Strategy: FilterStrategyNone,
		}
	}

	if !IsReadQuery(sql) {
		return disabled("Only SELECT queries support column filtering.")
	}
	if !IsSimpleSelectQuery(sql) {
		return disabled("Query is too complex for UI column filtering.")
	}
	if HasMultipleStatements(sql) {
		return disabled("Multiple SQL statements are not supported for column filtering.")
	}

	normalized := stripSQLCommentsAndLiterals(trimStatement(sql))
	if reUnion.MatchString(normalized) {
		return disabled("UNION, INTERSECT, and EXCEPT queries cannot be filtered from the UI.")
	}
	if reGroupBy.MatchString(normalized) {
		return disabled("GROUP BY queries cannot be filtered from the UI.")
	}
	if reHaving.MatchString(normalized) {
		return disabled("HAVING clauses cannot be combined with UI column filtering.")
	}
	if reWindow.MatchString(normalized) {
		return disabled("Window functions cannot be filtered safely from the UI.")
	}
	if reAggregate.MatchString(normalized) {
		return disabled("Aggregate queries cannot be filtered from the UI.")
	}

	if len(resultColumns) > 0 {
		if hasDuplicateColumns(resultColumns) {
			return disabled("Duplicate column names found. Use unique column aliases to enable filtering.")
		}
		if hasUnnamedColumns(resultColumns) {
			return disabled("Unnamed result columns cannot be filtered from the UI.")
		}
	}

	filterable := append([]string(nil), resultColumns...)
	return QueryFilterEligibility{
		Enabled:           true,
		Strategy:          FilterStrategyServerWrapper,
		FilterableColumns: filterable,
	}
}

func hasDuplicateColumns(columns []string) bool {
	seen := make(map[string]struct{}, len(columns))
	for _, col := range columns {
		key := strings.ToLower(strings.TrimSpace(col))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			return true
		}
		seen[key] = struct{}{}
	}
	return false
}

func hasUnnamedColumns(columns []string) bool {
	for _, col := range columns {
		if strings.TrimSpace(col) == "" {
			return true
		}
	}
	return false
}

func buildColumnInfo(columns []string, eligibility QueryFilterEligibility) []ColumnInfo {
	filterable := make(map[string]struct{}, len(eligibility.FilterableColumns))
	for _, col := range eligibility.FilterableColumns {
		filterable[strings.ToLower(col)] = struct{}{}
	}

	out := make([]ColumnInfo, len(columns))
	for i, col := range columns {
		_, ok := filterable[strings.ToLower(col)]
		out[i] = ColumnInfo{
			Name:       col,
			Filterable: eligibility.Enabled && ok,
		}
	}
	return out
}
