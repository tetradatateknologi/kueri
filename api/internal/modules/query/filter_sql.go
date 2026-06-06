package query

import (
	"fmt"
	"strings"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

// PrepareFilteredPaginatedSQL wraps eligible read queries with optional column filters.
// Filter values are returned as args for parameterized execution.
func PrepareFilteredPaginatedSQL(
	sql string,
	driver string,
	filters []ColumnFilter,
	filterableColumns []string,
	limit, offset int,
) (execSQL string, args []interface{}, isReadQuery bool, autoLimitApplied bool, err error) {
	trimmed := trimStatement(sql)
	if !IsReadQuery(trimmed) {
		return trimmed, nil, false, false, nil
	}

	isReadQuery = true
	autoLimitApplied = !HasExplicitLimit(trimmed)

	if len(filters) == 0 {
		execSQL = fmt.Sprintf(
			"SELECT * FROM (\n%s\n) AS _kueri_paged LIMIT %d OFFSET %d",
			trimmed,
			limit,
			offset,
		)
		return execSQL, nil, isReadQuery, autoLimitApplied, nil
	}

	filterable := make(map[string]string, len(filterableColumns))
	for _, col := range filterableColumns {
		filterable[strings.ToLower(col)] = col
	}

	whereParts := make([]string, 0, len(filters))
	args = make([]interface{}, 0, len(filters))

	for _, filter := range filters {
		actualCol := filter.Column
		if len(filterableColumns) > 0 {
			mapped, ok := filterable[strings.ToLower(filter.Column)]
			if !ok {
				return "", nil, false, false, fmt.Errorf("unknown filter column: %s", filter.Column)
			}
			actualCol = mapped
		}

		quoted, err := quoteResultColumn(actualCol, driver)
		if err != nil {
			return "", nil, false, false, err
		}

		clause, clauseArgs, err := buildFilterClause(quoted, driver, filter, len(args))
		if err != nil {
			return "", nil, false, false, err
		}
		whereParts = append(whereParts, clause)
		args = append(args, clauseArgs...)
	}

	whereSQL := ""
	if len(whereParts) > 0 {
		whereSQL = "\nWHERE " + strings.Join(whereParts, "\n  AND ")
	}

	execSQL = fmt.Sprintf(
		"SELECT * FROM (\n%s\n) AS _kueri_filtered%s\nLIMIT %d OFFSET %d",
		trimmed,
		whereSQL,
		limit,
		offset,
	)
	return execSQL, args, isReadQuery, autoLimitApplied, nil
}

func buildFilterClause(
	quotedCol, driver string,
	filter ColumnFilter,
	argOffset int,
) (string, []interface{}, error) {
	switch filter.Operator {
	case FilterOperatorContains:
		if filter.Value == nil || strings.TrimSpace(*filter.Value) == "" {
			return "", nil, fmt.Errorf("filter value is required for column %s", filter.Column)
		}
		pattern := "%" + escapeLikePattern(*filter.Value) + "%"
		return likeClause(quotedCol, driver, argOffset), []interface{}{pattern}, nil
	case FilterOperatorEquals:
		if filter.Value == nil {
			return "", nil, fmt.Errorf("filter value is required for column %s", filter.Column)
		}
		return equalsClause(quotedCol, driver, argOffset), []interface{}{*filter.Value}, nil
	case FilterOperatorIsNull:
		return fmt.Sprintf("%s IS NULL", quotedCol), nil, nil
	case FilterOperatorIsNotNull:
		return fmt.Sprintf("%s IS NOT NULL", quotedCol), nil, nil
	default:
		return "", nil, fmt.Errorf("unsupported filter operator: %s", filter.Operator)
	}
}

func likeClause(quotedCol, driver string, argOffset int) string {
	switch sqlc.ConnectionDriver(driver) {
	case sqlc.ConnectionDriverPostgres:
		return fmt.Sprintf("CAST(%s AS TEXT) ILIKE %s", quotedCol, postgresPlaceholder(argOffset+1))
	case sqlc.ConnectionDriverMysql:
		return fmt.Sprintf("CAST(%s AS CHAR) LIKE %s", quotedCol, mysqlPlaceholder())
	default:
		return fmt.Sprintf("CAST(%s AS TEXT) LIKE %s", quotedCol, mysqlPlaceholder())
	}
}

func equalsClause(quotedCol, driver string, argOffset int) string {
	switch sqlc.ConnectionDriver(driver) {
	case sqlc.ConnectionDriverPostgres:
		return fmt.Sprintf("CAST(%s AS TEXT) = %s", quotedCol, postgresPlaceholder(argOffset+1))
	case sqlc.ConnectionDriverMysql:
		return fmt.Sprintf("CAST(%s AS CHAR) = %s", quotedCol, mysqlPlaceholder())
	default:
		return fmt.Sprintf("CAST(%s AS TEXT) = %s", quotedCol, mysqlPlaceholder())
	}
}

func postgresPlaceholder(index int) string {
	return fmt.Sprintf("$%d", index)
}

func mysqlPlaceholder() string {
	return "?"
}

func quoteResultColumn(name, driver string) (string, error) {
	if strings.TrimSpace(name) == "" {
		return "", fmt.Errorf("invalid column name")
	}
	switch sqlc.ConnectionDriver(driver) {
	case sqlc.ConnectionDriverPostgres:
		return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`, nil
	case sqlc.ConnectionDriverMysql:
		return "`" + strings.ReplaceAll(name, "`", "``") + "`", nil
	default:
		return "", fmt.Errorf("unsupported driver: %s", driver)
	}
}

func escapeLikePattern(value string) string {
	var b strings.Builder
	b.Grow(len(value))
	for _, r := range value {
		switch r {
		case '%', '_', '\\':
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	return b.String()
}

func validateFilters(filters []ColumnFilter) error {
	for _, filter := range filters {
		if strings.TrimSpace(filter.Column) == "" {
			return fmt.Errorf("filter column is required")
		}
		switch filter.Operator {
		case FilterOperatorContains, FilterOperatorEquals:
			if filter.Value == nil || strings.TrimSpace(*filter.Value) == "" {
				return fmt.Errorf("filter value is required for column %s", filter.Column)
			}
		case FilterOperatorIsNull, FilterOperatorIsNotNull:
			// no value required
		default:
			return fmt.Errorf("unsupported filter operator: %s", filter.Operator)
		}
	}
	return nil
}
