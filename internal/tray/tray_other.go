//go:build !darwin

package tray

const Supported = false

func Start(h Handlers) error {
	return nil
}

func Stop() error {
	return nil
}
