package app

import (
	"testing"
)

// --- isActive ---

func TestIsActive(t *testing.T) {
	tests := []struct {
		name          string
		activeContext string
		query         string
		want          bool
	}{
		{"matches active context", "prod", "prod", true},
		{"does not match different context", "prod", "staging", false},
		{"empty active context", "", "prod", false},
		{"both empty", "", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			a := &App{activeContext: tt.activeContext}
			if got := a.isActive(tt.query); got != tt.want {
				t.Errorf("isActive(%q) = %v; want %v", tt.query, got, tt.want)
			}
		})
	}
}
