// Dev database seed. Run from api/: make seed
package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/tetradatateknologi/kueri/api/internal/config"
	"github.com/tetradatateknologi/kueri/api/internal/persistence"
	"github.com/tetradatateknologi/kueri/api/internal/seed"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("config", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := persistence.NewPool(ctx, cfg.DB)
	if err != nil {
		slog.Error("database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := seed.EnsureDevData(ctx, pool, cfg); err != nil {
		slog.Error("seed", "error", err)
		os.Exit(1)
	}
}
