package query

type FilterOperator string

const (
	FilterOperatorContains  FilterOperator = "contains"
	FilterOperatorEquals    FilterOperator = "equals"
	FilterOperatorIsNull    FilterOperator = "is_null"
	FilterOperatorIsNotNull FilterOperator = "is_not_null"
)

type ColumnFilter struct {
	Column   string         `json:"column"`
	Operator FilterOperator `json:"operator"`
	Value    *string        `json:"value,omitempty"`
}

type ColumnInfo struct {
	Name       string `json:"name"`
	DataType   string `json:"dataType,omitempty"`
	Filterable bool   `json:"filterable"`
}

type FilteringInfo struct {
	Enabled        bool           `json:"enabled"`
	Mode           string         `json:"mode"`
	Reason         *string        `json:"reason"`
	AppliedFilters []ColumnFilter `json:"appliedFilters,omitempty"`
}

type ExecuteRequest struct {
	SQL          string         `json:"sql"`
	ConnectionID int64          `json:"connection_id"`
	Limit        *int           `json:"limit,omitempty"`
	Offset       *int           `json:"offset,omitempty"`
	Filters      []ColumnFilter `json:"filters,omitempty"`
}

type ExecuteResult struct {
	Columns          []ColumnInfo    `json:"columns"`
	Rows             [][]interface{} `json:"rows"`
	RowCount         int             `json:"rowCount"`
	DurationMs       int64           `json:"durationMs"`
	Cached           bool            `json:"cached"`
	Limit            int             `json:"limit"`
	Offset           int             `json:"offset"`
	HasMore          bool            `json:"hasMore"`
	AutoLimitApplied bool            `json:"autoLimitApplied"`
	Filtering        FilteringInfo   `json:"filtering"`
}
