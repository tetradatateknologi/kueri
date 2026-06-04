package query

type ExecuteRequest struct {
	SQL          string `json:"sql"`
	ConnectionID int64  `json:"connection_id"`
}

type ExecuteResult struct {
	Columns    []string        `json:"columns"`
	Rows       [][]interface{} `json:"rows"`
	RowCount   int             `json:"rowCount"`
	DurationMs int64           `json:"durationMs"`
	Cached     bool            `json:"cached"`
}
