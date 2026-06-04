package script

type TagResponse struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type ScriptResponse struct {
	ID           int64         `json:"id"`
	WorkspaceID  int64         `json:"workspace_id"`
	Title        string        `json:"title"`
	SqlText      string        `json:"sql_text"`
	Tags         []TagResponse `json:"tags"`
	IsFavorite   bool          `json:"is_favorite"`
	FavoriteSort *int32        `json:"favorite_sort,omitempty"`
}

type SetFavoriteRequest struct {
	Favorite bool `json:"favorite"`
}

type DeleteScriptResponse struct {
	Deleted bool `json:"deleted"`
}

type UpdateScriptRequest struct {
	Title   *string   `json:"title"`
	SqlText *string   `json:"sql_text"`
	Tags    *[]string `json:"tags"`
}

type CreateScriptRequest struct {
	WorkspaceID int64    `json:"workspace_id"`
	Title       string   `json:"title"`
	SqlText     string   `json:"sql_text"`
	Tags        []string `json:"tags"`
}

