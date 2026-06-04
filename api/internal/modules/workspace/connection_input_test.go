package workspace

import (
	"testing"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

func TestParseConnectionInput(t *testing.T) {
	params, err := parseConnectionInput(ConnectionInput{
		Name:         "Dev",
		Environment:  "development",
		Host:         "localhost",
		Port:         5433,
		DatabaseName: "kueri",
		Username:     "kueri",
		SSLMode:      "disable",
	})
	if err != nil {
		t.Fatal(err)
	}
	if params.Environment != sqlc.ConnectionEnvironmentDevelopment {
		t.Fatalf("env: %s", params.Environment)
	}
	if params.Driver != sqlc.ConnectionDriverPostgres {
		t.Fatalf("driver: %s", params.Driver)
	}
}

func TestParseConnectionInputMySQL(t *testing.T) {
	params, err := parseConnectionInput(ConnectionInput{
		Name:         "Dev",
		Environment:  "development",
		Driver:       "mysql",
		Host:         "localhost",
		Port:         3306,
		DatabaseName: "app",
		Username:     "root",
		SSLMode:      "disable",
	})
	if err != nil {
		t.Fatal(err)
	}
	if params.Driver != sqlc.ConnectionDriverMysql {
		t.Fatalf("driver: %s", params.Driver)
	}
}

func TestParseConnectionInputRejectsEmptyName(t *testing.T) {
	_, err := parseConnectionInput(ConnectionInput{
		Environment:  "dev",
		Host:         "localhost",
		Port:         5433,
		DatabaseName: "kueri",
	})
	if err != ErrInvalidInput {
		t.Fatalf("got %v", err)
	}
}
