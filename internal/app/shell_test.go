package app

import "testing"

// TestEnsureCommonPATHDirs verifies the fallback PATH augmentation: common macOS
// binary directories are appended only when missing, never duplicated, and the
// home-relative directories are skipped when no home is known.
func TestEnsureCommonPATHDirs(t *testing.T) {
	const home = "/Users/test"
	const common = "/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/Users/test/.local/bin:/Users/test/bin"

	tests := []struct {
		name string
		path string
		home string
		want string
	}{
		{
			name: "empty PATH gets all common dirs",
			path: "",
			home: home,
			want: common,
		},
		{
			name: "missing dirs appended after existing entries",
			path: "/usr/bin:/bin",
			home: home,
			want: "/usr/bin:/bin:" + common,
		},
		{
			name: "existing dirs are not duplicated",
			path: "/opt/homebrew/bin:/usr/bin",
			home: home,
			want: "/opt/homebrew/bin:/usr/bin:/opt/homebrew/sbin:/usr/local/bin:/Users/test/.local/bin:/Users/test/bin",
		},
		{
			name: "empty elements are dropped",
			path: "/usr/bin::/bin:",
			home: home,
			want: "/usr/bin:/bin:" + common,
		},
		{
			name: "all common dirs already present is unchanged",
			path: common,
			home: home,
			want: common,
		},
		{
			name: "empty home skips home-relative dirs",
			path: "/usr/bin",
			home: "",
			want: "/usr/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ensureCommonPATHDirs(tt.path, tt.home)
			if got != tt.want {
				t.Errorf("ensureCommonPATHDirs(%q, %q) = %q; want %q", tt.path, tt.home, got, tt.want)
			}
		})
	}
}
