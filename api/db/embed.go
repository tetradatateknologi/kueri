package db

import "embed"

// Migrations contains versioned SQL migrations for golang-migrate.
//
//go:embed migrations/*.sql
var Migrations embed.FS
