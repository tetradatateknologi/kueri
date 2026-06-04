package authz

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/tetradatateknologi/kueri/api/db/sqlc"
)

var ErrWorkspaceNotFound = errors.New("workspace not found")

func EnsureWorkspaceOwner(ctx context.Context, q *sqlc.Queries, userID, workspaceID int64) error {
	ws, err := q.GetWorkspaceByID(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrWorkspaceNotFound
		}
		return err
	}
	if ws.UserID != userID {
		return ErrWorkspaceNotFound
	}
	return nil
}
