package query

import "errors"

var (
	ErrConnectionNotFound = errors.New("connection not found")
	ErrInvalidFilter      = errors.New("invalid filter")
	ErrMultipleStatements = errors.New("only one SQL statement can be executed at a time")
)
