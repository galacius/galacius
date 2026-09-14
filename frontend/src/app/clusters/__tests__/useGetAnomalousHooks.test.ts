/**
 * Edge-case tests for hooks with non-standard behavior:
 *   1. useGetPortForwards  — queryKey/setQueryData key mismatch (object identity vs structural equality)
 *   2. useGetNamespaceNames — still owns its own "namespaces:update" subscription (useGetNamespaces
 *      no longer does; that cache is now patched globally by useNamespacesUpdateEvents, see that
 *      hook's own test)
 *
 * useGetWarningEvents no longer owns an EventsOn subscription — that cache is now patched
 * globally by useWarningEventsUpdateEvents (Batch 5), see that hook's own test.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

import { useGetPortForwards } from "../modules/networks/portforwarding/hooks/data-access/useGetPortForwards";
import { useGetNamespaceNames } from "../modules/base/namespaces/hooks/data-access/useGetNamespaceNames";

import { QUERY_KEY_NAMESPACE_NAMES } from "../modules/base/namespaces/api/api.const";
import { QUERY_KEY_PORT_FORWARDS } from "../modules/networks/portforwarding/api/api.const";

// ---------------------------------------------------------------------------
// Shared keyed-registry EventsOn mock
// ---------------------------------------------------------------------------
const { eventsOnMock, triggerEvent, resetRegistry } = vi.hoisted(() => {
  // Multi-listener registry — matches real Wails EventsOn which appends listeners
  // (delegates to EventsOnMultiple(..., -1)) rather than overwriting them.
  const registry: Record<string, Array<(...args: unknown[]) => void>> = {};
  const mock = vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    registry[event] = [...(registry[event] ?? []), cb];
    return vi.fn(() => {
      registry[event] = (registry[event] ?? []).filter((fn) => fn !== cb);
    });
  });
  return {
    eventsOnMock: mock,
    triggerEvent: (key: string, ...args: unknown[]) => registry[key]?.forEach((cb) => cb(...args)),
    resetRegistry: () => {
      for (const k of Object.keys(registry)) delete registry[k];
    },
  };
});

vi.mock("@wailsjs/runtime/runtime", () => ({ EventsOn: eventsOnMock }));

// ---------------------------------------------------------------------------
// Resource mocks
// ---------------------------------------------------------------------------
const listPortForwardsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const getNamespacesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("../modules/networks/portforwarding/api/resources", () => ({
  ListPortForwards: listPortForwardsMock,
}));

vi.mock("../modules/base/namespaces/api/resources", () => ({
  GetNamespaces: getNamespacesMock,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  };
}

// ---------------------------------------------------------------------------
// 1. useGetPortForwards — queryKey / setQueryData key mismatch
// ---------------------------------------------------------------------------
describe("useGetPortForwards — queryKey vs setQueryData key mismatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRegistry();
    listPortForwardsMock.mockResolvedValue([]);
  });

  it("A: setQueryData is called with structurally equal but reference-different key { context } when event fires", () => {
    const { wrapper, client } = makeWrapper();
    const setQueryDataSpy = vi.spyOn(client, "setQueryData");

    // queryKey uses the full `input` object: [QUERY_KEY_PORT_FORWARDS, { context: "ctx" }]
    // setQueryData uses destructured { context }: [QUERY_KEY_PORT_FORWARDS, { context: "ctx" }]
    // These are structurally equal but different object references.
    renderHook(() => useGetPortForwards({ context: "ctx" }), { wrapper });

    const payload = [{ ID: "pf-1", Name: "my-svc", Namespace: "default" }];
    act(() => {
      triggerEvent("portforwards:update", payload);
    });

    expect(setQueryDataSpy).toHaveBeenCalledWith(
      [QUERY_KEY_PORT_FORWARDS, { context: "ctx" }],
      payload
    );
  });

  it("B: getQueryData with { context } returns live data after event fires — TanStack does deep key comparison", () => {
    const { wrapper, client } = makeWrapper();

    renderHook(() => useGetPortForwards({ context: "ctx" }), { wrapper });

    const payload = [{ ID: "pf-1", Name: "my-svc", Namespace: "default" }];
    act(() => {
      triggerEvent("portforwards:update", payload);
    });

    // TanStack Query uses structural (deep) equality for cache key lookup,
    // so both [QUERY_KEY_PORT_FORWARDS, input] and [QUERY_KEY_PORT_FORWARDS, { context }]
    // resolve to the same cache entry.
    const cached = client.getQueryData([QUERY_KEY_PORT_FORWARDS, { context: "ctx" }]);
    expect(cached).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// 2. useGetNamespaceNames — still owns its own "namespaces:update" subscription
// ---------------------------------------------------------------------------
describe("useGetNamespaceNames — namespaces:update subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRegistry();
    getNamespacesMock.mockResolvedValue([]);
  });

  it("subscribes to namespaces:update and writes mapped names to QUERY_KEY_NAMESPACE_NAMES", () => {
    const { wrapper, client } = makeWrapper();

    renderHook(() => useGetNamespaceNames("ctx"), { wrapper });

    const nsObjects = [{ Name: "default" }, { Name: "kube-system" }];
    act(() => {
      triggerEvent("namespaces:update", nsObjects);
    });

    expect(client.getQueryData([QUERY_KEY_NAMESPACE_NAMES, "ctx"])).toEqual([
      "default",
      "kube-system",
    ]);
  });
});
