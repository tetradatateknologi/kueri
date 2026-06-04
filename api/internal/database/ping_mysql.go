package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

func PingMySQL(ctx context.Context, c sqlc.Connection, password string) error {
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	db, err := sql.Open("mysql", MySQLDSN(c, password))
	if err != nil {
		return err
	}
	defer db.Close()

	if err := db.PingContext(pingCtx); err != nil {
		return err
	}
	return nil
}

func PingConnection(ctx context.Context, c sqlc.Connection, password string) error {
	switch c.Driver {
	case sqlc.ConnectionDriverPostgres:
		return PingDSN(ctx, PostgresDSN(c, password))
	case sqlc.ConnectionDriverMysql:
		return PingMySQL(ctx, c, password)
	default:
		return fmt.Errorf("unsupported driver: %s", c.Driver)
	}
}
