package workspace

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/authz"
	"github.com/tetradatateknologi/kueri/api/internal/database"
	"github.com/tetradatateknologi/kueri/api/internal/secrets"
)

type Service struct {
	q   *sqlc.Queries
	box *secrets.Box
}

func NewService(pool *pgxpool.Pool, box *secrets.Box) *Service {
	return &Service{q: sqlc.New(pool), box: box}
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

func (s *Service) Update(ctx context.Context, userID, workspaceID int64, name string) (WorkspaceResponse, error) {
	if err := authz.EnsureWorkspaceOwner(ctx, s.q, userID, workspaceID); err != nil {
		if errors.Is(err, authz.ErrWorkspaceNotFound) {
			return WorkspaceResponse{}, ErrWorkspaceNotFound
		}
		return WorkspaceResponse{}, err
	}
	name = trimName(name)
	if name == "" {
		return WorkspaceResponse{}, ErrInvalidInput
	}
	ws, err := s.q.UpdateWorkspaceName(ctx, sqlc.UpdateWorkspaceNameParams{
		ID:   workspaceID,
		Name: name,
	})
	if err != nil {
		return WorkspaceResponse{}, err
	}
	conns, err := s.q.ListConnectionsByWorkspace(ctx, workspaceID)
	if err != nil {
		return WorkspaceResponse{}, err
	}
	item := WorkspaceResponse{
		ID:          ws.ID,
		Name:        ws.Name,
		Connections: make([]ConnectionResponse, 0, len(conns)),
	}
	for _, c := range conns {
		item.Connections = append(item.Connections, mapConnection(c))
	}
	return item, nil
}

func (s *Service) Delete(ctx context.Context, userID, workspaceID int64) error {
	if err := authz.EnsureWorkspaceOwner(ctx, s.q, userID, workspaceID); err != nil {
		if errors.Is(err, authz.ErrWorkspaceNotFound) {
			return ErrWorkspaceNotFound
		}
		return err
	}
	return s.q.SoftDeleteWorkspace(ctx, workspaceID)
}

func (s *Service) DeleteConnection(ctx context.Context, userID, workspaceID, connectionID int64) error {
	if err := authz.EnsureWorkspaceOwner(ctx, s.q, userID, workspaceID); err != nil {
		if errors.Is(err, authz.ErrWorkspaceNotFound) {
			return ErrWorkspaceNotFound
		}
		return err
	}
	conn, err := s.q.GetConnectionForUser(ctx, sqlc.GetConnectionForUserParams{
		ID:     connectionID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrWorkspaceNotFound
		}
		return err
	}
	if conn.WorkspaceID != workspaceID {
		return ErrWorkspaceNotFound
	}
	return s.q.SoftDeleteConnection(ctx, connectionID)
}

func (s *Service) UpdateConnection(
	ctx context.Context,
	userID, workspaceID, connectionID int64,
	in ConnectionInput,
) (ConnectionResponse, error) {
	if err := authz.EnsureWorkspaceOwner(ctx, s.q, userID, workspaceID); err != nil {
		if errors.Is(err, authz.ErrWorkspaceNotFound) {
			return ConnectionResponse{}, ErrWorkspaceNotFound
		}
		return ConnectionResponse{}, err
	}

	existing, err := s.q.GetConnectionForUser(ctx, sqlc.GetConnectionForUserParams{
		ID:     connectionID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ConnectionResponse{}, ErrWorkspaceNotFound
		}
		return ConnectionResponse{}, err
	}
	if existing.WorkspaceID != workspaceID {
		return ConnectionResponse{}, ErrWorkspaceNotFound
	}

	fields, err := parseConnectionFields(in)
	if err != nil {
		return ConnectionResponse{}, err
	}

	var passwordEncrypted *string
	if strings.TrimSpace(in.Password) != "" {
		encrypted, err := s.box.Encrypt(in.Password)
		if err != nil {
			return ConnectionResponse{}, err
		}
		if encrypted != "" {
			passwordEncrypted = &encrypted
		}
	}

	updated, err := s.q.UpdateConnection(ctx, sqlc.UpdateConnectionParams{
		ID:                connectionID,
		Name:              fields.Name,
		Environment:       fields.Environment,
		Driver:            fields.Driver,
		Host:              fields.Host,
		Port:              fields.Port,
		DatabaseName:      fields.DatabaseName,
		Username:          fields.Username,
		PasswordEncrypted: passwordEncrypted,
		SslMode:           fields.SslMode,
		WorkspaceID:       workspaceID,
	})
	if err != nil {
		if isUniqueViolation(err) {
			return ConnectionResponse{}, ErrConnectionConflict
		}
		return ConnectionResponse{}, err
	}
	return mapConnection(updated), nil
}

func (s *Service) Create(ctx context.Context, userID int64, name string) (WorkspaceResponse, error) {
	name = trimName(name)
	if name == "" {
		return WorkspaceResponse{}, ErrInvalidInput
	}
	ws, err := s.q.CreateWorkspace(ctx, sqlc.CreateWorkspaceParams{
		UserID: userID,
		Name:   name,
	})
	if err != nil {
		return WorkspaceResponse{}, err
	}
	return WorkspaceResponse{
		ID:          ws.ID,
		Name:        ws.Name,
		Connections: []ConnectionResponse{},
	}, nil
}

func (s *Service) CreateConnection(
	ctx context.Context,
	userID, workspaceID int64,
	in ConnectionInput,
) (ConnectionResponse, error) {
	if err := authz.EnsureWorkspaceOwner(ctx, s.q, userID, workspaceID); err != nil {
		if errors.Is(err, authz.ErrWorkspaceNotFound) {
			return ConnectionResponse{}, ErrWorkspaceNotFound
		}
		return ConnectionResponse{}, err
	}

	params, err := parseConnectionInput(in)
	if err != nil {
		return ConnectionResponse{}, err
	}
	params.WorkspaceID = workspaceID

	encrypted, err := s.box.Encrypt(in.Password)
	if err != nil {
		return ConnectionResponse{}, err
	}
	if encrypted != "" {
		params.PasswordEncrypted = &encrypted
	}

	created, err := s.q.CreateConnection(ctx, params)
	if err != nil {
		if isUniqueViolation(err) {
			return ConnectionResponse{}, ErrConnectionConflict
		}
		return ConnectionResponse{}, err
	}
	return mapConnection(created), nil
}

func (s *Service) TestConnection(ctx context.Context, userID, workspaceID int64, in ConnectionInput) error {
	if err := authz.EnsureWorkspaceOwner(ctx, s.q, userID, workspaceID); err != nil {
		if errors.Is(err, authz.ErrWorkspaceNotFound) {
			return ErrWorkspaceNotFound
		}
		return err
	}

	params, err := parseConnectionInput(in)
	if err != nil {
		return err
	}

	conn := sqlc.Connection{
		Driver:       params.Driver,
		Host:         params.Host,
		Port:         params.Port,
		DatabaseName: params.DatabaseName,
		Username:     params.Username,
		SslMode:      params.SslMode,
	}
	return database.PingConnection(ctx, conn, in.Password)
}

func trimName(name string) string {
	return strings.TrimSpace(name)
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func mapConnection(c sqlc.Connection) ConnectionResponse {
	username := ""
	if c.Username != nil {
		username = *c.Username
	}
	return ConnectionResponse{
		ID:           c.ID,
		Name:         c.Name,
		Environment:  string(c.Environment),
		EnvKey:       envKey(c.Environment),
		Host:         c.Host,
		Port:         c.Port,
		DisplayHost:  fmt.Sprintf("%s:%d", c.Host, c.Port),
		Driver:       string(c.Driver),
		DatabaseName: c.DatabaseName,
		Username:     username,
		SSLMode:      c.SslMode,
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
