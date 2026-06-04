//go:build !desktop

package desktop

import (
	"errors"
	"io/fs"
)

func WebAssets() (fs.FS, error) {
	return nil, errors.New("desktop web assets not embedded; build with -tags desktop")
}
