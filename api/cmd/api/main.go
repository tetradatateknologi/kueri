package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/tetradatateknologi/kueri/api/internal/config"
	"github.com/tetradatateknologi/kueri/api/internal/logger"
	"github.com/tetradatateknologi/kueri/api/internal/modules/update"
	"github.com/tetradatateknologi/kueri/api/internal/persistence"
	"github.com/tetradatateknologi/kueri/api/internal/server"
	"github.com/tetradatateknologi/kueri/api/internal/version"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	logger.Setup(cfg.App.Env)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := persistence.NewPool(ctx, cfg.DB)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	e := server.NewRouter(cfg, pool, server.Options{
		UpdateOpts: &update.Options{CurrentVersion: version.Version},
	})

	go func() {
		addr := fmt.Sprintf(":%d", cfg.App.Port)
		slog.Info("starting server", "addr", addr, "env", cfg.App.Env, "name", cfg.App.Name)
		if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server...")
	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 10*time.Second)
	defer shutdownCancel()

	if err := e.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}
	slog.Info("server stopped")
}
