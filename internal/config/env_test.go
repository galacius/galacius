package config

import (
	"os"
	"testing"
)

// Test_getEnvOrDefault_UnsetEnvReturnsDefault verifies that unset env var returns default.
func Test_getEnvOrDefault_UnsetEnvReturnsDefault(t *testing.T) {
	result := getEnvOrDefault("DEFINITELY_NOT_SET_VAR_XYZ", "default_value")
	if result != "default_value" {
		t.Errorf("expected default value for unset env var, got %s", result)
	}
}

// Test_getEnvOrDefault_EmptyStringVsUnset verifies that empty string is distinguished from unset.
func Test_getEnvOrDefault_EmptyStringVsUnset(t *testing.T) {
	t.Setenv("TEST_EMPTY_VAR", "")

	// When set to empty string, getEnvOrDefault should return the empty string, not the default
	result := getEnvOrDefault("TEST_EMPTY_VAR", "default_value")
	if result != "" {
		t.Errorf("expected empty string when env var is set to empty, got %s", result)
	}

	// When unset, it should return the default
	result2 := getEnvOrDefault("UNSET_VAR_DEFINITELY", "default_value")
	if result2 != "default_value" {
		t.Errorf("expected default value for truly unset var, got %s", result2)
	}
}

// Test_GetInstallScriptURL_DefaultAndOverride verifies default vs. override behavior.
// Run as subtests of one parent so the unset case can't be polluted by t.Setenv
// leaking into a later test (t.Setenv has no way to unset a var once set).
func Test_GetInstallScriptURL_DefaultAndOverride(t *testing.T) {
	t.Run("default when unset", func(t *testing.T) {
		result := GetInstallScriptURL()
		expected := "https://raw.githubusercontent.com/galacius/galacius/master/scripts/install.sh"
		if result != expected {
			t.Errorf("expected default URL %s, got %s", expected, result)
		}
	})

	t.Run("override when set", func(t *testing.T) {
		customURL := "https://custom.example.com/install.sh"
		t.Setenv("INSTALL_SCRIPT_URL", customURL)

		result := GetInstallScriptURL()
		if result != customURL {
			t.Errorf("expected custom URL %s, got %s", customURL, result)
		}
	})
}

// Test_GetInstallScriptURL_EmptyStringWhenSetToEmpty verifies empty string overrides default.
func Test_GetInstallScriptURL_EmptyStringWhenSetToEmpty(t *testing.T) {
	t.Setenv("INSTALL_SCRIPT_URL", "")

	result := GetInstallScriptURL()
	if result != "" {
		t.Errorf("expected empty string when INSTALL_SCRIPT_URL is set to empty, got %s", result)
	}
}

// Test_GetReleasesBaseURL_DefaultAndOverride verifies default vs. override behavior.
// Run as subtests of one parent so the unset case can't be polluted by t.Setenv
// leaking into a later test (t.Setenv has no way to unset a var once set).
func Test_GetReleasesBaseURL_DefaultAndOverride(t *testing.T) {
	t.Run("default when unset", func(t *testing.T) {
		result := GetReleasesBaseURL()
		expected := "https://github.com/galacius/galacius"
		if result != expected {
			t.Errorf("expected default URL %s, got %s", expected, result)
		}
	})

	t.Run("override when set", func(t *testing.T) {
		customURL := "https://custom-releases.example.com"
		t.Setenv("APP_VERSION_RELEASES_BASE_URL", customURL)

		result := GetReleasesBaseURL()
		if result != customURL {
			t.Errorf("expected custom URL %s, got %s", customURL, result)
		}
	})
}

// Test_GetReleasesBaseURL_EmptyStringWhenSetToEmpty verifies empty string overrides default.
func Test_GetReleasesBaseURL_EmptyStringWhenSetToEmpty(t *testing.T) {
	t.Setenv("APP_VERSION_RELEASES_BASE_URL", "")

	result := GetReleasesBaseURL()
	if result != "" {
		t.Errorf("expected empty string when APP_VERSION_RELEASES_BASE_URL is set to empty, got %s", result)
	}
}

