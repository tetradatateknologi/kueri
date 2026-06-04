package desktop

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const configFileName = "config.json"

type Config struct {
	EncryptionKey string       `json:"encryption_key"`
	Updates       UpdateConfig `json:"updates"`
}

type UpdateConfig struct {
	Enabled     bool   `json:"enabled"`
	ManifestURL string `json:"manifest_url,omitempty"`
}

func DefaultUpdateConfig() UpdateConfig {
	return UpdateConfig{
		Enabled:     true,
		ManifestURL: "",
	}
}

func DataDir() (string, error) {
	if override := strings.TrimSpace(os.Getenv("KUERI_DATA_DIR")); override != "" {
		return filepath.Abs(override)
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve home dir: %w", err)
	}

	switch {
	case strings.EqualFold(os.Getenv("OS"), "Windows_NT") || filepath.Separator == '\\':
		return filepath.Join(home, "AppData", "Local", "kueri"), nil
	case os.Getenv("XDG_DATA_HOME") != "":
		return filepath.Join(os.Getenv("XDG_DATA_HOME"), "kueri"), nil
	default:
		return filepath.Join(home, ".kueri"), nil
	}
}

func LoadOrCreateConfig() (*Config, string, error) {
	dir, err := DataDir()
	if err != nil {
		return nil, "", err
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, "", fmt.Errorf("create data dir: %w", err)
	}

	path := filepath.Join(dir, configFileName)
	if data, err := os.ReadFile(path); err == nil {
		var cfg Config
		if err := json.Unmarshal(data, &cfg); err != nil {
			return nil, "", fmt.Errorf("parse config: %w", err)
		}
		if strings.TrimSpace(cfg.EncryptionKey) == "" {
			return nil, "", errors.New("config missing encryption_key")
		}
		if cfg.Updates == (UpdateConfig{}) {
			cfg.Updates = DefaultUpdateConfig()
		}
		return &cfg, dir, nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return nil, "", fmt.Errorf("read config: %w", err)
	}

	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return nil, "", fmt.Errorf("generate encryption key: %w", err)
	}

	cfg := &Config{
		EncryptionKey: base64.StdEncoding.EncodeToString(key),
		Updates:       DefaultUpdateConfig(),
	}
	if err := SaveConfig(path, cfg); err != nil {
		return nil, "", err
	}
	return cfg, dir, nil
}

func SaveConfig(path string, cfg *Config) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return fmt.Errorf("write config: %w", err)
	}
	return nil
}

func PostgresDataDir(dataDir string) string {
	return filepath.Join(dataDir, "data", "pg")
}

func UpdatesDir(dataDir string) string {
	return filepath.Join(dataDir, "updates")
}
