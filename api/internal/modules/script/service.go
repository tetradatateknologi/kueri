package script

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
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

func (s *Service) RunQuery(_ context.Context, _ int64, sqlText string) RunQueryResponse {
	_ = sqlText
	return RunQueryResponse{
		RowCount:   8,
		DurationMs: 42,
		Columns:    []string{"channel", "month", "revenue", "orders"},
		Rows: []map[string]interface{}{
			{"channel": "web", "month": "2026-05-01", "revenue": 12450.0, "orders": 182},
			{"channel": "web", "month": "2026-04-01", "revenue": 11820.0, "orders": 171},
			{"channel": "mobile", "month": "2026-05-01", "revenue": 9320.0, "orders": 144},
			{"channel": "mobile", "month": "2026-04-01", "revenue": 8875.0, "orders": 138},
			{"channel": "partner", "month": "2026-05-01", "revenue": 6210.0, "orders": 52},
			{"channel": "partner", "month": "2026-04-01", "revenue": 5980.0, "orders": 49},
			{"channel": "retail", "month": "2026-05-01", "revenue": 4100.0, "orders": 31},
			{"channel": "retail", "month": "2026-04-01", "revenue": 3950.0, "orders": 28},
		},
	}
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
	ws, err := s.q.GetWorkspaceByID(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrScriptNotFound
		}
		return err
	}
	if ws.UserID != userID {
		return ErrScriptNotFound
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
