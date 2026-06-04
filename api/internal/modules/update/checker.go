package update

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
)

const defaultManifestURL = "https://github.com/tetradatateknologi/kueri/releases/latest/download/latest.json"

type Options struct {
	CurrentVersion string
	ManifestURL    string
	HTTPClient     *http.Client
}

type Manifest struct {
	Version             string                       `json:"version"`
	ReleaseDate         string                       `json:"release_date"`
	MinSupportedVersion string                       `json:"min_supported_version"`
	NotesURL            string                       `json:"notes_url"`
	Platforms           map[string]PlatformArtifact  `json:"platforms"`
}

type PlatformArtifact struct {
	URL    string `json:"url"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size"`
}

type CheckResult struct {
	CurrentVersion      string `json:"current_version"`
	LatestVersion       string `json:"latest_version"`
	UpdateAvailable     bool   `json:"update_available"`
	ForceUpdate         bool   `json:"force_update"`
	ReleaseNotesURL     string `json:"release_notes_url"`
	DownloadURL         string `json:"download_url,omitempty"`
	SHA256              string `json:"sha256,omitempty"`
	Size                int64  `json:"size,omitempty"`
	Platform            string `json:"platform"`
	ManifestURL         string `json:"manifest_url"`
}

type Checker struct {
	currentVersion string
	manifestURL    string
	client         *http.Client
}

func NewChecker(opts Options) *Checker {
	url := strings.TrimSpace(opts.ManifestURL)
	if url == "" {
		url = defaultManifestURL
	}
	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &Checker{
		currentVersion: strings.TrimSpace(opts.CurrentVersion),
		manifestURL:    url,
		client:         client,
	}
}

func (c *Checker) Check(ctx context.Context) (*CheckResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.manifestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	res, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch manifest: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("manifest status %d", res.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("read manifest: %w", err)
	}

	var manifest Manifest
	if err := json.Unmarshal(body, &manifest); err != nil {
		return nil, fmt.Errorf("parse manifest: %w", err)
	}

	platform := RuntimePlatform()
	artifact, ok := manifest.Platforms[platform]
	if !ok {
		return nil, fmt.Errorf("no artifact for platform %q", platform)
	}

	current, err := semver.NewVersion(c.currentVersion)
	if err != nil {
		return nil, fmt.Errorf("parse current version: %w", err)
	}
	latest, err := semver.NewVersion(manifest.Version)
	if err != nil {
		return nil, fmt.Errorf("parse latest version: %w", err)
	}

	forceUpdate := false
	if manifest.MinSupportedVersion != "" {
		minSupported, err := semver.NewVersion(manifest.MinSupportedVersion)
		if err == nil && current.LessThan(minSupported) {
			forceUpdate = true
		}
	}

	notesURL := manifest.NotesURL
	if notesURL == "" {
		notesURL = strings.TrimSuffix(c.manifestURL, "/latest.json")
	}

	return &CheckResult{
		CurrentVersion:  c.currentVersion,
		LatestVersion:   manifest.Version,
		UpdateAvailable: latest.GreaterThan(current),
		ForceUpdate:     forceUpdate,
		ReleaseNotesURL: notesURL,
		DownloadURL:     artifact.URL,
		SHA256:          artifact.SHA256,
		Size:            artifact.Size,
		Platform:        platform,
		ManifestURL:     c.manifestURL,
	}, nil
}

func RuntimePlatform() string {
	switch runtime.GOOS {
	case "darwin":
		return "darwin-universal"
	case "windows":
		return "windows-amd64"
	case "linux":
		return "linux-amd64"
	default:
		return runtime.GOOS + "-" + runtime.GOARCH
	}
}
