package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

func PingDSN(ctx context.Context, dsn string) error {
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	conn, err := pgx.Connect(pingCtx, dsn)
	if err != nil {
		return err
	}
	defer conn.Close(context.Background())

	return conn.Ping(pingCtx)
}
