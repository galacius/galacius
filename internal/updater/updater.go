package updater

import (
	"strings"

	"golang.org/x/mod/semver"
)

type Asset struct {
	Name               string `json:"name"`
	URL                string `json:"url"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

type Release struct {
	TagName      string  `json:"tag_name"`
	HTMLURL      string  `json:"html_url"`
	Body         string  `json:"body"`
	Assets       []Asset `json:"assets"`
	AssetURL     string  `json:"-"`
	DownloadSize int64   `json:"-"`
	// SHA256 is populated from manifest.json by both the authenticated and
	// unauthenticated paths, and is empty if the manifest was unavailable or
	// didn't list the current platform. Callers must treat empty as
	// "no integrity verification available" and fail closed.
	SHA256 string `json:"-"`
}

// checkHomebrewManaged is overridable in tests. Unlike the apt check (which
// is keyed off os.Executable()'s path and so never false-positives when run
// as a `go test` binary), IsHomebrewCaskroomPath probes the real machine's
// filesystem/brew state unconditionally — on a dev machine that actually has
// galacius installed via Homebrew, leaving this wired to the real function
// would make Check() short-circuit in every test. See TestMain in
// updater_test.go.
var checkHomebrewManaged = IsHomebrewCaskroomPath

// SetCheckHomebrewManagedForTest overrides the Homebrew-managed-install probe
// used by Check, for tests in other packages (e.g. internal/app) that call
// Check indirectly and would otherwise be coupled to the real test machine's
// actual Homebrew/Caskroom state — see the checkHomebrewManaged doc comment.
// Returns a restore func that puts back the previous probe.
func SetCheckHomebrewManagedForTest(fn func() bool) (restore func()) {
	prev := checkHomebrewManaged
	checkHomebrewManaged = fn
	return func() { checkHomebrewManaged = prev }
}

// Check returns the latest release if it is newer than current, or (nil, nil)
// if current is up-to-date, a dev build, or no update is needed.
// Returns (nil, error) if a transient failure occurs (network error, rate limit, etc.).
// token is optional; when non-empty it is sent as a Bearer header so that
// private repositories can be queried.
func Check(current, token string) (*Release, error) {
	if current == "dev" || !semver.IsValid(current) {
		return nil, nil
	}

	if token != "" {
		return checkAuthenticated(current, token)
	}

	tag, err := resolveLatestTagUnauthenticated()
	if err != nil {
		return nil, err
	}
	latest := tag
	if !strings.HasPrefix(latest, "v") {
		latest = "v" + latest
	}
	if !semver.IsValid(latest) || semver.Compare(latest, current) <= 0 {
		return nil, nil
	}
	return unauthenticatedRelease(tag)
}

// FetchRelease returns the named release (adding a leading "v" if the tag
// omits one) with its platform asset resolved, regardless of whether it is
// newer than any particular current version. Used when the caller already
// knows which version to install. Retries transient failures up to 3 times
// with exponential backoff, but short-circuits on rate-limit errors.
func FetchRelease(tag, token string) (*Release, error) {
	if !strings.HasPrefix(tag, "v") {
		tag = "v" + tag
	}

	if token != "" {
		return retryRelease(func() (*Release, error) { return fetchReleaseAuthenticated(tag, token) })
	}

	return retryRelease(func() (*Release, error) { return unauthenticatedRelease(tag) })

}
