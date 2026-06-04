package backup

const (
	FormatID      = "kueri-backup"
	FormatVersion = 1
)

type ExportResponse struct {
	Format        string              `json:"format"`
	FormatVersion int                 `json:"format_version"`
	ExportedAt    string              `json:"exported_at"`
	AppVersion    string              `json:"app_version,omitempty"`
	User          UserSnapshot        `json:"user"`
	Workspaces    []WorkspaceSnapshot `json:"workspaces"`
}

type UserSnapshot struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type WorkspaceSnapshot struct {
	Name        string               `json:"name"`
	Connections []ConnectionSnapshot `json:"connections"`
	Scripts     []ScriptSnapshot     `json:"scripts"`
}

type ConnectionSnapshot struct {
	Name         string `json:"name"`
	Environment  string `json:"environment"`
	Driver       string `json:"driver"`
	Host         string `json:"host"`
	Port         int32  `json:"port"`
	DatabaseName string `json:"database_name"`
	Username     string `json:"username,omitempty"`
	Password     string `json:"password,omitempty"`
	SslMode      string `json:"ssl_mode"`
}

type ScriptSnapshot struct {
	Title        string   `json:"title"`
	SqlText      string   `json:"sql_text"`
	Tags         []string `json:"tags"`
	IsFavorite   bool     `json:"is_favorite"`
	FavoriteSort *int32   `json:"favorite_sort,omitempty"`
}

type ImportRequest struct {
	Mode   string         `json:"mode"`
	Backup ExportResponse `json:"backup"`
}

type ImportResponse struct {
	Mode      string `json:"mode"`
	Workspaces int   `json:"workspaces"`
	Connections int  `json:"connections"`
	Scripts   int    `json:"scripts"`
	Skipped   int    `json:"skipped"`
}
