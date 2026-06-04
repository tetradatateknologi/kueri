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

func (e *Executor) Execute(ctx context.Context, userID int64, connectionID int64, sql string) (ExecuteResult, error) {
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

	dsn := database.PostgresDSN(conn, password)
	start := time.Now()

	execCtx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	target, err := pgx.Connect(execCtx, dsn)
	if err != nil {
		return ExecuteResult{}, err
	}
	defer target.Close(context.Background())

	rows, err := target.Query(execCtx, sql)
	if err != nil {
		return ExecuteResult{}, err
	}
	defer rows.Close()

	fieldDesc := rows.FieldDescriptions()
	columns := make([]string, len(fieldDesc))
	for i, fd := range fieldDesc {
		columns[i] = string(fd.Name)
	}

	outRows := make([][]interface{}, 0)
	rowCount := 0

	for rows.Next() {
		if rowCount >= maxRows {
			break
		}
		values, err := rows.Values()
		if err != nil {
			return ExecuteResult{}, err
		}
		outRows = append(outRows, values)
		rowCount++
	}
	if err := rows.Err(); err != nil {
		return ExecuteResult{}, err
	}

	if rowCount == 0 && rows.CommandTag().RowsAffected() > 0 {
		columns = []string{"rows_affected"}
		outRows = [][]interface{}{{rows.CommandTag().RowsAffected()}}
		rowCount = 1
	}

	return ExecuteResult{
		Columns:    columns,
		Rows:       outRows,
		RowCount:   rowCount,
		DurationMs: time.Since(start).Milliseconds(),
		Cached:     false,
	}, nil
}
