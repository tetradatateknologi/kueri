package query

type ExecuteRequest struct {
	SQL          string `json:"sql"`
	ConnectionID int64  `json:"connection_id"`
	Limit        *int   `json:"limit,omitempty"`
	Offset       *int   `json:"offset,omitempty"`
}

type ExecuteResult struct {
	Columns          []string        `json:"columns"`
	Rows             [][]interface{} `json:"rows"`
	RowCount         int             `json:"rowCount"`
	DurationMs       int64           `json:"durationMs"`
	Cached           bool            `json:"cached"`
	Limit            int             `json:"limit"`
	Offset           int             `json:"offset"`
	HasMore          bool            `json:"hasMore"`
	AutoLimitApplied bool            `json:"autoLimitApplied"`
}
