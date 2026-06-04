package middleware

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	apphttp "github.com/tetradatateknologi/kueri/api/internal/http"
	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

type contextKey string

const userContextKey contextKey = "kueri_user"

func DevUser(pool *pgxpool.Pool, email string) echo.MiddlewareFunc {
	q := sqlc.New(pool)
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user, err := q.GetUserByEmail(c.Request().Context(), email)
			if err != nil {
				return apphttp.NotFound(c, "Dev user not found; run make seed")
			}
			ctx := context.WithValue(c.Request().Context(), userContextKey, user)
			c.SetRequest(c.Request().WithContext(ctx))
			return next(c)
		}
	}
}

func UserFromContext(ctx context.Context) (sqlc.User, bool) {
	u, ok := ctx.Value(userContextKey).(sqlc.User)
	return u, ok
}
