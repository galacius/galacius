import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetEvents } from "../useGetEvents";
import type { Event } from "../../../api/resources";
import { QUERY_KEY_EVENTS } from "../../../api/api.const";

const { eventsOnMock, triggerEvent, resetRegistry } = vi.hoisted(() => {
  const registry: Record<string, (...args: unknown[]) => void> = {};
  const mock = vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    registry[event] = cb;
    return vi.fn(() => {
      delete registry[event];
    });
  });
  return {
    eventsOnMock: mock,
    triggerEvent: (key: string, ...args: unknown[]) => registry[key]?.(...args),
    resetRegistry: () => {
      for (const k of Object.keys(registry)) delete registry[k];
    },
  };
});

vi.mock("@wailsjs/runtime/runtime", () => ({ EventsOn: eventsOnMock }));

const listEventsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("../../../api/resources", () => ({
  ListEvents: listEventsMock,
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

const mockEvent = (name: string, namespace: string): Event => ({
  Name: name,
  Namespace: namespace,
  Type: "Normal",
  Reason: "Created",
  Message: "Test event",
  InvolvedObjectKind: "Pod",
  InvolvedObjectName: "test",
  InvolvedObjectNamespace: namespace,
  InvolvedObjectFieldPath: "",
  Source: "kubelet",
  Count: 1,
  Age: "1h",
  LastSeen: "1h",
  FirstSeen: "1h",
  FirstSeenAt: 1735689600,
  LastSeenAt: 1735689600,
  CreatedAt: 1735689600,
  ManagedFields: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  resetRegistry();
  listEventsMock.mockResolvedValue([]);
});

describe("useGetEvents", () => {
  it("is disabled when context is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetEvents({ context: "", namespaces: ["default"] }), {
      wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(listEventsMock).not.toHaveBeenCalled();
  });

  it("fetches when context is provided", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetEvents({ context: "ctx", namespaces: ["default"] }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listEventsMock).toHaveBeenCalledWith();
  });

  it("uses correct queryKey with context and namespace", () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetEvents({ context: "ctx", namespaces: ["default"] }), { wrapper });
    const cache = client.getQueryCache().findAll();
    expect(cache[0].queryKey).toEqual([
      QUERY_KEY_EVENTS,
      { context: "ctx", namespaces: ["default"] },
    ]);
  });

  it("returns query.data when latestEvents is empty", async () => {
    const { wrapper } = makeWrapper();
    const queryData = [mockEvent("e1", "default")];
    listEventsMock.mockResolvedValue(queryData);

    const { result } = renderHook(() => useGetEvents({ context: "ctx", namespaces: ["default"] }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(queryData);
  });

  it("returns latestEvents pushed by the backend-filtered events:update channel", async () => {
    const { wrapper } = makeWrapper();
    const queryData = [mockEvent("e1", "default")];
    listEventsMock.mockResolvedValue(queryData);

    const { result } = renderHook(() => useGetEvents({ context: "ctx", namespaces: ["default"] }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const latestEvents = [mockEvent("e2", "default")];
    triggerEvent("events:update", latestEvents);
    await waitFor(() => {
      expect(result.current.data).toEqual(latestEvents);
    });
  });

  it("returns unfiltered latestEvents when namespace is empty string", async () => {
    const { wrapper } = makeWrapper();
    listEventsMock.mockResolvedValue([]);

    const { result } = renderHook(() => useGetEvents({ context: "ctx", namespaces: [] }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const latestEvents = [mockEvent("e1", "default"), mockEvent("e2", "kube-system")];
    triggerEvent("events:update", latestEvents);
    await waitFor(() => {
      expect(result.current.data).toEqual(latestEvents);
    });
  });

  it("applies callback.select when provided", async () => {
    const { wrapper } = makeWrapper();
    const queryData = [mockEvent("e1", "default")];
    listEventsMock.mockResolvedValue(queryData);

    const selectFn = vi.fn((data: Event[] | undefined) => data?.slice(0, 1) ?? []);
    const { result } = renderHook(
      () => useGetEvents({ context: "ctx", namespaces: ["default"] }, { select: selectFn }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(queryData);
  });

  it("applies callback.select with latestEvents", async () => {
    const { wrapper } = makeWrapper();
    listEventsMock.mockResolvedValue([]);

    const selectFn = vi.fn((data: Event[] | undefined) => data?.slice(0, 1) ?? []);
    const { result } = renderHook(
      () => useGetEvents({ context: "ctx", namespaces: ["default"] }, { select: selectFn }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const latestEvents = [mockEvent("e1", "default")];
    triggerEvent("events:update", latestEvents);
    await waitFor(() => {
      expect(result.current.data).toEqual([mockEvent("e1", "default")]);
    });
  });
});
