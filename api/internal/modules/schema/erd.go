package schema

import "fmt"

func erdTableID(schema, table string) string {
	return fmt.Sprintf("%s.%s", schema, table)
}

func erdRelationID(sourceSchema, sourceTable, sourceColumn, targetSchema, targetTable, targetColumn string) string {
	return fmt.Sprintf(
		"%s_%s_%s_%s_%s_%s",
		sourceSchema, sourceTable, sourceColumn,
		targetSchema, targetTable, targetColumn,
	)
}
