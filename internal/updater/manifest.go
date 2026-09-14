package updater

// ManifestArtifact describes a single release artifact entry in the manifest.
// The manifest becomes the single source of truth for asset filenames, checksums,
// and sizes across all consumers (install.sh, unauthenticated_updater), avoiding
// per-consumer hardcoded GOOS/GOARCH→filename mappings that can drift from the
// actual build matrix.
type ManifestArtifact struct {
	OS       string `json:"os"`
	Arch     string `json:"arch"`
	Filename string `json:"filename"`
	SHA256   string `json:"sha256"`
	Size     int64  `json:"size"`
}

// Manifest aggregates release artifacts and metadata. Generated once per release
// from the actual build matrix output (see .github/workflows/job-build.yml) as a
// manifest.json asset in the GitHub release, then fetched by the unauthenticated
// path as the definitive reference for what was actually built.
type Manifest struct {
	Version     string             `json:"version"`
	ReleaseTag  string             `json:"release_tag"`
	GeneratedAt string             `json:"generated_at"`
	Artifacts   []ManifestArtifact `json:"artifacts"`
}

// FindArtifact scans the Artifacts list for a case-sensitive match on both OS
// and Arch, returning nil if none found (fail-closed — no fuzzy matching, no
// fallback).
func (m *Manifest) FindArtifact(goos, goarch string) *ManifestArtifact {
	for i := range m.Artifacts {
		if m.Artifacts[i].OS == goos && m.Artifacts[i].Arch == goarch {
			return &m.Artifacts[i]
		}
	}
	return nil
}
