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
