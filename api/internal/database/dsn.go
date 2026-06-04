package database

import (
	"fmt"
	"net/url"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

func PostgresDSN(c sqlc.Connection, password string) string {
	user := ""
	if c.Username != nil {
		user = *c.Username
	}
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(user, password),
		Host:   fmt.Sprintf("%s:%d", c.Host, c.Port),
		Path:   c.DatabaseName,
	}
	q := u.Query()
	q.Set("sslmode", c.SslMode)
	u.RawQuery = q.Encode()
	return u.String()
}
