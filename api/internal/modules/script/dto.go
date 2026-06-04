package script

type TagResponse struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type ScriptResponse struct {
	ID          int64         `json:"id"`
	WorkspaceID int64         `json:"workspace_id"`
	Title       string        `json:"title"`
	SqlText     string        `json:"sql_text"`
	Tags        []TagResponse `json:"tags"`
}

type DeleteScriptResponse struct {
	Deleted bool `json:"deleted"`
}

type UpdateScriptRequest struct {
	Title   *string `json:"title"`
	SqlText *string `json:"sql_text"`
}

type CreateScriptRequest struct {
	WorkspaceID int64  `json:"workspace_id"`
	Title       string `json:"title"`
	SqlText     string `json:"sql_text"`
}

