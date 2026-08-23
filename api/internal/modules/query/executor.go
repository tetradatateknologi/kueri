package query

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/database"
	"github.com/tetradatateknologi/kueri/api/internal/secrets"
)

const (
	queryTimeout = 30 * time.Second
	maxRows      = 10_000
)

type Executor struct {
	q   *sqlc.Queries
	box *secrets.Box
}

func NewExecutor(pool *pgxpool.Pool, box *secrets.Box) *Executor {
	return &Executor{q: sqlc.New(pool), box: box}
}

func (e *Executor) Execute(
	ctx context.Context,
	userID int64,
	connectionID int64,
	sql string,
	limit, offset int,
	filters []ColumnFilter,
) (ExecuteResult, error) {
	if HasMultipleStatements(sql) {
		return ExecuteResult{}, ErrMultipleStatements
	}

	conn, err := e.q.GetConnectionForUser(ctx, sqlc.GetConnectionForUserParams{
		ID:     connectionID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ExecuteResult{}, ErrConnectionNotFound
		}
		return ExecuteResult{}, err
	}

	password := ""
	if conn.PasswordEncrypted != nil && *conn.PasswordEncrypted != "" {
		password, err = e.box.Decrypt(*conn.PasswordEncrypted)
		if err != nil {
			return ExecuteResult{}, fmt.Errorf("decrypt connection password: %w", err)
		}
	}

	start := time.Now()
	execCtx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	driver := string(conn.Driver)
	eligibility := AnalyzeQueryFilterEligibility(sql, nil)
	filterableColumns := eligibility.FilterableColumns

	if len(filters) > 0 {
		if !eligibility.Enabled {
			return ExecuteResult{}, fmt.Errorf("%w: %s", ErrInvalidFilter, eligibility.Reason)
		}
	}

	execSQL, args, isReadQuery, autoLimitApplied, err := PrepareFilteredPaginatedSQL(
		sql,
		driver,
		filters,
		filterableColumns,
		limit+1,
		offset,
	)
	if err != nil {
		return ExecuteResult{}, fmt.Errorf("%w: %s", ErrInvalidFilter, err.Error())
	}

	fetchLimit := limit + 1
	execSQLFinal := sql
	queryArgs := args
	if isReadQuery {
		execSQLFinal = execSQL
	} else {
		fetchLimit = maxRows
	}

	switch conn.Driver {
	case sqlc.ConnectionDriverPostgres:
		result, err := e.executePostgres(
			execCtx,
			conn,
			password,
			execSQLFinal,
			queryArgs,
			sql,
			limit,
			offset,
			fetchLimit,
			isReadQuery,
			autoLimitApplied,
			filters,
		)
		if err != nil {
			return ExecuteResult{}, err
		}
		result.DurationMs = time.Since(start).Milliseconds()
		return result, nil
	case sqlc.ConnectionDriverMysql:
		result, err := e.executeMySQL(
			execCtx,
			conn,
			password,
			execSQLFinal,
			queryArgs,
			sql,
			limit,
			offset,
			fetchLimit,
			isReadQuery,
			autoLimitApplied,
			filters,
		)
		if err != nil {
			return ExecuteResult{}, err
		}
		result.DurationMs = time.Since(start).Milliseconds()
		return result, nil
	default:
		return ExecuteResult{}, fmt.Errorf("unsupported driver: %s", conn.Driver)
	}
}

