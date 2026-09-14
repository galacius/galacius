import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

const getEventByNameMock = vi.hoisted(() => vi.fn());

vi.mock("@wailsjs/runtime/runtime", () => ({ EventsOn: eventsOnMock }));
vi.mock("../../../api/resources", () => ({
  GetEventByName: getEventByNameMock,
  WatchEventDetail: vi.fn(),
  UnwatchEventDetail: vi.fn(),
}));

const mockEvent = (overrides: Partial<Event> = {}): Event => ({
  Name: "event-1",
  Namespace: "default",
  Type: "Normal",
  Reason: "Created",
  Message: "Test event",
  InvolvedObjectKind: "Pod",
  InvolvedObjectName: "test-pod",
  InvolvedObjectNamespace: "default",
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
  ...overrides,
});

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRegistry();
  getEventByNameMock.mockResolvedValue(mockEvent());
});

describe("useGetEventDetail edge cases", () => {
  describe("1. Event push for different name — should not match", () => {
    it("ignores event with different name", async () => {
      const queryData = mockEvent({ Name: "query-event" });
      getEventByNameMock.mockResolvedValue(queryData);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEventDetail("ctx", "default", "query-event"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.Name).toBe("query-event");

      const otherEvent = mockEvent({ Name: "other-event", Namespace: "default" });
      triggerEvent("event:update", otherEvent);

      await waitFor(() => {
        expect(result.current.data?.Name).toBe("query-event");
      });
    });
  });

  describe("2. Event push for different namespace — should not match", () => {
    it("ignores event with different namespace", async () => {
      const queryData = mockEvent({ Name: "test-event", Namespace: "default" });
      getEventByNameMock.mockResolvedValue(queryData);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEventDetail("ctx", "default", "test-event"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.Namespace).toBe("default");

      const otherEvent = mockEvent({ Name: "test-event", Namespace: "kube-system" });
      triggerEvent("event:update", otherEvent);

      await waitFor(() => {
        expect(result.current.data?.Namespace).toBe("default");
      });
    });
  });

  describe("3. Event push with exact name AND namespace match", () => {
    it("returns matched event from latestEvents over query.data", async () => {
      const queryData = mockEvent({ Name: "test-event", Namespace: "default", Count: 1 });
      getEventByNameMock.mockResolvedValue(queryData);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEventDetail("ctx", "default", "test-event"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.Count).toBe(1);

      const matchedEvent = mockEvent({
        Name: "test-event",
        Namespace: "default",
        Count: 5,
      });
      triggerEvent("event:update", matchedEvent);

      await waitFor(() => {
        expect(result.current.data?.Count).toBe(5);
      });
    });
  });

  describe("4. Race: event array push before initial query resolves", () => {
    it("renders pushed event even if query is still loading", async () => {
      let resolveQuery: (value: Event) => void;
      const queryPromise = new Promise<Event>((resolve) => {
        resolveQuery = resolve;
      });
      getEventByNameMock.mockReturnValue(queryPromise);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEventDetail("ctx", "default", "test-event"), {
        wrapper,
      });

      const eventFromPush = mockEvent({ Name: "test-event", Namespace: "default" });
      triggerEvent("event:update", eventFromPush);

      await waitFor(() => {
        expect(result.current.data).toEqual(eventFromPush);
      });

      resolveQuery!(mockEvent({ Name: "test-event", Namespace: "default", Count: 99 }));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("5. Case sensitivity on Name and Namespace", () => {
    it("requires exact case match on Name", async () => {
      const queryData = mockEvent({ Name: "TestEvent", Namespace: "default" });
      getEventByNameMock.mockResolvedValue(queryData);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEventDetail("ctx", "default", "TestEvent"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const event = mockEvent({ Name: "testevent", Namespace: "default" });
      triggerEvent("event:update", event);

      await waitFor(() => {
        expect(result.current.data?.Name).toBe("TestEvent");
      });
    });

    it("requires exact case match on Namespace", async () => {
      const queryData = mockEvent({ Name: "test-event", Namespace: "Default" });
      getEventByNameMock.mockResolvedValue(queryData);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEventDetail("ctx", "Default", "test-event"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const event = mockEvent({ Name: "test-event", Namespace: "default" });
      triggerEvent("event:update", event);

      await waitFor(() => {
        expect(result.current.data?.Namespace).toBe("Default");
      });
    });
  });

  describe("6. Hook disabled when context/namespace/name empty", () => {
    it("does not call GetEventByName when context is empty", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetEventDetail("", "default", "test-event"), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(getEventByNameMock).not.toHaveBeenCalled();
    });

    it("does not call GetEventByName when namespace is empty", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetEventDetail("ctx", "", "test-event"), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(getEventByNameMock).not.toHaveBeenCalled();
    });

    it("does not call GetEventByName when name is empty", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetEventDetail("ctx", "default", ""), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(getEventByNameMock).not.toHaveBeenCalled();
    });
  });

  describe("7. Singular event push matching the watched event", () => {
    it("applies the pushed event when it matches", async () => {
      const queryData = mockEvent({ Name: "query-event", Namespace: "default" });
      getEventByNameMock.mockResolvedValue(queryData);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEventDetail("ctx", "default", "target-event"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const targetEvent = mockEvent({ Name: "target-event", Namespace: "default" });

      triggerEvent("event:update", targetEvent);

      await waitFor(() => {
        expect(result.current.data?.Name).toBe("target-event");
      });
    });
  });

  describe("8. queryFn error with merged event data", () => {
    it("shows merged event data even when query has error", async () => {
      getEventByNameMock.mockRejectedValue(new Error("Network error"));

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEventDetail("ctx", "default", "test-event"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();

      const event = mockEvent({ Name: "test-event", Namespace: "default" });
      triggerEvent("event:update", event);

      await waitFor(() => {
        expect(result.current.data).toEqual(event);
      });
    });
  });
});
