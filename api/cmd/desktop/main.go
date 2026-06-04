package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/tetradatateknologi/kueri/api/internal/config"
	"github.com/tetradatateknologi/kueri/api/internal/desktop"
	"github.com/tetradatateknologi/kueri/api/internal/logger"
	"github.com/tetradatateknologi/kueri/api/internal/modules/update"
	"github.com/tetradatateknologi/kueri/api/internal/persistence"
	"github.com/tetradatateknologi/kueri/api/internal/server"
	"github.com/tetradatateknologi/kueri/api/internal/version"
)

func main() {
	cfg, dataDir, pg, err := bootstrap()
	if err != nil {
		slog.Error("desktop bootstrap failed", "error", err)
		os.Exit(1)
	}
	defer pg.Stop()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := persistence.NewPool(ctx, cfg.DB)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	staticFS, err := desktop.WebAssets()
	if err != nil {
		slog.Error("embedded web assets missing", "error", err)
		os.Exit(1)
	}

	updateOpts := &update.Options{
		CurrentVersion: version.Version,
	}
	if manifest := strings.TrimSpace(os.Getenv("KUERI_UPDATE_MANIFEST_URL")); manifest != "" {
		updateOpts.ManifestURL = manifest
	}

	e := server.NewRouter(cfg, pool, server.Options{
		StaticFS:   staticFS,
		UpdateOpts: updateOpts,
	})

	addr := fmt.Sprintf("127.0.0.1:%d", cfg.App.Port)
	appURL := "http://" + addr

	go func() {
		slog.Info("starting desktop server", "url", appURL, "version", version.Version, "data_dir", dataDir)
		if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	if !parseBool(os.Getenv("KUERI_NO_BROWSER"), false) {
		time.Sleep(300 * time.Millisecond)
		if err := desktop.OpenBrowser(appURL); err != nil {
			slog.Warn("could not open browser", "error", err, "url", appURL)
		}
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down desktop...")
	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 10*time.Second)
	defer shutdownCancel()

	if err := e.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}
	slog.Info("desktop stopped")
}

func bootstrap() (*config.Config, string, *desktop.Postgres, error) {
	desktopCfg, dataDir, err := desktop.LoadOrCreateConfig()
	if err != nil {
		return nil, "", nil, err
	}

	pgCfg := desktop.DefaultPostgresConfig(desktop.PostgresDataDir(dataDir))
	if portEnv := strings.TrimSpace(os.Getenv("KUERI_DB_PORT")); portEnv != "" {
		if port, err := strconv.ParseUint(portEnv, 10, 32); err == nil {
			pgCfg.Port = uint32(port)
		}
	}

	pg, err := desktop.StartPostgres(pgCfg)
	if err != nil {
		return nil, "", nil, err
	}

	if err := desktop.RunMigrations(pg.DSN()); err != nil {
		pg.Stop()
		return nil, "", nil, err
	}

	os.Setenv("APP_ENV", "desktop")
	os.Setenv("APP_PORT", envOrDefault("APP_PORT", "8765"))
	os.Setenv("DB_HOST", "127.0.0.1")
	os.Setenv("DB_PORT", strconv.FormatUint(uint64(pgCfg.Port), 10))
	os.Setenv("DB_USER", pgCfg.Username)
	os.Setenv("DB_PASSWORD", pgCfg.Password)
	os.Setenv("DB_NAME", pgCfg.Database)
	os.Setenv("DB_SSLMODE", "disable")
	os.Setenv("APP_ENCRYPTION_KEY", desktopCfg.EncryptionKey)
	os.Setenv("CORS_ALLOWED_ORIGINS", "http://127.0.0.1:"+os.Getenv("APP_PORT"))

	cfg, err := config.Load()
	if err != nil {
		pg.Stop()
		return nil, "", nil, err
	}

	logger.Setup(cfg.App.Env)
	return cfg, dataDir, pg, nil
}

func envOrDefault(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func parseBool(raw string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}
