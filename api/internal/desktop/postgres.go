package desktop

import (
	"fmt"
	"log/slog"

	embeddedpostgres "github.com/fergusstrange/embedded-postgres"
)

type Postgres struct {
	db       *embeddedpostgres.EmbeddedPostgres
	port     uint32
	username string
	password string
	database string
}

type PostgresConfig struct {
	DataPath string
	Port     uint32
	Username string
	Password string
	Database string
}

func DefaultPostgresConfig(dataPath string) PostgresConfig {
	return PostgresConfig{
		DataPath: dataPath,
		Port:     15432,
		Username: "kueri",
		Password: "kueri_secret",
		Database: "kueri",
	}
}

func StartPostgres(cfg PostgresConfig) (*Postgres, error) {
	if err := ensureDir(cfg.DataPath); err != nil {
		return nil, err
	}

	db := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().
		Username(cfg.Username).
		Password(cfg.Password).
		Database(cfg.Database).
		Version(embeddedpostgres.V16).
		Port(cfg.Port).
		DataPath(cfg.DataPath).
		Logger(nil))

	if err := db.Start(); err != nil {
		return nil, fmt.Errorf("start embedded postgres: %w", err)
	}

	slog.Info("embedded postgres started",
		"port", cfg.Port,
		"data_path", cfg.DataPath,
	)

	return &Postgres{
		db:       db,
		port:     cfg.Port,
		username: cfg.Username,
		password: cfg.Password,
		database: cfg.Database,
	}, nil
}

func (p *Postgres) Stop() error {
	if p == nil || p.db == nil {
		return nil
	}
	slog.Info("stopping embedded postgres")
	return p.db.Stop()
}

func (p *Postgres) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@127.0.0.1:%d/%s?sslmode=disable",
		p.username, p.password, p.port, p.database,
	)
}

func ensureDir(path string) error {
	if err := mkdirAll(path, 0o700); err != nil {
		return fmt.Errorf("create postgres data dir: %w", err)
	}
	return nil
}
