package workspace

import (
	"strings"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

func parseConnectionInput(in ConnectionInput) (sqlc.CreateConnectionParams, error) {
	name := strings.TrimSpace(in.Name)
	host := strings.TrimSpace(in.Host)
	dbName := strings.TrimSpace(in.DatabaseName)
	username := strings.TrimSpace(in.Username)
	sslMode := strings.TrimSpace(in.SSLMode)
	driver := strings.TrimSpace(in.Driver)

	if name == "" || host == "" || dbName == "" {
		return sqlc.CreateConnectionParams{}, ErrInvalidInput
	}
	if in.Port <= 0 {
		return sqlc.CreateConnectionParams{}, ErrInvalidInput
	}

	env, err := parseEnvironment(in.Environment)
	if err != nil {
		return sqlc.CreateConnectionParams{}, err
	}

	if driver == "" {
		driver = string(sqlc.ConnectionDriverPostgres)
	}
	if driver != string(sqlc.ConnectionDriverPostgres) {
		return sqlc.CreateConnectionParams{}, ErrInvalidInput
	}
	if sslMode == "" {
		sslMode = "disable"
	}

	var userPtr *string
	if username != "" {
		userPtr = &username
	}

	return sqlc.CreateConnectionParams{
		Name:         name,
		Environment:  env,
		Driver:       sqlc.ConnectionDriverPostgres,
		Host:         host,
		Port:         in.Port,
		DatabaseName: dbName,
		Username:     userPtr,
		SslMode:      sslMode,
	}, nil
}

func parseEnvironment(raw string) (sqlc.ConnectionEnvironment, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "development", "dev":
		return sqlc.ConnectionEnvironmentDevelopment, nil
	case "staging":
		return sqlc.ConnectionEnvironmentStaging, nil
	case "production", "prod":
		return sqlc.ConnectionEnvironmentProduction, nil
	default:
		return "", ErrInvalidInput
	}
}
