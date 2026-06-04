package workspace

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

type Service struct {
	q *sqlc.Queries
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{q: sqlc.New(pool)}
}

func (s *Service) ListForUser(ctx context.Context, userID int64) ([]WorkspaceResponse, error) {
	workspaces, err := s.q.ListWorkspacesByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	out := make([]WorkspaceResponse, 0, len(workspaces))
	for _, ws := range workspaces {
		conns, err := s.q.ListConnectionsByWorkspace(ctx, ws.ID)
		if err != nil {
			return nil, err
		}
		item := WorkspaceResponse{
			ID:          ws.ID,
			Name:        ws.Name,
			Connections: make([]ConnectionResponse, 0, len(conns)),
		}
		for _, c := range conns {
			item.Connections = append(item.Connections, mapConnection(c))
		}
		out = append(out, item)
	}
	return out, nil
}

func mapConnection(c sqlc.Connection) ConnectionResponse {
	return ConnectionResponse{
		ID:          c.ID,
		Name:        c.Name,
		Environment: string(c.Environment),
		EnvKey:      envKey(c.Environment),
		Host:        c.Host,
		Port:        c.Port,
		DisplayHost: fmt.Sprintf("%s:%d", c.Host, c.Port),
		Driver:      string(c.Driver),
	}
}

func envKey(env sqlc.ConnectionEnvironment) string {
	switch env {
	case sqlc.ConnectionEnvironmentStaging:
		return "staging"
	case sqlc.ConnectionEnvironmentProduction:
		return "prod"
	default:
		return "dev"
	}
}
