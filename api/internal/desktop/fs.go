package desktop

import (
	"os"
)

func mkdirAll(path string, perm os.FileMode) error {
	return os.MkdirAll(path, perm)
}
