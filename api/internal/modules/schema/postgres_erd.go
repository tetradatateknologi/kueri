package schema

import (
	"context"

	"github.com/jackc/pgx/v5"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/database"
)

const postgresErdTablesSQL = `
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name
`

const postgresErdColumnsSQL = `
SELECT
  c.table_schema,
  c.table_name,
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
  ) AS is_primary_key,
  EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = c.table_schema
      AND tc.table_name = c.table_name
      AND kcu.column_name = c.column_name
  ) AS is_foreign_key,
  EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = c.table_schema
      AND tc.table_name = c.table_name
      AND kcu.column_name = c.column_name
  ) AS is_unique
FROM information_schema.columns c
WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY c.table_schema, c.table_name, c.ordinal_position
`

const postgresErdRelationsSQL = `
SELECT
  tc.constraint_name,
  kcu.table_schema AS source_schema,
  kcu.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_schema AS target_schema,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
 AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY kcu.table_schema, kcu.table_name, kcu.ordinal_position
`

func listPostgresERD(ctx context.Context, conn sqlc.Connection, password string) (ErdResponse, error) {
	target, err := pgx.Connect(ctx, database.PostgresDSN(conn, password))
	if err != nil {
		return ErdResponse{}, err
	}
	defer target.Close(context.Background())

	tables, schemas, err := scanPostgresErdTables(ctx, target)
	if err != nil {
		return ErdResponse{}, err
	}

	columnsByTable, err := scanPostgresErdColumns(ctx, target)
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

	relations, err := scanPostgresErdRelations(ctx, target)
	if err != nil {
		return ErdResponse{}, err
	}

	return ErdResponse{
		Database:  conn.DatabaseName,
		Schemas:   schemas,
		Tables:    tables,
		Relations: relations,
	}, nil
}

func scanPostgresErdTables(ctx context.Context, target *pgx.Conn) ([]ErdTableNode, []string, error) {
	rows, err := target.Query(ctx, postgresErdTablesSQL)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var tables []ErdTableNode
	schemaSet := map[string]struct{}{}
	schemaOrder := []string{}

	for rows.Next() {
		var schemaName, tableName string
		if err := rows.Scan(&schemaName, &tableName); err != nil {
			return nil, nil, err
		}
		if _, ok := schemaSet[schemaName]; !ok {
			schemaSet[schemaName] = struct{}{}
			schemaOrder = append(schemaOrder, schemaName)
		}
		tables = append(tables, ErdTableNode{
			ID:     erdTableID(schemaName, tableName),
			Schema: schemaName,
			Name:   tableName,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	return tables, schemaOrder, nil
}

func scanPostgresErdColumns(ctx context.Context, target *pgx.Conn) (map[string][]ErdColumn, error) {
	rows, err := target.Query(ctx, postgresErdColumnsSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string][]ErdColumn{}
	for rows.Next() {
		var schemaName, tableName, colName, dataType, nullable string
		var defaultVal *string
		var isPK, isFK, isUnique bool
		if err := rows.Scan(&schemaName, &tableName, &colName, &dataType, &nullable, &defaultVal, &isPK, &isFK, &isUnique); err != nil {
			return nil, err
		}
		key := erdTableID(schemaName, tableName)
		col := ErdColumn{
			Name:         colName,
			DataType:     dataType,
			IsNullable:   nullable == "YES",
			IsPrimaryKey: isPK,
			IsForeignKey: isFK,
			DefaultValue: defaultVal,
		}
		if isUnique {
			col.IsUnique = true
		}
		out[key] = append(out[key], col)
	}
	return out, rows.Err()
}

func scanPostgresErdRelations(ctx context.Context, target *pgx.Conn) ([]ErdRelation, error) {
	rows, err := target.Query(ctx, postgresErdRelationsSQL)
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
