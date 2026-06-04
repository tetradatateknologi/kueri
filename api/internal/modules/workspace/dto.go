package workspace

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
