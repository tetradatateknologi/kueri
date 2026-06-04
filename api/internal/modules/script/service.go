package script

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/authz"
)

var ErrScriptNotFound = errors.New("script not found")

type Service struct {
	q *sqlc.Queries
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{q: sqlc.New(pool)}
}

func (s *Service) ListForUser(ctx context.Context, userID int64) ([]ScriptResponse, error) {
	scripts, err := s.q.ListSavedScriptsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]ScriptResponse, 0, len(scripts))
	for _, sc := range scripts {
		item, err := s.mapScript(ctx, sc)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *Service) GetByID(ctx context.Context, userID, scriptID int64) (ScriptResponse, error) {
	sc, err := s.q.GetSavedScriptByID(ctx, scriptID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ScriptResponse{}, ErrScriptNotFound
		}
		return ScriptResponse{}, err
	}
	if err := s.ensureScriptOwner(ctx, userID, sc.WorkspaceID); err != nil {
		return ScriptResponse{}, err
	}
	return s.mapScript(ctx, sc)
}

func (s *Service) Update(ctx context.Context, userID, scriptID int64, req UpdateScriptRequest) (ScriptResponse, error) {
	current, err := s.GetByID(ctx, userID, scriptID)
	if err != nil {
		return ScriptResponse{}, err
	}
	title := current.Title
	sqlText := current.SqlText
	if req.Title != nil {
		title = strings.TrimSpace(*req.Title)
	}
	if req.SqlText != nil {
		sqlText = *req.SqlText
	}
	updated, err := s.q.UpdateSavedScript(ctx, sqlc.UpdateSavedScriptParams{
		ID:      scriptID,
		Title:   title,
		SqlText: sqlText,
	})
	if err != nil {
		return ScriptResponse{}, err
	}
	return s.mapScript(ctx, updated)
}

func (s *Service) Create(ctx context.Context, userID int64, req CreateScriptRequest) (ScriptResponse, error) {
	if err := s.ensureWorkspaceOwner(ctx, userID, req.WorkspaceID); err != nil {
		return ScriptResponse{}, err
	}
	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = "untitled.sql"
	}
	sqlText := req.SqlText
	if sqlText == "" {
		sqlText = "SELECT 1;"
	}
	created, err := s.q.CreateSavedScript(ctx, sqlc.CreateSavedScriptParams{
		WorkspaceID: req.WorkspaceID,
		UserID:      userID,
		Title:       title,
		SqlText:     sqlText,
	})
	if err != nil {
		return ScriptResponse{}, err
	}
	return s.mapScript(ctx, created)
}

func (s *Service) mapScript(ctx context.Context, sc sqlc.SavedScript) (ScriptResponse, error) {
	tags, err := s.q.ListTagsForScript(ctx, sc.ID)
	if err != nil {
		return ScriptResponse{}, err
	}
	tagResponses := make([]TagResponse, 0, len(tags))
	for _, t := range tags {
		tagResponses = append(tagResponses, TagResponse{Name: t.Name, Color: tagColor(t.Name)})
	}
	return ScriptResponse{
		ID:          sc.ID,
		WorkspaceID: sc.WorkspaceID,
		Title:       sc.Title,
		SqlText:     sc.SqlText,
		Tags:        tagResponses,
	}, nil
}

func (s *Service) ensureScriptOwner(ctx context.Context, userID, workspaceID int64) error {
	return s.ensureWorkspaceOwner(ctx, userID, workspaceID)
}

func (s *Service) ensureWorkspaceOwner(ctx context.Context, userID, workspaceID int64) error {
	if err := authz.EnsureWorkspaceOwner(ctx, s.q, userID, workspaceID); err != nil {
		if errors.Is(err, authz.ErrWorkspaceNotFound) {
			return ErrScriptNotFound
		}
		return err
	}
	return nil
}

func tagColor(name string) string {
	switch strings.ToLower(name) {
	case "critical", "danger":
		return "danger"
	case "maintenance", "mysql", "postgres", "analytics", "finance":
		return "neon"
	default:
		return "electric"
	}
}
