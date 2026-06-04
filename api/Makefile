.PHONY: run build test lint migrate-up migrate-down migrate-create sqlc seed docker-up docker-down desktop-build

-include .env

VERSION ?= 0.1.0-dev

ifdef DATABASE_URL
MIGRATE_DATABASE := $(DATABASE_URL)
else
MIGRATE_DATABASE := postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)
endif

run:
	go run ./cmd/api

build:
	CGO_ENABLED=0 go build -ldflags="-s -w -X github.com/tetradatateknologi/kueri/api/internal/version.Version=$(VERSION)" -o bin/api ./cmd/api

desktop-build:
	CGO_ENABLED=0 go build -tags desktop \
		-ldflags="-s -w -X github.com/tetradatateknologi/kueri/api/internal/version.Version=$(VERSION) -X github.com/tetradatateknologi/kueri/api/internal/version.Mode=desktop" \
		-o bin/kueri-desktop ./cmd/desktop

test:
	go test ./... -count=1

lint:
	@command -v golangci-lint >/dev/null 2>&1 && golangci-lint run ./... || echo "golangci-lint not installed, skipped"

migrate-up:
	migrate -path db/migrations -database "$(MIGRATE_DATABASE)" up

migrate-down:
	migrate -path db/migrations -database "$(MIGRATE_DATABASE)" down 1

migrate-create:
	@read -p "Migration name: " name; \
	migrate create -ext sql -dir db/migrations -seq $$name

sqlc:
	sqlc generate

seed:
	go run ./scripts/seed.go

docker-up:
	docker compose -f ../docker-compose.yml up -d

docker-down:
	docker compose -f ../docker-compose.yml down
