import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "../../../api/resources";
import { useGetEvents } from "../useGetEvents";

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

const listEventsMock = vi.hoisted(() => vi.fn());

vi.mock("@wailsjs/runtime/runtime", () => ({ EventsOn: eventsOnMock }));
vi.mock("../../../api/resources", () => ({
  ListEvents: listEventsMock,
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
  listEventsMock.mockResolvedValue([]);
});

describe("useGetEvents edge cases", () => {
  describe("1. Backend-filtered event push — passed through unfiltered", () => {
    it("passes through whatever the backend pushes on events:update, regardless of namespace", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetEvents({ context: "ctx", namespaces: ["default"] }),
        {
          wrapper,
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const kube_system_event = mockEvent({
        Name: "other-event",
        Namespace: "kube-system",
      });

      triggerEvent("events:update", [kube_system_event]);

      await waitFor(() => {
        expect(result.current.data).toEqual([kube_system_event]);
      });
    });

    it("passes through a mixed-namespace event push as-is", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetEvents({ context: "ctx", namespaces: ["default"] }),
        {
          wrapper,
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const default_event = mockEvent({ Name: "default-event", Namespace: "default" });
      const other_event = mockEvent({ Name: "other-event", Namespace: "kube-system" });

      triggerEvent("events:update", [default_event, other_event]);

      await waitFor(() => {
        expect(result.current.data).toEqual([default_event, other_event]);
      });
    });
  });

  describe("2. Empty array event push — should not override query.data", () => {
    it("keeps query.data when latestEvents.length is falsy (empty array)", async () => {
      const queryData = [mockEvent({ Name: "original-event" })];
      listEventsMock.mockResolvedValue(queryData);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetEvents({ context: "ctx", namespaces: ["default"] }),
        {
          wrapper,
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(queryData);

      triggerEvent("events:update", []);

      await new Promise((r) => setTimeout(r, 20));
      expect(result.current.data).toEqual(queryData);
    });
  });

  describe("3. Cluster-wide (namespace === '') receives unfiltered events", () => {
    it("includes all events from multiple namespaces when namespace is empty string", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEvents({ context: "ctx", namespaces: [] }), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const default_event = mockEvent({ Namespace: "default" });
      const kube_system_event = mockEvent({ Namespace: "kube-system" });

      triggerEvent("events:update", [default_event, kube_system_event]);

      await waitFor(() => {
        expect(result.current.data).toEqual([default_event, kube_system_event]);
      });
    });
  });

  describe("4. callback.select transformer function", () => {
    it("applies callback.select to transform event data", async () => {
      const queryData = [mockEvent({ Name: "event-1" }), mockEvent({ Name: "event-2" })];
      listEventsMock.mockResolvedValue(queryData);

      const { wrapper } = makeWrapper();
      const selectFn = vi.fn((events: Event[] | undefined) => events?.slice(0, 1) ?? []);

      const { result } = renderHook(
        () => useGetEvents({ context: "ctx", namespaces: ["default"] }, { select: selectFn }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(selectFn).toHaveBeenCalled();
      expect(result.current.data?.length).toBe(1);
    });

    it("uses callback.select on merged event data", async () => {
      const { wrapper } = makeWrapper();
      const selectFn = vi.fn((events: Event[] | undefined) => events?.slice(0, 1) ?? []);

      const { result } = renderHook(
        () => useGetEvents({ context: "ctx", namespaces: ["default"] }, { select: selectFn }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const event1 = mockEvent({ Name: "event-1" });
      const event2 = mockEvent({ Name: "event-2" });

      triggerEvent("events:update", [event1, event2]);

      await waitFor(() => {
        expect(result.current.data).toEqual([event1]);
      });
    });
  });

  describe("5. queryFn error with merged event data", () => {
    it("shows merged event data even when query has error", async () => {
      listEventsMock.mockRejectedValue(new Error("Network error"));

      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetEvents({ context: "ctx", namespaces: ["default"] }),
        {
          wrapper,
        }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();

      const event1 = mockEvent();
      triggerEvent("events:update", [event1]);

      await waitFor(() => {
        expect(result.current.data).toEqual([event1]);
      });
    });
  });

  describe("6. Context empty string — hook disabled", () => {
    it("does not call ListEvents when context is empty", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetEvents({ context: "", namespaces: ["default"] }), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(listEventsMock).not.toHaveBeenCalled();
    });
  });

  describe("7. ListEvents call signature", () => {
    it("calls ListEvents with no arguments — backend pre-filters by active namespace", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetEvents({ context: "ctx", namespaces: ["Default"] }),
        {
          wrapper,
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listEventsMock).toHaveBeenCalledWith();
    });
  });

  describe("8. Multiple consecutive event pushes", () => {
    it("replaces data with latest event push each time", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetEvents({ context: "ctx", namespaces: ["default"] }),
        {
          wrapper,
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const event1 = mockEvent({ Name: "event-1" });
      triggerEvent("events:update", [event1]);

      await waitFor(() => {
        expect(result.current.data).toEqual([event1]);
      });

      const event2 = mockEvent({ Name: "event-2" });
      triggerEvent("events:update", [event2]);

      await waitFor(() => {
        expect(result.current.data).toEqual([event2]);
      });
    });
  });
});
