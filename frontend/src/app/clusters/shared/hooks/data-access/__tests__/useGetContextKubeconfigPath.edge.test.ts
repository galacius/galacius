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
 *
 *   GAP-6 [LOW] useGetContextKubeconfigPath re-disable after valid → null transition
 *     The reactive "null after valid string" direction (disable after enable)
 *     is not covered. The hook would transition to fetchStatus "idle" and stop
 *     fetching; this mirrors TanStack Query's enabled flag semantics and is
 *     omitted as low-risk framework behaviour.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useGetContextKubeconfigPath } from "../useGetContextKubeconfigPath";
import { QUERY_KEY_CONTEXT_KUBECONFIG_PATH } from "../../../api/api.const";

const getContextKubeconfigPathMock = vi.hoisted(() => vi.fn());

vi.mock("@wailsjs/go/app/App", () => ({
  GetContextKubeconfigPath: getContextKubeconfigPathMock,
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

beforeEach(() => {
  vi.clearAllMocks();
  getContextKubeconfigPathMock.mockResolvedValue("/home/.kube/config");
});

afterEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// useGetContextKubeconfigPath
// ──────────────────────────────────────────────────────────────────────────────

describe("useGetContextKubeconfigPath", () => {
  describe("1. null contextName — hook disabled", () => {
    it("does not call GetContextKubeconfigPath when contextName is null", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetContextKubeconfigPath(null), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(getContextKubeconfigPathMock).not.toHaveBeenCalled();
    });

    it("reports fetchStatus idle when contextName is null", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetContextKubeconfigPath(null), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("2. Empty string contextName — hook disabled", () => {
    it("does not call GetContextKubeconfigPath when contextName is empty string", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetContextKubeconfigPath(""), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(getContextKubeconfigPathMock).not.toHaveBeenCalled();
    });

    it("reports fetchStatus idle when contextName is empty string", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetContextKubeconfigPath(""), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("3. Valid contextName — hook enabled and fetches", () => {
    it("calls GetContextKubeconfigPath with the contextName argument", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetContextKubeconfigPath("production-cluster"), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(getContextKubeconfigPathMock).toHaveBeenCalledWith("production-cluster");
    });

    it("returns the path string from queryFn", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetContextKubeconfigPath("production-cluster"), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("/home/.kube/config");
    });
  });

  describe("4. contextName changes from null to a valid string — starts fetching", () => {
    it("begins fetching after contextName transitions from null to a valid value", async () => {
      const { wrapper } = makeWrapper();
      const { result, rerender } = renderHook(
        ({ ctx }: { ctx: string | null }) => useGetContextKubeconfigPath(ctx),
        { wrapper, initialProps: { ctx: null as string | null } }
      );
      await new Promise((r) => setTimeout(r, 20));
      expect(getContextKubeconfigPathMock).not.toHaveBeenCalled();

      rerender({ ctx: "staging-cluster" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(getContextKubeconfigPathMock).toHaveBeenCalledWith("staging-cluster");
    });
  });

  describe("5. contextName included in queryKey", () => {
    it("queryKey carries the contextName for cache isolation", async () => {
      const { client, wrapper } = makeWrapper();
      renderHook(() => useGetContextKubeconfigPath("ctx-a"), { wrapper });
      await waitFor(() =>
        expect(
          client.getQueryState([QUERY_KEY_CONTEXT_KUBECONFIG_PATH, { contextName: "ctx-a" }])
        ).toBeDefined()
      );
    });
  });

  describe("6. Query error propagation", () => {
    it("exposes error state when GetContextKubeconfigPath rejects", async () => {
      getContextKubeconfigPathMock.mockRejectedValue(new Error("context not found"));
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetContextKubeconfigPath("bad-ctx"), { wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("context not found");
    });
  });
});