// Test_GetMarketplaceBaseURL_DefaultAndOverride verifies default vs. override behavior,
// independent of APP_VERSION_RELEASES_BASE_URL.
func Test_GetMarketplaceBaseURL_DefaultAndOverride(t *testing.T) {
	t.Run("default when unset", func(t *testing.T) {
		result := GetMarketplaceBaseURL()
		expected := "https://github.com/galacius/galacius-plugins"
		if result != expected {
			t.Errorf("expected default URL %s, got %s", expected, result)
		}
	})

	t.Run("override when set", func(t *testing.T) {
		customURL := "https://custom-marketplace.example.com"
		t.Setenv("MARKETPLACE_BASE_URL", customURL)

		result := GetMarketplaceBaseURL()
		if result != customURL {
			t.Errorf("expected custom URL %s, got %s", customURL, result)
		}
	})

	t.Run("independent of APP_VERSION_RELEASES_BASE_URL", func(t *testing.T) {
		t.Setenv("APP_VERSION_RELEASES_BASE_URL", "https://releases.example.com")

		result := GetMarketplaceBaseURL()
		expected := "https://github.com/galacius/galacius-plugins"
		if result != expected {
			t.Errorf("expected GetMarketplaceBaseURL to ignore APP_VERSION_RELEASES_BASE_URL, got %s", result)
		}
	})
}

// Test_GetMarketplaceBaseURL_EmptyStringWhenSetToEmpty verifies empty string overrides default.
func Test_GetMarketplaceBaseURL_EmptyStringWhenSetToEmpty(t *testing.T) {
	t.Setenv("MARKETPLACE_BASE_URL", "")

	result := GetMarketplaceBaseURL()
	if result != "" {
		t.Errorf("expected empty string when MARKETPLACE_BASE_URL is set to empty, got %s", result)
	}
}

// Test_getEnvOrDefault_WithWhitespacePreservesIt verifies whitespace is preserved in values.
func Test_getEnvOrDefault_WithWhitespacePreservesIt(t *testing.T) {
	valueWithSpaces := "  https://example.com/path  "
	t.Setenv("TEST_WHITESPACE_VAR", valueWithSpaces)

	result := getEnvOrDefault("TEST_WHITESPACE_VAR", "default")
	if result != valueWithSpaces {
		t.Errorf("expected whitespace to be preserved, got %q", result)
	}
}

// Test_GetReleasesBaseURL_SpecialCharactersInURL verifies special chars are preserved.
func Test_GetReleasesBaseURL_SpecialCharactersInURL(t *testing.T) {
	specialURL := "https://example.com/api?token=abc123&version=latest#v1"
	t.Setenv("APP_VERSION_RELEASES_BASE_URL", specialURL)

	result := GetReleasesBaseURL()
	if result != specialURL {
		t.Errorf("expected special characters to be preserved, got %s", result)
	}
}

// Test_IsMarketplaceEnabled_DefaultAndOverride verifies default (true) vs. override behavior.
func Test_IsMarketplaceEnabled_DefaultAndOverride(t *testing.T) {
	t.Run("default when unset", func(t *testing.T) {
		t.Setenv("MARKETPLACE_ENABLED", "")
		os.Unsetenv("MARKETPLACE_ENABLED")

		result := IsMarketplaceEnabled()
		if result != true {
			t.Errorf("expected default true for unset MARKETPLACE_ENABLED, got %v", result)
		}
	})

	t.Run("override to false when set", func(t *testing.T) {
		t.Setenv("MARKETPLACE_ENABLED", "false")

		result := IsMarketplaceEnabled()
		if result != false {
			t.Errorf("expected false when MARKETPLACE_ENABLED is set to false, got %v", result)
		}
	})

	t.Run("override to true when explicitly set", func(t *testing.T) {
		t.Setenv("MARKETPLACE_ENABLED", "true")

		result := IsMarketplaceEnabled()
		if result != true {
			t.Errorf("expected true when MARKETPLACE_ENABLED is set to true, got %v", result)
		}
	})
}

