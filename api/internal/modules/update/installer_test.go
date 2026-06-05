package update

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDownloadVerified(t *testing.T) {
	t.Parallel()

	payload := []byte("kueri-binary-payload")
	sum := sha256.Sum256(payload)
	digest := hex.EncodeToString(sum[:])

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(payload)
	}))
	defer srv.Close()

	tmp, err := downloadVerified(context.Background(), srv.Client(), srv.URL, digest, int64(len(payload)))
	if err != nil {
		t.Fatalf("downloadVerified() error = %v", err)
	}
	t.Cleanup(func() { _ = os.Remove(tmp) })

	got, err := os.ReadFile(tmp)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(payload) {
		t.Fatalf("payload mismatch")
	}
}

func TestDownloadVerifiedMismatch(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("bad"))
	}))
	defer srv.Close()

	_, err := downloadVerified(context.Background(), srv.Client(), srv.URL, "deadbeef", 0)
	if err == nil || !strings.Contains(err.Error(), "sha256 mismatch") {
		t.Fatalf("expected sha256 mismatch, got %v", err)
	}
}

func TestReplaceExecutable(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	target := filepath.Join(dir, "kueri")
	source := filepath.Join(dir, "kueri-new")

	if err := os.WriteFile(target, []byte("old"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(source, []byte("new"), 0o755); err != nil {
		t.Fatal(err)
	}

	if err := replaceExecutable(target, source); err != nil {
		t.Fatalf("replaceExecutable() error = %v", err)
	}

	got, err := os.ReadFile(target)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "new" {
		t.Fatalf("target = %q, want %q", got, "new")
	}
	if _, err := os.Stat(source); !os.IsNotExist(err) {
		t.Fatalf("source should be moved, err = %v", err)
	}
}

func TestManifestURLForVersion(t *testing.T) {
	t.Parallel()

	got := ManifestURLForVersion("1.2.3")
	want := "https://github.com/tetradatateknologi/kueri/releases/download/v1.2.3/latest.json"
	if got != want {
		t.Fatalf("ManifestURLForVersion() = %q, want %q", got, want)
	}
}
