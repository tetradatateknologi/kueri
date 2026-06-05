package schema

import (
	"context"
	"database/sql"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/database"
)

const mysqlTablesSQL = `
SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = ?
  AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
ORDER BY TABLE_NAME
`

const mysqlColumnsSQL = `
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = ?
  AND TABLE_NAME = ?
ORDER BY ORDINAL_POSITION
`

func listMySQLOverview(ctx context.Context, conn sqlc.Connection, password string) ([]SchemaNode, error) {
	db, err := database.OpenMySQL(conn, password)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.QueryContext(ctx, mysqlTablesSQL, conn.DatabaseName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tables := make([]TableNode, 0)
	for rows.Next() {
		var schemaName, tableName, tableType string
		if err := rows.Scan(&schemaName, &tableName, &tableType); err != nil {
			return nil, err
		}
		_ = schemaName
		tables = append(tables, TableNode{
			Name: tableName,
			Kind: mapTableKind(tableType),
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return []SchemaNode{{Name: conn.DatabaseName, Tables: tables}}, nil
}

func listMySQLColumns(ctx context.Context, conn sqlc.Connection, password, schemaName, tableName string) ([]ColumnNode, error) {
	db, err := database.OpenMySQL(conn, password)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	dbSchema := schemaName
	if dbSchema == "" {
		dbSchema = conn.DatabaseName
	}

	rows, err := db.QueryContext(ctx, mysqlColumnsSQL, dbSchema, tableName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ColumnNode
	for rows.Next() {
		var name, dataType, nullable, colKey string
		var defaultVal sql.NullString
		if err := rows.Scan(&name, &dataType, &nullable, &defaultVal, &colKey); err != nil {
			return nil, err
		}
		var defPtr *string
		if defaultVal.Valid {
			v := defaultVal.String
			defPtr = &v
		}
		out = append(out, ColumnNode{
			Name:         name,
			DataType:     dataType,
			IsNullable:   nullable == "YES",
			IsPrimaryKey: colKey == "PRI",
			DefaultValue: defPtr,
		})
	}
	return out, rows.Err()
}
