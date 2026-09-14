package config

import (
	"encoding/json"
	"errors"
	"os"

	"github.com/galacius/galacius/internal/storage"
)

type ClusterProxy struct {
	HttpProxy    string `json:"httpProxy"`
	HttpsProxy   string `json:"httpsProxy"`
	SetupCommand string `json:"setupCommand"`
}

type MarketplaceRepository struct {
	URL         string `json:"url"`
	Private     bool   `json:"private"`
	AccessToken string `json:"accessToken"`
	Locked      bool   `json:"locked"`
	Disabled    bool   `json:"disabled"`
}

type Settings struct {
	AccessToken                     string                  `json:"accessToken"`
	ClusterProxies                  map[string]ClusterProxy `json:"clusterProxies"`
	ClusterDefaultNamespaces        map[string][]string     `json:"clusterDefaultNamespaces"`
	ShellPath                       string                  `json:"shellPath"`
	KubeconfigPaths                 []string                `json:"kubeconfigPaths"`
	Locale                          string                  `json:"locale"`
	PluginDisabledState             map[string]bool         `json:"pluginDisabledState"`
	MarketplaceRepositories         []MarketplaceRepository `json:"marketplaceRepositories"`
	ProxySetupEnabled               bool                    `json:"proxySetupEnabled"`
	ProxyHealthCheckIntervalSeconds int                     `json:"proxyHealthCheckIntervalSeconds"`
}

// legacySettings is used internally for migration only: it mirrors the old flat structure.
type legacySettings struct {
	MarketplaceRepoURL     string `json:"marketplaceRepoURL"`
	MarketplacePrivate     bool   `json:"marketplacePrivate"`
	MarketplaceAccessToken string `json:"marketplaceAccessToken"`
}

func Load() (Settings, error) {
	path, err := settingsPath()
	if err != nil {
		return Settings{}, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return withDefaultMarketplaceRepo(Settings{}, nil), nil
	}
	if err != nil {
		return Settings{}, err
	}

	var s Settings
	if err := unmarshalAndMigrate(data, &s); err != nil {
		return Settings{}, err
	}

	return s, nil
}

// unmarshalAndMigrate unmarshals JSON data into Settings and applies legacy field migration.
func unmarshalAndMigrate(data []byte, s *Settings) error {
	if err := json.Unmarshal(data, s); err != nil {
		return err
	}

	// Migration: if MarketplaceRepositories is empty and the JSON contains old flat fields,
	// convert them into a single array entry.
	if len(s.MarketplaceRepositories) == 0 {
		var legacy legacySettings
		if err := json.Unmarshal(data, &legacy); err == nil && legacy.MarketplaceRepoURL != "" {
			s.MarketplaceRepositories = []MarketplaceRepository{
				{
					URL:         legacy.MarketplaceRepoURL,
					Private:     legacy.MarketplacePrivate,
					AccessToken: legacy.MarketplaceAccessToken,
				},
			}
		}
	}

	*s = withDefaultMarketplaceRepo(*s, data)

	return nil
}

// withDefaultMarketplaceRepo provisions the official galacius marketplace
// (GetMarketplaceBaseURL) as the first MarketplaceRepositories entry, but
// only for settings that have never persisted a "marketplaceRepositories"
// key at all — a fresh install (rawJSON nil), or a legacy config that
// predates this field and had no old-format marketplace URL either. Once a
// settings.json has been saved with this key present, even as an empty
// array (the user removed every repository, including the default), that
// choice is final: GetMarketplaceBaseURL is never consulted again. This is
// what lets GetPluginsFromMarketplace treat MarketplaceRepositories as the
// single source of truth with no implicit built-in source of its own.
func withDefaultMarketplaceRepo(s Settings, rawJSON []byte) Settings {
	if len(s.MarketplaceRepositories) != 0 {
		return s
	}

	if rawJSON != nil {
		var probe map[string]json.RawMessage
		if err := json.Unmarshal(rawJSON, &probe); err == nil {
			if _, hasKey := probe["marketplaceRepositories"]; hasKey {
				return s
			}
		}
	}

	s.MarketplaceRepositories = []MarketplaceRepository{{URL: GetMarketplaceBaseURL()}}
	return s
}

func Save(s Settings) error {
	path, err := settingsPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(storage.Dir(), 0o700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func settingsPath() (string, error) {
	return storage.Dir("settings.json"), nil
}
