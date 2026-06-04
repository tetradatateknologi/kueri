package backup

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
	"github.com/tetradatateknologi/kueri/api/internal/modules/script"
	"github.com/tetradatateknologi/kueri/api/internal/modules/workspace"
	"github.com/tetradatateknologi/kueri/api/internal/secrets"
	"github.com/tetradatateknologi/kueri/api/internal/version"
)

var (
	ErrInvalidBackup  = errors.New("invalid backup format")
	ErrInvalidMode    = errors.New("invalid import mode")
	ErrBackupTooLarge = errors.New("backup exceeds size limit")
)

const maxWorkspaces = 200
const maxConnectionsPerWS = 100
const maxScriptsPerWS = 500

type Service struct {
	q       *sqlc.Queries
	box     *secrets.Box
	ws      *workspace.Service
	scripts *script.Service
}

func NewService(pool *pgxpool.Pool, box *secrets.Box) *Service {
	return &Service{
		q:       sqlc.New(pool),
		box:     box,
		ws:      workspace.NewService(pool, box),
		scripts: script.NewService(pool),
	}
}

func (s *Service) Export(ctx context.Context, userID int64) (ExportResponse, error) {
	user, err := s.q.GetUserByID(ctx, userID)
	if err != nil {
		return ExportResponse{}, err
	}

	workspaces, err := s.q.ListWorkspacesByUser(ctx, userID)
	if err != nil {
		return ExportResponse{}, err
	}

	out := ExportResponse{
		Format:        FormatID,
		FormatVersion: FormatVersion,
		ExportedAt:    time.Now().UTC().Format(time.RFC3339),
		AppVersion:    version.Version,
		User: UserSnapshot{
			Name:  user.Name,
			Email: user.Email,
		},
		Workspaces: make([]WorkspaceSnapshot, 0, len(workspaces)),
	}

	for _, ws := range workspaces {
		item, err := s.exportWorkspace(ctx, ws)
		if err != nil {
			return ExportResponse{}, err
		}
		out.Workspaces = append(out.Workspaces, item)
	}

	return out, nil
}

func (s *Service) exportWorkspace(ctx context.Context, ws sqlc.Workspace) (WorkspaceSnapshot, error) {
	conns, err := s.q.ListConnectionsByWorkspace(ctx, ws.ID)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}

	scripts, err := s.q.ListSavedScriptsByWorkspace(ctx, ws.ID)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}

	item := WorkspaceSnapshot{
		Name:        ws.Name,
		Connections: make([]ConnectionSnapshot, 0, len(conns)),
		Scripts:     make([]ScriptSnapshot, 0, len(scripts)),
	}

	for _, c := range conns {
		username := ""
		if c.Username != nil {
			username = *c.Username
		}
		password := ""
		if c.PasswordEncrypted != nil && *c.PasswordEncrypted != "" {
			pwd, err := s.box.Decrypt(*c.PasswordEncrypted)
			if err != nil {
				return WorkspaceSnapshot{}, fmt.Errorf("decrypt connection %q: %w", c.Name, err)
			}
			password = pwd
		}
		item.Connections = append(item.Connections, ConnectionSnapshot{
			Name:         c.Name,
			Environment:  string(c.Environment),
			Driver:       string(c.Driver),
			Host:         c.Host,
			Port:         c.Port,
			DatabaseName: c.DatabaseName,
			Username:     username,
			Password:     password,
			SslMode:      c.SslMode,
		})
	}

	for _, sc := range scripts {
		tags, err := s.q.ListTagsForScript(ctx, sc.ID)
		if err != nil {
			return WorkspaceSnapshot{}, err
		}
		tagNames := make([]string, 0, len(tags))
		for _, t := range tags {
			tagNames = append(tagNames, t.Name)
		}
		item.Scripts = append(item.Scripts, ScriptSnapshot{
			Title:        sc.Title,
			SqlText:      sc.SqlText,
			Tags:         tagNames,
			IsFavorite:   sc.IsFavorite,
			FavoriteSort: sc.FavoriteSort,
		})
	}

	return item, nil
}

