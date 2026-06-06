package query

import (
	"fmt"
	"regexp"
	"strings"
)

const DefaultQueryLimit = 20

var (
	reLeadingRead   = regexp.MustCompile(`(?is)^\s*(with\b|select\b)`)
	reTrailingLimit = regexp.MustCompile(`(?is)\blimit\s+(\d+)(?:\s+offset\s+(\d+))?\s*$`)
)

// IsReadQuery reports whether sql is a read-only SELECT (including WITH ... SELECT).
func IsReadQuery(sql string) bool {
	cleaned := trimStatement(sql)
	return reLeadingRead.MatchString(cleaned)
}

// HasExplicitLimit reports whether sql ends with a top-level LIMIT clause outside comments and literals.
func HasExplicitLimit(sql string) bool {
	normalized := stripSQLCommentsAndLiterals(trimStatement(sql))
	return reTrailingLimit.MatchString(strings.TrimSpace(normalized))
}

// PreparePaginatedSQL wraps read queries for LIMIT/OFFSET pagination without modifying the
// user's visible SQL. Mutation statements are returned unchanged.
func PreparePaginatedSQL(sql string, limit, offset int) (paginatedSQL string, isReadQuery bool, autoLimitApplied bool) {
	trimmed := trimStatement(sql)
	if !IsReadQuery(trimmed) {
		return trimmed, false, false
	}

	autoLimitApplied = !HasExplicitLimit(trimmed)
	paginatedSQL = fmt.Sprintf(
		"SELECT * FROM (\n%s\n) AS _kueri_paged LIMIT %d OFFSET %d",
		trimmed,
		limit,
		offset,
	)
	return paginatedSQL, true, autoLimitApplied
}

func trimStatement(sql string) string {
	cleaned := strings.TrimSpace(sql)
	cleaned = strings.TrimSuffix(cleaned, ";")
	return strings.TrimSpace(cleaned)
}

// stripSQLCommentsAndLiterals removes comments and replaces string literals so keyword
// detection ignores LIMIT inside comments or quoted text.
func stripSQLCommentsAndLiterals(sql string) string {
	var b strings.Builder
	b.Grow(len(sql))

	i := 0
	for i < len(sql) {
		switch {
		case sql[i] == '-' && i+1 < len(sql) && sql[i+1] == '-':
			for i < len(sql) && sql[i] != '\n' {
				b.WriteByte(' ')
				i++
			}
		case sql[i] == '/' && i+1 < len(sql) && sql[i+1] == '*':
			i += 2
			for i < len(sql) {
				if sql[i] == '*' && i+1 < len(sql) && sql[i+1] == '/' {
					b.WriteByte(' ')
					b.WriteByte(' ')
					i += 2
					break
				}
				b.WriteByte(' ')
				i++
			}
		case sql[i] == '\'':
			b.WriteByte(' ')
			i++
			for i < len(sql) {
				if sql[i] == '\'' {
					if i+1 < len(sql) && sql[i+1] == '\'' {
						i += 2
						continue
					}
					b.WriteByte(' ')
					i++
					break
				}
				if sql[i] == '\\' && i+1 < len(sql) {
					i += 2
					continue
				}
				i++
			}
		case sql[i] == '"':
			b.WriteByte(' ')
			i++
			for i < len(sql) {
				if sql[i] == '"' {
					if i+1 < len(sql) && sql[i+1] == '"' {
						i += 2
						continue
					}
					b.WriteByte(' ')
					i++
					break
				}
				i++
			}
		default:
			b.WriteByte(sql[i])
			i++
		}
	}

	return b.String()
}
