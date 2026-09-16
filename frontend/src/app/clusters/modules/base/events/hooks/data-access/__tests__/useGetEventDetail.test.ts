import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUERY_KEY_EVENT_DETAIL } from "../../../api/api.const";
import type { Event } from "../../../api/resources";
import { useGetEventDetail } from "../useGetEventDetail";

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

const getEventByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock("../../../api/resources", () => ({
  GetEventByName: getEventByNameMock,
  WatchEventDetail: vi.fn(),
  UnwatchEventDetail: vi.fn(),
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
  getEventByNameMock.mockResolvedValue(null);
});

describe("useGetEventDetail", () => {
  it("is disabled when context is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetEventDetail("", "default", "event-1"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getEventByNameMock).not.toHaveBeenCalled();
  });

  it("is disabled when namespace is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetEventDetail("ctx", "", "event-1"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getEventByNameMock).not.toHaveBeenCalled();
  });

  it("is disabled when name is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetEventDetail("ctx", "default", ""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getEventByNameMock).not.toHaveBeenCalled();
  });

  it("fetches when all params are provided", async () => {
    const { wrapper } = makeWrapper();
    const event = mockEvent("event-1", "default");
    getEventByNameMock.mockResolvedValue(event);

    const { result } = renderHook(() => useGetEventDetail("ctx", "default", "event-1"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getEventByNameMock).toHaveBeenCalledWith("default", "event-1");
  });

  it("uses correct queryKey with context, namespace, and name", () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetEventDetail("ctx", "default", "event-1"), { wrapper });
    const cache = client.getQueryCache().findAll();
    expect(cache[0].queryKey).toEqual([
      QUERY_KEY_EVENT_DETAIL,
      { context: "ctx", namespace: "default", name: "event-1" },
    ]);
  });

  it("returns query.data when latestEvents is empty", async () => {
    const { wrapper } = makeWrapper();
    const queryEvent = mockEvent("event-1", "default");
    getEventByNameMock.mockResolvedValue(queryEvent);

    const { result } = renderHook(() => useGetEventDetail("ctx", "default", "event-1"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(queryEvent);
  });

  it("returns matched latestEvent over query.data", async () => {
    const { wrapper } = makeWrapper();
    const queryEvent = mockEvent("event-1", "default");
    getEventByNameMock.mockResolvedValue(queryEvent);

    const { result } = renderHook(() => useGetEventDetail("ctx", "default", "event-1"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const latestEvent = mockEvent("event-1", "default");
    latestEvent.Message = "Updated message";
    triggerEvent("event:update", latestEvent);

    await waitFor(() => {
      expect(result.current.data).toEqual(latestEvent);
    });
  });

  it("returns query.data when latestEvent does not match namespace", async () => {
    const { wrapper } = makeWrapper();
    const queryEvent = mockEvent("event-1", "default");
    getEventByNameMock.mockResolvedValue(queryEvent);

    const { result } = renderHook(() => useGetEventDetail("ctx", "default", "event-1"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const latestEvent = mockEvent("event-1", "kube-system");
    triggerEvent("event:update", latestEvent);

    await waitFor(() => {
      expect(result.current.data).toEqual(queryEvent);
    });
  });

  it("returns query.data when latestEvent does not match name", async () => {
    const { wrapper } = makeWrapper();
    const queryEvent = mockEvent("event-1", "default");
    getEventByNameMock.mockResolvedValue(queryEvent);

    const { result } = renderHook(() => useGetEventDetail("ctx", "default", "event-1"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const latestEvent = mockEvent("different-event", "default");
    triggerEvent("event:update", latestEvent);

    await waitFor(() => {
      expect(result.current.data).toEqual(queryEvent);
    });
  });
});
