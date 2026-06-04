package workspace

import "errors"

var (
	ErrWorkspaceNotFound  = errors.New("workspace not found")
	ErrConnectionConflict = errors.New("connection already exists for this workspace name and environment")
	ErrInvalidInput       = errors.New("invalid input")
)
