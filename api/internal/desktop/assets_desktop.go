//go:build desktop

package desktop

import (
	"embed"
	"io/fs"
)

// WebDist contains the production Vite build copied to webdist/ before desktop build.
//
//go:embed all:webdist
var WebDist embed.FS

func WebAssets() (fs.FS, error) {
	sub, err := fs.Sub(WebDist, "webdist")
	if err != nil {
		return nil, err
	}
	return sub, nil
}
