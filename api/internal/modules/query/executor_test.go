package query

import (
	"context"
	"errors"
	"testing"
)

func TestExecute_RejectsMultipleStatements(t *testing.T) {
	e := &Executor{}

	_, err := e.Execute(
		context.Background(),
		1,
		1,
		"select distinct type from employee_dropdown_options;\n\nselect * from employee_dropdown_options\nwhere type = 'Eselon';",
		20,
		0,
		nil,
	)

	if !errors.Is(err, ErrMultipleStatements) {
		t.Fatalf("expected ErrMultipleStatements, got %v", err)
	}
}
