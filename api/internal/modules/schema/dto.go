package schema

type OverviewResponse struct {
	Driver  string       `json:"driver"`
	Schemas []SchemaNode `json:"schemas"`
}

type SchemaNode struct {
	Name   string      `json:"name"`
	Tables []TableNode `json:"tables"`
}

type TableNode struct {
	Name string `json:"name"`
	Kind string `json:"kind"`
}

type ColumnsResponse struct {
	Schema  string       `json:"schema"`
	Table   string       `json:"table"`
	Columns []ColumnNode `json:"columns"`
}

type ColumnNode struct {
	Name         string  `json:"name"`
	DataType     string  `json:"dataType"`
	IsNullable   bool    `json:"isNullable"`
	IsPrimaryKey bool    `json:"isPrimaryKey"`
	DefaultValue *string `json:"defaultValue,omitempty"`
}

type ErdResponse struct {
	ConnectionID int64           `json:"connectionId"`
	Database     string          `json:"database"`
	Driver       string          `json:"driver"`
	Schemas      []string        `json:"schemas"`
	Tables       []ErdTableNode  `json:"tables"`
	Relations    []ErdRelation   `json:"relations"`
}

type ErdTableNode struct {
	ID      string      `json:"id"`
	Schema  string      `json:"schema"`
	Name    string      `json:"name"`
	Columns []ErdColumn `json:"columns"`
}

type ErdColumn struct {
	Name         string  `json:"name"`
	DataType     string  `json:"dataType"`
	IsNullable   bool    `json:"isNullable"`
	IsPrimaryKey bool    `json:"isPrimaryKey"`
	IsForeignKey bool    `json:"isForeignKey"`
	IsUnique     bool    `json:"isUnique,omitempty"`
	DefaultValue *string `json:"defaultValue,omitempty"`
}

type ErdRelation struct {
	ID             string  `json:"id"`
	SourceSchema   string  `json:"sourceSchema"`
	SourceTable    string  `json:"sourceTable"`
	SourceColumn   string  `json:"sourceColumn"`
	TargetSchema   string  `json:"targetSchema"`
	TargetTable    string  `json:"targetTable"`
	TargetColumn   string  `json:"targetColumn"`
	ConstraintName *string `json:"constraintName,omitempty"`
	OnUpdate       *string `json:"onUpdate,omitempty"`
	OnDelete       *string `json:"onDelete,omitempty"`
}