func (e *Executor) executePostgres(
	ctx context.Context,
	conn sqlc.Connection,
	password, sql string,
	args []interface{},
	originalSQL string,
	limit, offset, fetchLimit int,
	isReadQuery, autoLimitApplied bool,
	filters []ColumnFilter,
) (ExecuteResult, error) {
	dsn := database.PostgresDSN(conn, password)

	target, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return ExecuteResult{}, err
	}
	defer target.Close(context.Background())

	rows, err := target.Query(ctx, sql, args...)
	if err != nil {
		return ExecuteResult{}, err
	}
	defer rows.Close()

	fieldDesc := rows.FieldDescriptions()
	columnNames := make([]string, len(fieldDesc))
	for i, fd := range fieldDesc {
		columnNames[i] = string(fd.Name)
	}

	outRows := make([][]interface{}, 0)

	for rows.Next() {
		if len(outRows) >= fetchLimit {
			break
		}
		values, err := rows.Values()
		if err != nil {
			return ExecuteResult{}, err
		}
		outRows = append(outRows, values)
	}
	if err := rows.Err(); err != nil {
		return ExecuteResult{}, err
	}

	if len(outRows) == 0 && rows.CommandTag().RowsAffected() > 0 {
		columnNames = []string{"rows_affected"}
		outRows = [][]interface{}{{rows.CommandTag().RowsAffected()}}
	}

	return finalizeExecuteResult(
		columnNames,
		outRows,
		originalSQL,
		limit,
		offset,
		isReadQuery,
		autoLimitApplied,
		filters,
	), nil
}

func (e *Executor) executeMySQL(
	ctx context.Context,
	conn sqlc.Connection,
	password, sql string,
	args []interface{},
	originalSQL string,
	limit, offset, fetchLimit int,
	isReadQuery, autoLimitApplied bool,
	filters []ColumnFilter,
) (ExecuteResult, error) {
	db, err := database.OpenMySQL(conn, password)
	if err != nil {
		return ExecuteResult{}, err
	}
	defer db.Close()

	rows, err := db.QueryContext(ctx, sql, args...)
	if err != nil {
		return ExecuteResult{}, err
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return ExecuteResult{}, err
	}

	outRows := make([][]interface{}, 0)

	for rows.Next() {
		if len(outRows) >= fetchLimit {
			break
		}
		scanTargets := make([]interface{}, len(cols))
		dest := make([]interface{}, len(cols))
		for i := range dest {
			scanTargets[i] = &dest[i]
		}
		if err := rows.Scan(scanTargets...); err != nil {
			return ExecuteResult{}, err
		}
		values := make([]interface{}, len(cols))
		for i, v := range dest {
			if b, ok := v.([]byte); ok {
				values[i] = string(b)
			} else {
				values[i] = v
			}
		}
		outRows = append(outRows, values)
	}
	if err := rows.Err(); err != nil {
		return ExecuteResult{}, err
	}

	return finalizeExecuteResult(
		cols,
		outRows,
		originalSQL,
		limit,
		offset,
		isReadQuery,
		autoLimitApplied,
		filters,
	), nil
}

func finalizeExecuteResult(
	columnNames []string,
	rows [][]interface{},
	originalSQL string,
	limit, offset int,
	isReadQuery, autoLimitApplied bool,
	filters []ColumnFilter,
) ExecuteResult {
	hasMore := false
	if isReadQuery && len(rows) > limit {
		hasMore = true
		rows = rows[:limit]
	}

	eligibility := AnalyzeQueryFilterEligibility(originalSQL, columnNames)
	filtering := buildFilteringInfo(eligibility, filters)

	return ExecuteResult{
		Columns:          buildColumnInfo(columnNames, eligibility),
		Rows:             rows,
		RowCount:         len(rows),
		Cached:           false,
		Limit:            limit,
		Offset:           offset,
		HasMore:          hasMore,
		AutoLimitApplied: isReadQuery && autoLimitApplied,
		Filtering:        filtering,
	}
}

func buildFilteringInfo(eligibility QueryFilterEligibility, filters []ColumnFilter) FilteringInfo {
	if !eligibility.Enabled {
		reason := eligibility.Reason
		if reason == "" {
			reason = "Column filters are unavailable for this query."
		}
		return FilteringInfo{
			Enabled: false,
			Mode:    FilterModeNone,
			Reason:  &reason,
		}
	}

	applied := append([]ColumnFilter(nil), filters...)
	return FilteringInfo{
		Enabled:        true,
		Mode:           FilterModeServer,
		AppliedFilters: applied,
	}
}
