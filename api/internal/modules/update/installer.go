package update

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Apply downloads and replaces the current executable when a newer release exists.
func Apply(ctx context.Context, opts Options) error {
	checker := NewChecker(opts)
	result, err := checker.Check(ctx)
	if err != nil {
		return err
	}

	if !result.UpdateAvailable {
		fmt.Println("Kueri is already up to date.")
		return nil
	}

	tmp, err := downloadVerified(ctx, checker.client, result.DownloadURL, result.SHA256, result.Size)
	if err != nil {
		return err
	}
	defer os.Remove(tmp)

	execPath, err := currentExecutable()
	if err != nil {
		return err
	}

	if err := replaceExecutable(execPath, tmp); err != nil {
		return err
	}

	fmt.Printf("Updated Kueri %s -> %s\n", result.CurrentVersion, result.LatestVersion)
	fmt.Printf("Binary: %s\n", execPath)
	fmt.Println("Restart Kueri to use the new version.")
	return nil
}

func ManifestURLForVersion(version string) string {
	version = strings.TrimPrefix(strings.TrimSpace(version), "v")
	return fmt.Sprintf("https://github.com/tetradatateknologi/kueri/releases/download/v%s/latest.json", version)
}

func downloadVerified(ctx context.Context, client *http.Client, url, expectedSHA string, expectedSize int64) (string, error) {
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Minute}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", fmt.Errorf("create download request: %w", err)
	}

	res, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("download binary: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download status %d", res.StatusCode)
	}

	tmp, err := os.CreateTemp("", "kueri-update-*")
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmp.Name()

	hasher := sha256.New()
	writer := io.MultiWriter(tmp, hasher)
	n, err := io.Copy(writer, io.LimitReader(res.Body, 512<<20))
	if closeErr := tmp.Close(); err == nil && closeErr != nil {
		os.Remove(tmpPath)
		return "", fmt.Errorf("close temp file: %w", closeErr)
	}
	if err != nil {
		os.Remove(tmpPath)
		return "", fmt.Errorf("write download: %w", err)
	}

	if expectedSize > 0 && n != expectedSize {
		os.Remove(tmpPath)
		return "", fmt.Errorf("download size mismatch: expected %d, got %d", expectedSize, n)
	}

	actual := hex.EncodeToString(hasher.Sum(nil))
	if !strings.EqualFold(actual, strings.TrimSpace(expectedSHA)) {
		os.Remove(tmpPath)
		return "", fmt.Errorf("sha256 mismatch: expected %s, got %s", expectedSHA, actual)
	}

	if err := os.Chmod(tmpPath, 0o755); err != nil {
		os.Remove(tmpPath)
		return "", fmt.Errorf("chmod temp binary: %w", err)
	}

	return tmpPath, nil
}

func currentExecutable() (string, error) {
	path, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("resolve executable: %w", err)
	}
	path, err = filepath.EvalSymlinks(path)
	if err != nil {
		return "", fmt.Errorf("resolve symlinks: %w", err)
	}
	return path, nil
}

func replaceExecutable(target, source string) error {
	info, err := os.Stat(target)
	if err != nil {
		return fmt.Errorf("stat current binary: %w", err)
	}

	backup := target + ".bak"
	_ = os.Remove(backup)

	if err := os.Rename(target, backup); err != nil {
		return fmt.Errorf("backup current binary: %w", err)
	}

	if err := os.Rename(source, target); err != nil {
		_ = os.Rename(backup, target)
		return fmt.Errorf("install new binary: %w", err)
	}

	mode := info.Mode() | 0o111
	if err := os.Chmod(target, mode); err != nil {
		return fmt.Errorf("chmod installed binary: %w", err)
	}

	_ = os.Remove(backup)
	return nil
}
