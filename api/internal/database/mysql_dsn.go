package database

import (
	"fmt"

	"github.com/go-sql-driver/mysql"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

func MySQLDSN(c sqlc.Connection, password string) string {
	user := ""
	if c.Username != nil {
		user = *c.Username
	}
	cfg := mysql.Config{
		User:                 user,
		Passwd:               password,
		Net:                  "tcp",
		Addr:                 fmt.Sprintf("%s:%d", c.Host, c.Port),
		DBName:               c.DatabaseName,
		ParseTime:            true,
		AllowNativePasswords: true,
		TLSConfig:            mysqlTLSConfig(c.SslMode),
	}
	return cfg.FormatDSN()
}

func mysqlTLSConfig(sslMode string) string {
	switch sslMode {
	case "require", "verify-full":
		return "true"
	default:
		return "false"
	}
}
