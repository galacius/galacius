import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { QUERY_KEY_WARNING_EVENTS } from "../../../api/api.const";
import type { Event } from "../../../api/resources";
import { useGetWarningEvents } from "../useGetWarningEvents";

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

const listWarningEventsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("../../../api/resources", () => ({
  ListWarningEvents: listWarningEventsMock,
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

const mockEvent = (name: string, namespace: string, createdAt: number): Event => ({
  Name: name,
  Namespace: namespace,
  Type: "Warning",
  Reason: "Failed",
  Message: "Test warning event",
  InvolvedObjectKind: "Pod",
  InvolvedObjectName: "test",
  InvolvedObjectNamespace: namespace,
  InvolvedObjectFieldPath: "",
  Source: "kubelet",
  Count: 1,
  Age: "1h",
  LastSeen: "1h",
  FirstSeen: "1h",
  FirstSeenAt: createdAt,
  LastSeenAt: createdAt,
  CreatedAt: createdAt,
  ManagedFields: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  resetRegistry();
  listWarningEventsMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useGetWarningEvents", () => {
  it("is disabled when context is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useGetWarningEvents({ context: "", namespaces: ["default"] }),
      { wrapper }
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(listWarningEventsMock).not.toHaveBeenCalled();
  });

  it("fetches when context is provided", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listWarningEventsMock).toHaveBeenCalledWith();
  });

  it("uses correct queryKey with context, namespace, and triggerRefresh", async () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }), { wrapper });

    await waitFor(() => {
      const cache = client.getQueryCache().findAll();
      const queryKey = cache[0].queryKey;
      expect(queryKey[0]).toBe(QUERY_KEY_WARNING_EVENTS);
      expect(queryKey[1]).toEqual({ context: "ctx", namespaces: ["default"] });
      expect(typeof queryKey[2]).toBe("boolean");
    });
  });

  it("sorts events by CreatedAt descending", async () => {
    const { wrapper } = makeWrapper();
    const events = [
      mockEvent("e1", "default", 1735689600),
      mockEvent("e2", "default", 1735689610),
      mockEvent("e3", "default", 1735689605),
    ];
    listWarningEventsMock.mockResolvedValue(events);

    const { result } = renderHook(
      () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const sorted = result.current.data!;
    expect(sorted[0].CreatedAt).toBe(1735689610);
    expect(sorted[1].CreatedAt).toBe(1735689605);
    expect(sorted[2].CreatedAt).toBe(1735689600);
  });

  it("triggers new fetch when warning event is received", async () => {
    const { wrapper } = makeWrapper();
    const initialEvents = [mockEvent("e1", "default", 1735689600)];
    listWarningEventsMock.mockResolvedValueOnce(initialEvents);

    const { result, rerender } = renderHook(
      () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const initialData = result.current.data;
    expect(initialData).toEqual(initialEvents);

    const newEvents = [
      mockEvent("e2", "default", 1735689620),
      mockEvent("e3", "default", 1735689615),
    ];
    listWarningEventsMock.mockResolvedValueOnce(newEvents);
    triggerEvent("events:warning:update");

    await waitFor(() => {
      rerender();
      const newData = result.current.data;
      expect(newData).toBeDefined();
      expect(newData![0].CreatedAt).toBe(1735689620);
    });
  });

  it("queryKey changes when triggerRefresh toggles", async () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }), { wrapper });

    const initialCache = client.getQueryCache().findAll();
    const initialKey = initialCache[0].queryKey;
    const initialTrigger = initialKey[2];

    triggerEvent("events:warning:update");

    await waitFor(() => {
      const cache = client.getQueryCache().findAll();
      const newKey = cache[cache.length - 1].queryKey;
      expect(newKey[0]).toBe(QUERY_KEY_WARNING_EVENTS);
      expect(newKey[1]).toEqual({ context: "ctx", namespaces: ["default"] });
      expect(newKey[2]).not.toBe(initialTrigger);
    });
  });

  it("calls ListWarningEvents with no arguments regardless of the namespaces input", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useGetWarningEvents({ context: "ctx", namespaces: ["kube-system"] }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listWarningEventsMock).toHaveBeenCalledWith();
  });

  it("handles empty event list", async () => {
    const { wrapper } = makeWrapper();
    listWarningEventsMock.mockResolvedValue([]);

    const { result } = renderHook(
      () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
