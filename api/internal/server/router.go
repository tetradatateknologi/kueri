package server

import (
	"io/fs"
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	"github.com/tetradatateknologi/kueri/api/internal/config"
	"github.com/tetradatateknologi/kueri/api/internal/http/middleware"
	"github.com/tetradatateknologi/kueri/api/internal/modules/backup"
	"github.com/tetradatateknologi/kueri/api/internal/modules/health"
	"github.com/tetradatateknologi/kueri/api/internal/modules/me"
	"github.com/tetradatateknologi/kueri/api/internal/modules/query"
	"github.com/tetradatateknologi/kueri/api/internal/modules/schema"
	"github.com/tetradatateknologi/kueri/api/internal/modules/script"
	"github.com/tetradatateknologi/kueri/api/internal/modules/update"
	"github.com/tetradatateknologi/kueri/api/internal/modules/workspace"
)

type Options struct {
	StaticFS   fs.FS
	UpdateOpts *update.Options
}

func NewRouter(cfg *config.Config, pool *pgxpool.Pool, opts Options) *echo.Echo {
	e := echo.New()
	e.HideBanner = true

	e.Use(echomw.Recover())
	e.Use(middleware.CORS(cfg.CORS.AllowedOrigins))

	health.RegisterRoutes(e, pool)
	query.RegisterRoutes(e, pool, cfg)

	api := e.Group("/api/v1")
	api.Use(middleware.DevUser(pool, cfg.Dev.UserEmail))
	me.RegisterRoutes(api)
	workspace.RegisterRoutes(api, pool, cfg)
	script.RegisterRoutes(api, pool)
	schema.RegisterRoutes(api, pool, cfg)
	backup.RegisterRoutes(api, pool, cfg)

	if opts.UpdateOpts != nil {
		update.RegisterRoutes(api, *opts.UpdateOpts)
	}

	if opts.StaticFS != nil {
		registerSPA(e, opts.StaticFS)
	}

	return e
}

func registerSPA(e *echo.Echo, staticFS fs.FS) {
	sub, err := fs.Sub(staticFS, ".")
	if err != nil {
		sub = staticFS
	}

	serve := func(c echo.Context) error {
		reqPath := strings.TrimPrefix(c.Request().URL.Path, "/")
		if reqPath == "" {
			reqPath = "index.html"
		} else if _, err := fs.Stat(sub, reqPath); err != nil {
			reqPath = "index.html"
		}

		data, err := fs.ReadFile(sub, reqPath)
		if err != nil {
			return echo.NotFoundHandler(c)
		}

		contentType := mime.TypeByExtension(filepath.Ext(reqPath))
		if contentType == "" {
			contentType = http.DetectContentType(data)
		}
		return c.Blob(http.StatusOK, contentType, data)
	}

	e.GET("/", serve)
	e.GET("/*", serve)
}
