package schema

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/secrets"
)

const schemaTimeout = 15 * time.Second

type Service struct {
	q   *sqlc.Queries
	box *secrets.Box
}

func NewService(pool *pgxpool.Pool, box *secrets.Box) *Service {
	return &Service{q: sqlc.New(pool), box: box}
}

func (s *Service) Overview(ctx context.Context, userID, connectionID int64) (OverviewResponse, error) {
	conn, password, err := s.loadConnection(ctx, userID, connectionID)
	if err != nil {
		return OverviewResponse{}, err
	}

	execCtx, cancel := context.WithTimeout(ctx, schemaTimeout)
	defer cancel()

	switch conn.Driver {
	case sqlc.ConnectionDriverPostgres:
		schemas, err := listPostgresOverview(execCtx, conn, password)
		if err != nil {
			return OverviewResponse{}, err
		}
		return OverviewResponse{Driver: string(conn.Driver), Schemas: schemas}, nil
	case sqlc.ConnectionDriverMysql:
		schemas, err := listMySQLOverview(execCtx, conn, password)
		if err != nil {
			return OverviewResponse{}, err
		}
		return OverviewResponse{Driver: string(conn.Driver), Schemas: schemas}, nil
	default:
		return OverviewResponse{}, fmt.Errorf("unsupported driver: %s", conn.Driver)
	}
}

func (s *Service) TableColumns(ctx context.Context, userID, connectionID int64, schemaName, tableName string) (ColumnsResponse, error) {
	conn, password, err := s.loadConnection(ctx, userID, connectionID)
	if err != nil {
		return ColumnsResponse{}, err
	}

	execCtx, cancel := context.WithTimeout(ctx, schemaTimeout)
	defer cancel()

	switch conn.Driver {
	case sqlc.ConnectionDriverPostgres:
		cols, err := listPostgresColumns(execCtx, conn, password, schemaName, tableName)
		if err != nil {
			return ColumnsResponse{}, err
		}
		return ColumnsResponse{Schema: schemaName, Table: tableName, Columns: cols}, nil
	case sqlc.ConnectionDriverMysql:
		cols, err := listMySQLColumns(execCtx, conn, password, schemaName, tableName)
		if err != nil {
			return ColumnsResponse{}, err
		}
		return ColumnsResponse{Schema: schemaName, Table: tableName, Columns: cols}, nil
	default:
		return ColumnsResponse{}, fmt.Errorf("unsupported driver: %s", conn.Driver)
	}
}

func (s *Service) loadConnection(ctx context.Context, userID, connectionID int64) (sqlc.Connection, string, error) {
	conn, err := s.q.GetConnectionForUser(ctx, sqlc.GetConnectionForUserParams{
		ID:     connectionID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return sqlc.Connection{}, "", ErrConnectionNotFound
		}
		return sqlc.Connection{}, "", err
	}

	password := ""
	if conn.PasswordEncrypted != nil && *conn.PasswordEncrypted != "" {
		password, err = s.box.Decrypt(*conn.PasswordEncrypted)
		if err != nil {
			return sqlc.Connection{}, "", fmt.Errorf("decrypt connection password: %w", err)
		}
	}

	return conn, password, nil
}