func (s *Service) Import(ctx context.Context, userID int64, req ImportRequest) (ImportResponse, error) {
	if err := validateBackup(req.Backup); err != nil {
		return ImportResponse{}, err
	}

	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	if mode != "merge" && mode != "replace" {
		return ImportResponse{}, ErrInvalidMode
	}

	if mode == "replace" {
		if err := s.q.SoftDeleteAllUserData(ctx, userID); err != nil {
			return ImportResponse{}, err
		}
		if err := s.q.SoftDeleteAllUserConnections(ctx, userID); err != nil {
			return ImportResponse{}, err
		}
		if err := s.q.SoftDeleteAllUserWorkspaces(ctx, userID); err != nil {
			return ImportResponse{}, err
		}
	}

	result := ImportResponse{Mode: mode}
	existing, err := s.q.ListWorkspacesByUser(ctx, userID)
	if err != nil {
		return ImportResponse{}, err
	}
	byName := map[string]int64{}
	for _, ws := range existing {
		byName[strings.ToLower(strings.TrimSpace(ws.Name))] = ws.ID
	}

	for _, snap := range req.Backup.Workspaces {
		wsName := strings.TrimSpace(snap.Name)
		if wsName == "" {
			result.Skipped++
			continue
		}

		wsKey := strings.ToLower(wsName)
		workspaceID, ok := byName[wsKey]
		if !ok {
			created, err := s.ws.Create(ctx, userID, wsName)
			if err != nil {
				return ImportResponse{}, err
			}
			workspaceID = created.ID
			byName[wsKey] = workspaceID
			result.Workspaces++
		} else if mode == "replace" {
			result.Workspaces++
		}

		connImported, connSkipped, err := s.importConnections(ctx, userID, workspaceID, snap.Connections, mode)
		if err != nil {
			return ImportResponse{}, err
		}
		result.Connections += connImported
		result.Skipped += connSkipped

		scriptImported, scriptSkipped, err := s.importScripts(ctx, userID, workspaceID, snap.Scripts, mode)
		if err != nil {
			return ImportResponse{}, err
		}
		result.Scripts += scriptImported
		result.Skipped += scriptSkipped
	}

	return result, nil
}

func (s *Service) importConnections(
	ctx context.Context,
	userID, workspaceID int64,
	snapshots []ConnectionSnapshot,
	mode string,
) (imported, skipped int, err error) {
	existing, err := s.q.ListConnectionsByWorkspace(ctx, workspaceID)
	if err != nil {
		return 0, 0, err
	}
	type connKey struct {
		name string
		env  string
	}
	seen := map[connKey]struct{}{}
	for _, c := range existing {
		seen[connKey{name: strings.ToLower(c.Name), env: strings.ToLower(string(c.Environment))}] = struct{}{}
	}

	for _, snap := range snapshots {
		key := connKey{
			name: strings.ToLower(strings.TrimSpace(snap.Name)),
			env:  strings.ToLower(strings.TrimSpace(snap.Environment)),
		}
		if key.name == "" {
			skipped++
			continue
		}
		if mode == "merge" {
			if _, ok := seen[key]; ok {
				skipped++
				continue
			}
		}

		_, err := s.ws.CreateConnection(ctx, userID, workspaceID, workspace.ConnectionInput{
			Name:         snap.Name,
			Environment:  snap.Environment,
			Driver:       snap.Driver,
			Host:         snap.Host,
			Port:         snap.Port,
			DatabaseName: snap.DatabaseName,
			Username:     snap.Username,
			Password:     snap.Password,
			SSLMode:      snap.SslMode,
		})
		if err != nil {
			skipped++
			continue
		}
		seen[key] = struct{}{}
		imported++
	}

	return imported, skipped, nil
}

func (s *Service) importScripts(
	ctx context.Context,
	userID, workspaceID int64,
	snapshots []ScriptSnapshot,
	mode string,
) (imported, skipped int, err error) {
	existing, err := s.q.ListSavedScriptsByWorkspace(ctx, workspaceID)
	if err != nil {
		return 0, 0, err
	}
	seen := map[string]struct{}{}
	for _, sc := range existing {
		seen[strings.ToLower(strings.TrimSpace(sc.Title))] = struct{}{}
	}

	for _, snap := range snapshots {
		title := strings.TrimSpace(snap.Title)
		if title == "" {
			skipped++
			continue
		}
		if mode == "merge" {
			if _, ok := seen[strings.ToLower(title)]; ok {
				skipped++
				continue
			}
		}

		created, err := s.scripts.Create(ctx, userID, script.CreateScriptRequest{
			WorkspaceID: workspaceID,
			Title:       title,
			SqlText:     snap.SqlText,
			Tags:        snap.Tags,
		})
		if err != nil {
			skipped++
			continue
		}

		if snap.IsFavorite {
			if _, err := s.scripts.SetFavorite(ctx, userID, created.ID, true); err != nil {
				return imported, skipped, err
			}
		}

		seen[strings.ToLower(title)] = struct{}{}
		imported++
	}

	return imported, skipped, nil
}

func validateBackup(backup ExportResponse) error {
	if backup.Format != FormatID {
		return fmt.Errorf("%w: unknown format %q", ErrInvalidBackup, backup.Format)
	}
	if backup.FormatVersion != FormatVersion {
		return fmt.Errorf("%w: unsupported format_version %d", ErrInvalidBackup, backup.FormatVersion)
	}
	if len(backup.Workspaces) > maxWorkspaces {
		return ErrBackupTooLarge
	}
	for _, ws := range backup.Workspaces {
		if len(ws.Connections) > maxConnectionsPerWS || len(ws.Scripts) > maxScriptsPerWS {
			return ErrBackupTooLarge
		}
	}
	return nil
}
