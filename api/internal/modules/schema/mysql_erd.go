package schema

import (
	"context"
	"database/sql"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/database"
)

const mysqlErdTablesSQL = `
SELECT TABLE_SCHEMA, TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = ?
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME
`

const mysqlErdColumnsSQL = `
SELECT
  c.TABLE_SCHEMA,
  c.TABLE_NAME,
  c.COLUMN_NAME,
  c.DATA_TYPE,
  c.IS_NULLABLE,
  c.COLUMN_DEFAULT,
  (c.COLUMN_KEY = 'PRI') AS is_primary_key,
  (c.COLUMN_KEY = 'MUL' AND EXISTS (
    SELECT 1
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = c.TABLE_SCHEMA
      AND kcu.TABLE_NAME = c.TABLE_NAME
      AND kcu.COLUMN_NAME = c.COLUMN_NAME
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
  )) AS is_foreign_key,
  (c.COLUMN_KEY = 'UNI') AS is_unique
FROM information_schema.COLUMNS c
WHERE c.TABLE_SCHEMA = ?
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
`

const mysqlErdRelationsSQL = `
SELECT
  kcu.CONSTRAINT_NAME,
  kcu.TABLE_SCHEMA,
  kcu.TABLE_NAME,
  kcu.COLUMN_NAME,
  kcu.REFERENCED_TABLE_SCHEMA,
  kcu.REFERENCED_TABLE_NAME,
  kcu.REFERENCED_COLUMN_NAME,
  rc.UPDATE_RULE,
  rc.DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE kcu
JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
  ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
 AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
WHERE kcu.TABLE_SCHEMA = ?
  AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY kcu.TABLE_NAME, kcu.ORDINAL_POSITION
`

func listMySQLErd(ctx context.Context, conn sqlc.Connection, password string) (ErdResponse, error) {
	db, err := database.OpenMySQL(conn, password)
	if err != nil {
		return ErdResponse{}, err
	}
	defer db.Close()

	schemaName := conn.DatabaseName

	tables, err := scanMySQLErdTables(ctx, db, schemaName)
	if err != nil {
		return ErdResponse{}, err
	}

	columnsByTable, err := scanMySQLErdColumns(ctx, db, schemaName)
	if err != nil {
		return ErdResponse{}, err
	}

	for i := range tables {
		key := erdTableID(tables[i].Schema, tables[i].Name)
		tables[i].Columns = columnsByTable[key]
		if tables[i].Columns == nil {
			tables[i].Columns = []ErdColumn{}
		}
	}

	relations, err := scanMySQLErdRelations(ctx, db, schemaName)
	if err != nil {
		return ErdResponse{}, err
	}

	schemas := []string{}
	if schemaName != "" {
		schemas = []string{schemaName}
	}

	return ErdResponse{
		Database:  conn.DatabaseName,
		Schemas:   schemas,
		Tables:    tables,
		Relations: relations,
	}, nil
}

func scanMySQLErdTables(ctx context.Context, db *sql.DB, schemaName string) ([]ErdTableNode, error) {
	rows, err := db.QueryContext(ctx, mysqlErdTablesSQL, schemaName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []ErdTableNode
	for rows.Next() {
		var schema, tableName string
		if err := rows.Scan(&schema, &tableName); err != nil {
			return nil, err
		}
		tables = append(tables, ErdTableNode{
			ID:     erdTableID(schema, tableName),
			Schema: schema,
			Name:   tableName,
		})
	}
	return tables, rows.Err()
}

func scanMySQLErdColumns(ctx context.Context, db *sql.DB, schemaName string) (map[string][]ErdColumn, error) {
	rows, err := db.QueryContext(ctx, mysqlErdColumnsSQL, schemaName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string][]ErdColumn{}
	for rows.Next() {
		var schema, tableName, colName, dataType, nullable string
		var defaultVal sql.NullString
		var isPK, isFK, isUnique bool
		if err := rows.Scan(&schema, &tableName, &colName, &dataType, &nullable, &defaultVal, &isPK, &isFK, &isUnique); err != nil {
			return nil, err
		}
		var defPtr *string
		if defaultVal.Valid {
			v := defaultVal.String
			defPtr = &v
		}
		key := erdTableID(schema, tableName)
		col := ErdColumn{
			Name:         colName,
			DataType:     dataType,
			IsNullable:   nullable == "YES",
			IsPrimaryKey: isPK,
			IsForeignKey: isFK,
			DefaultValue: defPtr,
		}
		if isUnique {
			col.IsUnique = true
		}
		out[key] = append(out[key], col)
	}
	return out, rows.Err()
}

func scanMySQLErdRelations(ctx context.Context, db *sql.DB, schemaName string) ([]ErdRelation, error) {
	rows, err := db.QueryContext(ctx, mysqlErdRelationsSQL, schemaName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var relations []ErdRelation
	for rows.Next() {
		var constraintName, sourceSchema, sourceTable, sourceColumn string
		var targetSchema, targetTable, targetColumn string
		var onUpdate, onDelete string
		if err := rows.Scan(
			&constraintName, &sourceSchema, &sourceTable, &sourceColumn,
			&targetSchema, &targetTable, &targetColumn,
			&onUpdate, &onDelete,
		); err != nil {
			return nil, err
		}
		relations = append(relations, ErdRelation{
			ID:             erdRelationID(sourceSchema, sourceTable, sourceColumn, targetSchema, targetTable, targetColumn),
			SourceSchema:   sourceSchema,
			SourceTable:    sourceTable,
			SourceColumn:   sourceColumn,
			TargetSchema:   targetSchema,
			TargetTable:    targetTable,
			TargetColumn:   targetColumn,
			ConstraintName: &constraintName,
			OnUpdate:       &onUpdate,
			OnDelete:       &onDelete,
		})
	}
	if relations == nil {
		relations = []ErdRelation{}
	}
	return relations, rows.Err()
}
