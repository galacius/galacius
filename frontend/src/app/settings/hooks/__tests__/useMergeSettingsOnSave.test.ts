import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { config } from "@wailsjs/go/models";
import { useMergeSettingsOnSave } from "../useMergeSettingsOnSave";
import { QUERY_KEY_SETTINGS } from "../../api/api.const";

// ─── hoisted mocks ──────────────────────────────────────────────────────────

const saveSettingsMock = vi.hoisted(() => vi.fn());
const getSettingsMock = vi.hoisted(() => vi.fn());

vi.mock("@wailsjs/go/app/App", () => ({
  SaveSettings: saveSettingsMock,
  GetSettings: getSettingsMock,
}));

// ─── helpers ────────────────────────────────────────────────────────────────

interface TestSettings extends Partial<config.Settings> {
  shellPath?: string;
  accessToken?: string;
  marketplaceRepositories?: config.MarketplaceRepository[];
  kubeconfigPaths?: string[];
  locale?: string;
}

function makeMockSettings(overrides?: TestSettings): config.Settings {
  const base = {
    shellPath: "/bin/bash",
    accessToken: "existing_token",
    marketplaceRepositories: [
      {
        url: "https://github.com/default/marketplace",
        private: false,
        accessToken: "default_marketplace_token",
      },
    ],
    kubeconfigPaths: ["/home/.kube/config"],
    locale: "UTC",
  };
  return config.Settings.createFrom({ ...base, ...overrides });
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

// ─── setup ──────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  saveSettingsMock.mockResolvedValue(undefined);
  getSettingsMock.mockResolvedValue(makeMockSettings());
});

// ─── tests ──────────────────────────────────────────────────────────────────

