//go:build !darwin

package tray

const Supported = false

func Start(_ Handlers) {}

func Stop() {}
