package schema

import "testing"

func TestErdTableID(t *testing.T) {
	got := erdTableID("public", "users")
	want := "public.users"
	if got != want {
		t.Fatalf("erdTableID() = %q, want %q", got, want)
	}
}

func TestErdRelationID(t *testing.T) {
	got := erdRelationID("public", "users", "port_id", "public", "ports", "id")
	want := "public_users_port_id_public_ports_id"
	if got != want {
		t.Fatalf("erdRelationID() = %q, want %q", got, want)
	}
}

func TestErdResponseEmptySlices(t *testing.T) {
	resp := ErdResponse{
		ConnectionID: 1,
		Database:     "test",
		Driver:       "postgres",
		Schemas:      []string{},
		Tables:       []ErdTableNode{},
		Relations:    []ErdRelation{},
	}
	if len(resp.Tables) != 0 {
		t.Fatalf("expected empty tables slice")
	}
	if len(resp.Relations) != 0 {
		t.Fatalf("expected empty relations slice")
	}
}

func TestErdColumnFlags(t *testing.T) {
	col := ErdColumn{
		Name:         "id",
		DataType:     "bigint",
		IsNullable:   false,
		IsPrimaryKey: true,
		IsForeignKey: false,
	}
	if !col.IsPrimaryKey || col.IsForeignKey {
		t.Fatalf("unexpected column flags: %+v", col)
	}
}