describe("useMergeSettingsOnSave", () => {
  describe("basic merge behavior", () => {
    it("merges updates onto cached settings and calls SaveSettings", async () => {
      const { wrapper, client } = makeWrapper();
      const cachedSettings = makeMockSettings({ shellPath: "/bin/zsh" });
      client.setQueryData([QUERY_KEY_SETTINGS], cachedSettings);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      await act(async () => {
        await result.current({
          shellPath: "/bin/fish",
        });
      });

      expect(saveSettingsMock).toHaveBeenCalledOnce();
      const savedSettings = saveSettingsMock.mock.calls[0][0];
      expect(savedSettings.shellPath).toBe("/bin/fish");
      // Verify other fields are preserved
      expect(savedSettings.accessToken).toBe("existing_token");
    });

    it("preserves multiple unrelated fields when updating one section", async () => {
      const { wrapper, client } = makeWrapper();
      const cachedSettings = makeMockSettings({
        shellPath: "/bin/bash",
        accessToken: "saved_token",
      });
      client.setQueryData([QUERY_KEY_SETTINGS], cachedSettings);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      await act(async () => {
        await result.current({
          locale: "PST",
        });
      });

      const savedSettings = saveSettingsMock.mock.calls[0][0];
      expect(savedSettings.shellPath).toBe("/bin/bash");
      expect(savedSettings.accessToken).toBe("saved_token");
      expect(savedSettings.locale).toBe("PST");
    });
  });

  describe("critical: undefined cache scenario (CLOBBERING RISK)", () => {
    it("should fetch full settings from backend when cache is undefined", async () => {
      const { wrapper, client } = makeWrapper();
      // Do NOT set any cached data - simulates cache miss or not yet populated
      expect(client.getQueryData([QUERY_KEY_SETTINGS])).toBeUndefined();

      // Mock GetSettings to return a complete settings object
      const completeSettings = makeMockSettings({
        shellPath: "/bin/zsh",
        accessToken: "existing_token",
        marketplaceRepositories: [
          {
            url: "https://github.com/existing/marketplace",
            private: false,
            accessToken: "",
            locked: false,
            disabled: false,
          },
        ],
      });
      getSettingsMock.mockResolvedValueOnce(completeSettings);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      await act(async () => {
        await result.current({
          shellPath: "/bin/fish", // Only updating Terminal section
        });
      });

      // CRITICAL: Verify GetSettings was called to fill the cache gap
      expect(getSettingsMock).toHaveBeenCalledOnce();

      // CRITICAL: Verify the saved settings contain ALL fields, not just the update
      expect(saveSettingsMock).toHaveBeenCalledOnce();
      const savedSettings = saveSettingsMock.mock.calls[0][0];

      // The update is applied
      expect(savedSettings.shellPath).toBe("/bin/fish");

      // But ALL other fields from the backend are preserved (not wiped to zero-value)
      expect(savedSettings.accessToken).toBe("existing_token");
      expect(savedSettings.marketplaceRepositories?.[0]?.url).toBe(
        "https://github.com/existing/marketplace"
      );
    });

    it("should cache the fetched settings so subsequent calls don't re-fetch", async () => {
      const { wrapper, client } = makeWrapper();
      expect(client.getQueryData([QUERY_KEY_SETTINGS])).toBeUndefined();

      const completeSettings = makeMockSettings({
        shellPath: "/bin/bash",
        accessToken: "token",
      });
      getSettingsMock.mockResolvedValue(completeSettings);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      // First call: cache is empty, so GetSettings is called
      await act(async () => {
        await result.current({ shellPath: "/bin/zsh" });
      });
      expect(getSettingsMock).toHaveBeenCalledTimes(1);

      // Simulate cache being populated after first save
      client.setQueryData([QUERY_KEY_SETTINGS], completeSettings);

      getSettingsMock.mockClear();

      // Second call: cache is now available, so GetSettings should NOT be called again
      await act(async () => {
        await result.current({ accessToken: "new_token" });
      });
      expect(getSettingsMock).not.toHaveBeenCalled(); // ensureQueryData uses cache
    });
  });

  describe("concurrent saves from different sections", () => {
    it("second save should not lose first save's fields if timing is right", async () => {
      const { wrapper, client } = makeWrapper();
      const initialSettings = makeMockSettings({
        shellPath: "/bin/bash",
        accessToken: "initial_token",
      });
      client.setQueryData([QUERY_KEY_SETTINGS], initialSettings);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      // First save: Terminal section updates shellPath
      await act(async () => {
        await result.current({
          shellPath: "/bin/zsh",
        });
      });

      // Verify first save included all fields
      let savedSettings = saveSettingsMock.mock.calls[0][0];
      expect(savedSettings.shellPath).toBe("/bin/zsh");
      expect(savedSettings.accessToken).toBe("initial_token");

      // Simulate backend returning updated settings (which would be cached after invalidation)
      const updatedSettings = makeMockSettings({
        shellPath: "/bin/zsh",
        accessToken: "initial_token",
      });
      client.setQueryData([QUERY_KEY_SETTINGS], updatedSettings);

      // Clear mock to track second call
      saveSettingsMock.mockClear();

      // Second save: Sandbox section updates accessToken
      await act(async () => {
        await result.current({
          accessToken: "new_token",
        });
      });

      savedSettings = saveSettingsMock.mock.calls[0][0];
      expect(savedSettings.shellPath).toBe("/bin/zsh"); // Should preserve first save
      expect(savedSettings.accessToken).toBe("new_token"); // New value
    });

    it("should merge marketplace fields without losing terminal fields", async () => {
      const { wrapper, client } = makeWrapper();
      const cachedSettings = makeMockSettings({
        shellPath: "/bin/zsh",
        marketplaceRepositories: [
          {
            url: "https://github.com/default/marketplace",
            private: false,
            accessToken: "",
            locked: false,
            disabled: false,
          },
        ],
      });
      client.setQueryData([QUERY_KEY_SETTINGS], cachedSettings);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      await act(async () => {
        await result.current({
          marketplaceRepositories: [
            {
              url: "https://github.com/custom/marketplace",
              private: false,
              accessToken: "",
              locked: false,
              disabled: false,
            },
          ],
        });
      });

      const savedSettings = saveSettingsMock.mock.calls[0][0];
      expect(savedSettings.shellPath).toBe("/bin/zsh");
      expect(savedSettings.marketplaceRepositories?.[0]?.url).toBe(
        "https://github.com/custom/marketplace"
      );
    });
  });

  describe("invalidation and cache consistency", () => {
    it("should work correctly after cache invalidation triggers refetch", async () => {
      const { wrapper, client } = makeWrapper();
      const initialSettings = makeMockSettings({ shellPath: "/bin/bash" });
      client.setQueryData([QUERY_KEY_SETTINGS], initialSettings);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      // First mutation triggers invalidation (via useSaveSettings)
      await act(async () => {
        await result.current({ shellPath: "/bin/zsh" });
      });

      // Simulate the cache being marked as stale and refetched
      const refreshedSettings = makeMockSettings({ shellPath: "/bin/zsh" });
      client.setQueryData([QUERY_KEY_SETTINGS], refreshedSettings);

      saveSettingsMock.mockClear();

      // Second save should see the updated cache
      await act(async () => {
        await result.current({ shellPath: "/bin/fish" });
      });

      const savedSettings = saveSettingsMock.mock.calls[0][0];
      expect(savedSettings.shellPath).toBe("/bin/fish");
    });

    it("handles partial cache updates during refetch window", async () => {
      // This tests the real risk: between invalidate() and refetch completion
      const { wrapper, client } = makeWrapper();
      const cachedSettings = makeMockSettings({
        shellPath: "/bin/bash",
        accessToken: "token",
      });
      client.setQueryData([QUERY_KEY_SETTINGS], cachedSettings);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      // Simulate save that invalidates cache
      const savePromise = act(async () => {
        await result.current({ shellPath: "/bin/zsh" });
      });

      // Invalidate but don't refetch yet (cache still has old data)
      client.invalidateQueries({ queryKey: [QUERY_KEY_SETTINGS] });

      await savePromise;

      // At this point, cache may be stale, but merge should still work
      // because getQueryData() returns the last known value until refetch completes
      expect(saveSettingsMock).toHaveBeenCalledOnce();
    });
  });

  describe("token replacement flows", () => {
    it("replaces access token correctly when updating Sandbox section", async () => {
      const { wrapper, client } = makeWrapper();
      const cachedSettings = makeMockSettings({
        accessToken: "old_token",
        shellPath: "/bin/bash",
      });
      client.setQueryData([QUERY_KEY_SETTINGS], cachedSettings);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      await act(async () => {
        await result.current({
          accessToken: "new_token",
        });
      });

      const savedSettings = saveSettingsMock.mock.calls[0][0];
      expect(savedSettings.accessToken).toBe("new_token");
      expect(savedSettings.shellPath).toBe("/bin/bash"); // Other fields preserved
    });

    it("replaces marketplace token correctly when updating Marketplace section", async () => {
      const { wrapper, client } = makeWrapper();
      const cachedSettings = makeMockSettings({
        marketplaceRepositories: [
          {
            url: "https://github.com/old/marketplace",
            private: true,
            accessToken: "old_marketplace_token",
            locked: false,
            disabled: false,
          },
        ],
      });
      client.setQueryData([QUERY_KEY_SETTINGS], cachedSettings);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      await act(async () => {
        await result.current({
          marketplaceRepositories: [
            {
              url: "https://github.com/old/marketplace",
              private: true,
              accessToken: "new_marketplace_token",
              locked: false,
              disabled: false,
            },
          ],
        });
      });

      const savedSettings = saveSettingsMock.mock.calls[0][0];
      expect(savedSettings.marketplaceRepositories?.[0]?.accessToken).toBe("new_marketplace_token");
      expect(savedSettings.marketplaceRepositories?.[0]?.url).toBe(
        "https://github.com/old/marketplace"
      );
    });
  });

  describe("error handling", () => {
    it("propagates SaveSettings errors", async () => {
      const { wrapper, client } = makeWrapper();
      const cachedSettings = makeMockSettings();
      client.setQueryData([QUERY_KEY_SETTINGS], cachedSettings);

      const testError = new Error("Backend save failed");
      saveSettingsMock.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useMergeSettingsOnSave(), { wrapper });

      await act(async () => {
        try {
          await result.current({ shellPath: "/bin/fish" });
          expect.fail("Should have thrown");
        } catch (e) {
          expect((e as Error).message).toBe("Backend save failed");
        }
      });
    });
  });
});
