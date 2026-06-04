package workspace

import (
	"strings"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

type parsedConnectionFields struct {
	Name         string
	Environment  sqlc.ConnectionEnvironment
	Driver       sqlc.ConnectionDriver
	Host         string
	Port         int32
	DatabaseName string
	Username     *string
	SslMode      string
}

func parseConnectionFields(in ConnectionInput) (parsedConnectionFields, error) {
	name := strings.TrimSpace(in.Name)
	host := strings.TrimSpace(in.Host)
	dbName := strings.TrimSpace(in.DatabaseName)
	username := strings.TrimSpace(in.Username)
	sslMode := strings.TrimSpace(in.SSLMode)
	driver := strings.TrimSpace(in.Driver)

	if name == "" || host == "" || dbName == "" {
		return parsedConnectionFields{}, ErrInvalidInput
	}
	if in.Port <= 0 {
		return parsedConnectionFields{}, ErrInvalidInput
	}

	env, err := parseEnvironment(in.Environment)
	if err != nil {
		return parsedConnectionFields{}, err
	}

	connDriver, err := parseDriver(driver)
	if err != nil {
		return parsedConnectionFields{}, err
	}
	if sslMode == "" {
		sslMode = "disable"
	}

	var userPtr *string
	if username != "" {
		userPtr = &username
	}

	return parsedConnectionFields{
		Name:         name,
		Environment:  env,
		Driver:       connDriver,
		Host:         host,
		Port:         in.Port,
		DatabaseName: dbName,
		Username:     userPtr,
		SslMode:      sslMode,
	}, nil
}

func parseConnectionInput(in ConnectionInput) (sqlc.CreateConnectionParams, error) {
	fields, err := parseConnectionFields(in)
	if err != nil {
		return sqlc.CreateConnectionParams{}, err
	}
	return sqlc.CreateConnectionParams{
		Name:         fields.Name,
		Environment:  fields.Environment,
		Driver:       fields.Driver,
		Host:         fields.Host,
		Port:         fields.Port,
		DatabaseName: fields.DatabaseName,
		Username:     fields.Username,
		SslMode:      fields.SslMode,
	}, nil
}

func parseDriver(raw string) (sqlc.ConnectionDriver, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "postgres", "postgresql":
		return sqlc.ConnectionDriverPostgres, nil
	case "mysql":
		return sqlc.ConnectionDriverMysql, nil
	default:
		return "", ErrInvalidInput
	}
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
