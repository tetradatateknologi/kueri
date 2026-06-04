package database

import (
	"database/sql"

	_ "github.com/go-sql-driver/mysql"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

func OpenMySQL(c sqlc.Connection, password string) (*sql.DB, error) {
	return sql.Open("mysql", MySQLDSN(c, password))
}
