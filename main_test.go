package main

import (
	"testing"

	"github.com/galacius/galacius/internal/config"
)

func TestSingleInstanceUniqueID(t *testing.T) {
	if got, want := singleInstanceUniqueID("1.2.3"), "io.github.gknguyen.galacius"; got != want {
		t.Errorf("release ID = %q, want %q", got, want)
	}
	if got, want := singleInstanceUniqueID(config.Dev), "io.github.gknguyen.galacius.dev"; got != want {
		t.Errorf("dev ID = %q, want %q", got, want)
	}
}
