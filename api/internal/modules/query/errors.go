package query

import "errors"

var (
	ErrConnectionNotFound = errors.New("connection not found")
	ErrInvalidFilter      = errors.New("invalid filter")
)
