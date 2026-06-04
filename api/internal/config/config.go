package config

import (
	"encoding/base64"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	App        AppConfig
	DB         DBConfig
	Dev        DevConfig
	CORS       CORSConfig
	Encryption EncryptionConfig
}

type EncryptionConfig struct {
	Key []byte
}

type DevConfig struct {
	UserEmail string
}

type AppConfig struct {
	Env  string
	Port int
	Name string
}

type CORSConfig struct {
	AllowedOrigins []string
}

type DBConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	SSLMode  string
	MaxConns int32
	MinConns int32
}

func (d DBConfig) DSN() string {
	return "postgres://" + d.User + ":" + d.Password +
		"@" + d.Host + ":" + strconv.Itoa(d.Port) +
		"/" + d.Name + "?sslmode=" + d.SSLMode
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		App: AppConfig{
			Env:  "development",
			Port: 8080,
			Name: "kueri-api",
		},
		DB: DBConfig{
			Host: "localhost", Port: 5433, User: "kueri", Password: "kueri_secret",
			Name: "kueri", SSLMode: "disable", MaxConns: 25, MinConns: 5,
		},
		Dev: DevConfig{UserEmail: "dev@kueri.local"},
		CORS: CORSConfig{
			AllowedOrigins: []string{
				"http://localhost:5173",
				"http://localhost:3000",
			},
		},
	}

	if v := strings.TrimSpace(os.Getenv("APP_ENV")); v != "" {
		cfg.App.Env = v
	}
	if v := strings.TrimSpace(os.Getenv("APP_NAME")); v != "" {
		cfg.App.Name = v
	}
	if v := strings.TrimSpace(os.Getenv("APP_PORT")); v != "" {
		if port, err := strconv.Atoi(v); err == nil && port > 0 {
			cfg.App.Port = port
		}
	}
	if v := strings.TrimSpace(os.Getenv("DB_HOST")); v != "" {
		cfg.DB.Host = v
	}
	if v := strings.TrimSpace(os.Getenv("DB_PORT")); v != "" {
		if port, err := strconv.Atoi(v); err == nil && port > 0 {
			cfg.DB.Port = port
		}
	}
	if v := strings.TrimSpace(os.Getenv("DB_USER")); v != "" {
		cfg.DB.User = v
	}
	if v := strings.TrimSpace(os.Getenv("DB_PASSWORD")); v != "" {
		cfg.DB.Password = v
	}
	if v := strings.TrimSpace(os.Getenv("DB_NAME")); v != "" {
		cfg.DB.Name = v
	}
	if v := strings.TrimSpace(os.Getenv("DB_SSLMODE")); v != "" {
		cfg.DB.SSLMode = v
	}
	if v := strings.TrimSpace(os.Getenv("DB_MAX_CONNS")); v != "" {
		if n, err := strconv.ParseInt(v, 10, 32); err == nil && n > 0 {
			cfg.DB.MaxConns = int32(n)
		}
	}
	if v := strings.TrimSpace(os.Getenv("DB_MIN_CONNS")); v != "" {
		if n, err := strconv.ParseInt(v, 10, 32); err == nil && n > 0 {
			cfg.DB.MinConns = int32(n)
		}
	}
	if v := strings.TrimSpace(os.Getenv("DEV_USER_EMAIL")); v != "" {
		cfg.Dev.UserEmail = v
	}
	if v := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS")); v != "" {
		parts := strings.Split(v, ",")
		origins := make([]string, 0, len(parts))
		for _, part := range parts {
			origin := strings.TrimSpace(part)
			if origin != "" {
				origins = append(origins, origin)
			}
		}
		if len(origins) > 0 {
			cfg.CORS.AllowedOrigins = origins
		}
	}

	key, err := loadEncryptionKey(cfg.App.Env)
	if err != nil {
		return nil, err
	}
	cfg.Encryption.Key = key

	return cfg, nil
}

func loadEncryptionKey(appEnv string) ([]byte, error) {
	raw := strings.TrimSpace(os.Getenv("APP_ENCRYPTION_KEY"))
	if raw == "" {
		if appEnv == "development" {
			// Fixed dev key so local seed + connections work without extra setup.
			return []byte("kueri-dev-encryption-key-32b!!!!"), nil
		}
		return nil, fmt.Errorf("APP_ENCRYPTION_KEY is required (32-byte value, base64 or raw)")
	}
	if decoded, err := base64.StdEncoding.DecodeString(raw); err == nil && len(decoded) == 32 {
		return decoded, nil
	}
	if len(raw) == 32 {
		return []byte(raw), nil
	}
	return nil, fmt.Errorf("APP_ENCRYPTION_KEY must be 32 bytes (raw) or base64-encoded 32 bytes")
}
