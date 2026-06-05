package update

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"runtime"
	"testing"
)

func TestChecker_Check(t *testing.T) {
	t.Parallel()

	platform := RuntimePlatform()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(Manifest{
			Version:             "0.2.0",
			MinSupportedVersion: "0.1.0",
			NotesURL:            "https://example.com/release",
			Platforms: map[string]PlatformArtifact{
				platform: {
					URL:    "https://example.com/kueri_0.2.0",
					SHA256: "abc",
					Size:   123,
				},
			},
		})
	}))
	defer srv.Close()

	checker := NewChecker(Options{
		CurrentVersion: "0.1.0",
		ManifestURL:    srv.URL,
	})

	result, err := checker.Check(context.Background())
	if err != nil {
		t.Fatalf("Check() error = %v", err)
	}
	if !result.UpdateAvailable {
		t.Fatal("expected update available")
	}
	if result.LatestVersion != "0.2.0" {
		t.Fatalf("LatestVersion = %q", result.LatestVersion)
	}
	if result.DownloadURL == "" {
		t.Fatal("expected download url")
	}
}

func TestRuntimePlatform(t *testing.T) {
	t.Parallel()
	platform := RuntimePlatform()
	if platform == "" {
		t.Fatal("expected non-empty platform")
	}
	switch runtime.GOOS {
	case "darwin":
		want := "darwin-" + runtime.GOARCH
		if platform != want {
			t.Fatalf("RuntimePlatform() = %q, want %q", platform, want)
		}
	}
}
