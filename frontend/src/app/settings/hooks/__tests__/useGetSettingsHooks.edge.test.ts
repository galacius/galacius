/**
 * COVERAGE GAP ANALYSIS
 * ─────────────────────
 * What cannot be tested (untestable boundaries):
 *
 *   GAP-1 [LOW] Wails IPC transport layer
 *     GetSettings / GetActiveKubeconfigPaths / GetContextKubeconfigPath /
 *     GetDefaultShell / SaveKubeconfigPaths / SaveLocaleTimezone all cross
 *     the Go ↔ JS boundary at runtime. Unit tests can only mock this
 *     boundary; they cannot exercise serialisation, Wails event bus, or
 *     platform-specific IPC socket behaviour. Covered by integration /
 *     manual QA instead.
 *
 *   GAP-2 [LOW] DEFAULT_QUERY_OPTIONS.placeholderData (keepPreviousData)
 *     Verifying that stale data is returned while a new fetch is in flight
 *     requires controlling timer/network callbacks that TanStack Query
 *     internalises. The placeholder behaviour is a framework guarantee, not
 *     application logic, so testing it here would test TanStack Query, not
 *     the hook. Skipped intentionally.
 *
 *   GAP-3 [LOW] refetchOnWindowFocus: false
 *     Asserting that the hook does NOT refetch when the window regains focus
 *     would require dispatching a real "visibilitychange" event into jsdom and
 *     verifying no extra queryFn call appears. The cost outweighs the value
 *     for a configuration flag; it is covered by TanStack Query's own suite.
 *
 *   GAP-4 [MEDIUM] config.Settings shape completeness
 *     The mock returns a plain object. Tests verify that the value passes
 *     through the select callback unchanged, but they do NOT validate that
 *     every field of config.Settings is present and correctly typed. A
 *     contract/schema test against the actual Go DTO would be required —
 *     that belongs in an integration test or a schema snapshot test.
 *
 *   GAP-5 [MEDIUM] QueryClient.invalidateQueries side-effects beyond refetch
 *     After a successful mutation the test asserts that invalidateQueries was
 *     called with the correct key. It does NOT assert that any mounted query
 *     component actually re-fetches (no component tree is rendered). That
 *     cross-hook integration scenario belongs in an E2E or component-level test.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useGetSettings } from "../data-access/useGetSettings";
import { useGetActiveKubeconfigPaths } from "../data-access/useGetActiveKubeconfigPaths";
import { useGetDefaultShell } from "../data-access/useGetDefaultShell";
import { useSaveKubeconfigPaths } from "../data-mutation/useSaveKubeconfigPaths";
import { useSaveLocaleTimezone } from "../data-mutation/useSaveLocaleTimezone";
import {
  QUERY_KEY_SETTINGS,
  QUERY_KEY_ACTIVE_KUBECONFIG_PATHS,
  QUERY_KEY_DEFAULT_SHELL,
} from "../../api/api.const";

const getSettingsMock = vi.hoisted(() => vi.fn());
const getActiveKubeconfigPathsMock = vi.hoisted(() => vi.fn());
const getDefaultShellMock = vi.hoisted(() => vi.fn());
const saveKubeconfigPathsMock = vi.hoisted(() => vi.fn());
const saveLocaleTimezoneMock = vi.hoisted(() => vi.fn());

vi.mock("@wailsjs/go/app/App", () => ({
  GetSettings: getSettingsMock,
  GetActiveKubeconfigPaths: getActiveKubeconfigPathsMock,
  GetDefaultShell: getDefaultShellMock,
  SaveKubeconfigPaths: saveKubeconfigPathsMock,
  SaveLocaleTimezone: saveLocaleTimezoneMock,
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children),
  };
}

const SETTINGS_FIXTURE = { locale: "UTC", kubeconfigPaths: ["/home/.kube/config"] };

beforeEach(() => {
  vi.clearAllMocks();
  getSettingsMock.mockResolvedValue(SETTINGS_FIXTURE);
  getActiveKubeconfigPathsMock.mockResolvedValue(["/a/kubeconfig", "/b/kubeconfig"]);
  getDefaultShellMock.mockResolvedValue("/bin/zsh");
  saveKubeconfigPathsMock.mockResolvedValue(undefined);
  saveLocaleTimezoneMock.mockResolvedValue(undefined);
});

// ──────────────────────────────────────────────────────────────────────────────
// useGetSettings
// ──────────────────────────────────────────────────────────────────────────────

describe("useGetSettings", () => {
  describe("1. No select callback — data returned as-is", () => {
    it("returns the raw settings object from queryFn", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetSettings(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(SETTINGS_FIXTURE);
    });

    it("calls GetSettings exactly once on mount", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetSettings(), { wrapper });
      await waitFor(() => expect(getSettingsMock).toHaveBeenCalledTimes(1));
    });
  });

  describe("2. With select callback — transformed data returned", () => {
    it("applies select to return only locale field", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () =>
          useGetSettings({
            select: ((d: any) => ({
              kubeconfigPaths: d?.kubeconfigPaths ?? [],
              locale: d?.locale ?? "",
            })) as any,
          }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.locale).toBe("UTC");
    });

    it("select returning transformed object does not throw", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () =>
          useGetSettings({
            select: ((d: any) => ({ kubeconfigPaths: [], locale: d?.locale ?? "" })) as any,
          }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.kubeconfigPaths).toEqual([]);
    });
  });

  describe("3. Query error propagation", () => {
    it("exposes error state when GetSettings rejects", async () => {
      getSettingsMock.mockRejectedValue(new Error("backend unavailable"));
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetSettings(), { wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("backend unavailable");
    });
  });

  describe("4. Query key correctness", () => {
    it("registers the query under QUERY_KEY_SETTINGS", async () => {
      const { client, wrapper } = makeWrapper();
      renderHook(() => useGetSettings(), { wrapper });
      await waitFor(() => expect(client.getQueryState([QUERY_KEY_SETTINGS])).toBeDefined());
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// useGetActiveKubeconfigPaths
// ──────────────────────────────────────────────────────────────────────────────

describe("useGetActiveKubeconfigPaths", () => {
  describe("1. No callback — array returned as-is", () => {
    it("returns the full path array", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetActiveKubeconfigPaths(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(["/a/kubeconfig", "/b/kubeconfig"]);
    });
  });

  describe("2. With select callback", () => {
    it("applies select to return only the first path", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetActiveKubeconfigPaths({ select: (d) => (d ?? []).slice(0, 1) }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(["/a/kubeconfig"]);
    });
  });

  describe("3. Empty array response", () => {
    it("returns empty array without error when backend returns []", async () => {
      getActiveKubeconfigPathsMock.mockResolvedValue([]);
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetActiveKubeconfigPaths(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  describe("4. Query error propagation", () => {
    it("exposes error state when GetActiveKubeconfigPaths rejects", async () => {
      getActiveKubeconfigPathsMock.mockRejectedValue(new Error("ipc failure"));
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetActiveKubeconfigPaths(), { wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("5. Query key correctness", () => {
    it("registers the query under QUERY_KEY_ACTIVE_KUBECONFIG_PATHS", async () => {
      const { client, wrapper } = makeWrapper();
      renderHook(() => useGetActiveKubeconfigPaths(), { wrapper });
      await waitFor(() =>
        expect(client.getQueryState([QUERY_KEY_ACTIVE_KUBECONFIG_PATHS])).toBeDefined()
      );
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// useGetDefaultShell
// ──────────────────────────────────────────────────────────────────────────────

describe("useGetDefaultShell", () => {
  describe("1. Happy path", () => {
    it("returns the shell string from queryFn", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetDefaultShell(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("/bin/zsh");
    });

    it("calls GetDefaultShell with no arguments", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetDefaultShell(), { wrapper });
      await waitFor(() => expect(getDefaultShellMock).toHaveBeenCalledTimes(1));
      expect(getDefaultShellMock).toHaveBeenCalledWith();
    });
  });

  describe("2. Empty string shell response", () => {
    it("treats empty string as a valid successful response", async () => {
      getDefaultShellMock.mockResolvedValue("");
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetDefaultShell(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("");
    });
  });

  describe("3. Query error propagation", () => {
    it("exposes error state when GetDefaultShell rejects", async () => {
      getDefaultShellMock.mockRejectedValue(new Error("shell detection failed"));
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetDefaultShell(), { wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("shell detection failed");
    });
  });

  describe("4. Query key correctness", () => {
    it("registers under QUERY_KEY_DEFAULT_SHELL", async () => {
      const { client, wrapper } = makeWrapper();
      renderHook(() => useGetDefaultShell(), { wrapper });
      await waitFor(() => expect(client.getQueryState([QUERY_KEY_DEFAULT_SHELL])).toBeDefined());
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// useSaveKubeconfigPaths
// ──────────────────────────────────────────────────────────────────────────────

describe("useSaveKubeconfigPaths", () => {
  describe("1. mutationFn receives the correct argument", () => {
    it("passes the paths array to SaveKubeconfigPaths", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useSaveKubeconfigPaths(), { wrapper });
      await act(async () => {
        await result.current.mutateAsync(["/home/.kube/config", "/etc/kubeconfig"]);
      });
      expect(saveKubeconfigPathsMock).toHaveBeenCalledWith([
        "/home/.kube/config",
        "/etc/kubeconfig",
      ]);
    });

    it("passes an empty array when caller supplies []", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useSaveKubeconfigPaths(), { wrapper });
      await act(async () => {
        await result.current.mutateAsync([]);
      });
      expect(saveKubeconfigPathsMock).toHaveBeenCalledWith([]);
    });
  });

  describe("2. onSuccess — invalidates QUERY_KEY_SETTINGS", () => {
    it("calls queryClient.invalidateQueries with settings key after success", async () => {
      const { client, wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");
      const { result } = renderHook(() => useSaveKubeconfigPaths(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(["/a/kubeconfig"]);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: [QUERY_KEY_SETTINGS] })
      );
    });
  });

  describe("3. onError — does NOT invalidate queries", () => {
    it("does not call invalidateQueries when SaveKubeconfigPaths rejects", async () => {
      saveKubeconfigPathsMock.mockRejectedValue(new Error("save failed"));
      const { client, wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");
      const { result } = renderHook(() => useSaveKubeconfigPaths(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(["/bad/path"]).catch(() => {});
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("exposes error state after rejection", async () => {
      saveKubeconfigPathsMock.mockRejectedValue(new Error("save failed"));
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useSaveKubeconfigPaths(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(["/bad/path"]).catch(() => {});
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("save failed");
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// useSaveLocaleTimezone
// ──────────────────────────────────────────────────────────────────────────────

describe("useSaveLocaleTimezone", () => {
  describe("1. mutationFn receives the correct argument", () => {
    it("passes the timezone string to SaveLocaleTimezone", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useSaveLocaleTimezone(), { wrapper });
      await act(async () => {
        await result.current.mutateAsync("America/New_York");
      });
      expect(saveLocaleTimezoneMock).toHaveBeenCalledWith("America/New_York");
    });

    it("passes UTC when caller supplies 'UTC'", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useSaveLocaleTimezone(), { wrapper });
      await act(async () => {
        await result.current.mutateAsync("UTC");
      });
      expect(saveLocaleTimezoneMock).toHaveBeenCalledWith("UTC");
    });
  });

  describe("2. onSuccess — invalidates QUERY_KEY_SETTINGS", () => {
    it("calls queryClient.invalidateQueries with settings key after success", async () => {
      const { client, wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");
      const { result } = renderHook(() => useSaveLocaleTimezone(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("Asia/Tokyo");
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: [QUERY_KEY_SETTINGS] })
      );
    });
  });

  describe("3. onError — does NOT invalidate queries", () => {
    it("does not call invalidateQueries when SaveLocaleTimezone rejects", async () => {
      saveLocaleTimezoneMock.mockRejectedValue(new Error("tz save failed"));
      const { client, wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");
      const { result } = renderHook(() => useSaveLocaleTimezone(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("Bad/Zone").catch(() => {});
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("exposes error state after rejection", async () => {
      saveLocaleTimezoneMock.mockRejectedValue(new Error("tz save failed"));
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useSaveLocaleTimezone(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("Bad/Zone").catch(() => {});
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("tz save failed");
    });
  });
});
