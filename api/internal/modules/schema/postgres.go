package schema

import (
	"context"

	"github.com/jackc/pgx/v5"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/database"
)

const postgresTablesSQL = `
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND table_type IN ('BASE TABLE', 'VIEW')
ORDER BY table_schema, table_name
`

const postgresColumnsSQL = `
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = c.table_schema
      AND tc.table_name = c.table_name
      AND kcu.column_name = c.column_name
  ) AS is_primary_key
FROM information_schema.columns c
WHERE c.table_schema = $1
  AND c.table_name = $2
ORDER BY c.ordinal_position
`

func listPostgresOverview(ctx context.Context, conn sqlc.Connection, password string) ([]SchemaNode, error) {
	target, err := pgx.Connect(ctx, database.PostgresDSN(conn, password))
	if err != nil {
		return nil, err
	}
	defer target.Close(context.Background())

	rows, err := target.Query(ctx, postgresTablesSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bySchema := map[string][]TableNode{}
	order := []string{}

	for rows.Next() {
		var schemaName, tableName, tableType string
		if err := rows.Scan(&schemaName, &tableName, &tableType); err != nil {
			return nil, err
		}
		if _, ok := bySchema[schemaName]; !ok {
			order = append(order, schemaName)
		}
		bySchema[schemaName] = append(bySchema[schemaName], TableNode{
			Name: tableName,
			Kind: mapTableKind(tableType),
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := make([]SchemaNode, 0, len(order))
	for _, name := range order {
		out = append(out, SchemaNode{Name: name, Tables: bySchema[name]})
	}
	return out, nil
}

func listPostgresColumns(ctx context.Context, conn sqlc.Connection, password, schemaName, tableName string) ([]ColumnNode, error) {
	target, err := pgx.Connect(ctx, database.PostgresDSN(conn, password))
	if err != nil {
		return nil, err
	}
	defer target.Close(context.Background())

	rows, err := target.Query(ctx, postgresColumnsSQL, schemaName, tableName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanColumnRows(rows)
}

func mapTableKind(tableType string) string {
	if tableType == "VIEW" {
		return "view"
	}
	return "table"
}

func scanColumnRows(rows pgx.Rows) ([]ColumnNode, error) {
	var out []ColumnNode
	for rows.Next() {
		var name, dataType, nullable string
		var defaultVal *string
		var isPK bool
		if err := rows.Scan(&name, &dataType, &nullable, &defaultVal, &isPK); err != nil {
			return nil, err
		}
		out = append(out, ColumnNode{
			Name:         name,
			DataType:     dataType,
			IsNullable:   nullable == "YES",
			IsPrimaryKey: isPK,
			DefaultValue: defaultVal,
		})
	}
	return out, rows.Err()
}