// Test_IsPrivateRepoAccess_DefaultAndOverride verifies default (false) vs. override behavior.
func Test_IsPrivateRepoAccess_DefaultAndOverride(t *testing.T) {
	t.Run("default when unset", func(t *testing.T) {
		result := IsPrivateRepoAccess()
		if result != false {
			t.Errorf("expected default false for unset PRIVATE_REPO_ACCESS, got %v", result)
		}
	})

	t.Run("override to true when set", func(t *testing.T) {
		t.Setenv("PRIVATE_REPO_ACCESS", "true")

		result := IsPrivateRepoAccess()
		if result != true {
			t.Errorf("expected true when PRIVATE_REPO_ACCESS is set to true, got %v", result)
		}
	})

	t.Run("override to false when explicitly set", func(t *testing.T) {
		t.Setenv("PRIVATE_REPO_ACCESS", "false")

		result := IsPrivateRepoAccess()
		if result != false {
			t.Errorf("expected false when PRIVATE_REPO_ACCESS is set to false, got %v", result)
		}
	})
}

// Test_GetRootDirOverride_DefaultAndOverride verifies default (empty) vs. override behavior.
func Test_GetRootDirOverride_DefaultAndOverride(t *testing.T) {
	t.Run("default empty when unset", func(t *testing.T) {
		result := GetRootDirOverride()
		if result != "" {
			t.Errorf("expected default empty string for unset GALACIUS_ROOT_DIR, got %q", result)
		}
	})

	t.Run("override when set", func(t *testing.T) {
		customPath := "/custom/galacius/dir"
		t.Setenv("GALACIUS_ROOT_DIR", customPath)

		result := GetRootDirOverride()
		if result != customPath {
			t.Errorf("expected custom path %q, got %q", customPath, result)
		}
	})

	t.Run("preserves empty string when explicitly set", func(t *testing.T) {
		t.Setenv("GALACIUS_ROOT_DIR", "")

		result := GetRootDirOverride()
		if result != "" {
			t.Errorf("expected empty string when GALACIUS_ROOT_DIR is set to empty, got %q", result)
		}
	})
}

// Test_getBoolEnvOrDefault_MalformedValueFallsBackToDefault verifies that invalid
// bool values (e.g., "notabool") are rejected and the default is returned instead.
func Test_getBoolEnvOrDefault_MalformedValueFallsBackToDefault(t *testing.T) {
	tests := []struct {
		name         string
		envValue     string
		defaultVal   bool
		expectedBool bool
	}{
		{"invalid string with true default", "notabool", true, true},
		{"invalid string with false default", "notabool", false, false},
		{"random text with true default", "random123", true, true},
		{"random text with false default", "random123", false, false},
		{"empty string with true default", "", true, true},
		{"empty string with false default", "", false, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("TEST_BOOL_VAR", tt.envValue)

			result := getBoolEnvOrDefault("TEST_BOOL_VAR", tt.defaultVal)
			if result != tt.expectedBool {
				t.Errorf("getBoolEnvOrDefault with env=%q, default=%v: expected %v, got %v",
					tt.envValue, tt.defaultVal, tt.expectedBool, result)
			}
		})
	}
}

// Test_getBoolEnvOrDefault_ValidValues verifies that valid bool strings
// (true/false case-insensitive, 1/0) parse correctly.
func Test_getBoolEnvOrDefault_ValidValues(t *testing.T) {
	tests := []struct {
		name         string
		envValue     string
		expectedBool bool
	}{
		{"lowercase true", "true", true},
		{"lowercase false", "false", false},
		{"uppercase TRUE", "TRUE", true},
		{"uppercase FALSE", "FALSE", false},
		{"mixedcase True", "True", true},
		{"mixedcase False", "False", false},
		{"1 as true", "1", true},
		{"0 as false", "0", false},
		{"t as true", "t", true},
		{"f as false", "f", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("TEST_BOOL_VAR", tt.envValue)

			result := getBoolEnvOrDefault("TEST_BOOL_VAR", false)
			if result != tt.expectedBool {
				t.Errorf("getBoolEnvOrDefault with env=%q: expected %v, got %v",
					tt.envValue, tt.expectedBool, result)
			}
		})
	}
}
