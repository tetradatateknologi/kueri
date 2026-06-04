package workspace

type CreateWorkspaceRequest struct {
	Name string `json:"name"`
}

type ConnectionInput struct {
	Name         string `json:"name"`
	Environment  string `json:"environment"`
	Driver       string `json:"driver"`
	Host         string `json:"host"`
	Port         int32  `json:"port"`
	DatabaseName string `json:"database_name"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	SSLMode      string `json:"ssl_mode"`
}

type TestConnectionResponse struct {
	OK bool `json:"ok"`
}

type ConnectionResponse struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Environment string `json:"environment"`
	EnvKey      string `json:"env_key"`
	Host        string `json:"host"`
	Port        int32  `json:"port"`
	DisplayHost string `json:"display_host"`
	Driver      string `json:"driver"`
}

type WorkspaceResponse struct {
	ID          int64                `json:"id"`
	Name        string               `json:"name"`
	Connections []ConnectionResponse `json:"connections"`
}
