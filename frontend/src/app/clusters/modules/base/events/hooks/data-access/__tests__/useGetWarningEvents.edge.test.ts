import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useGetWarningEvents } from "../useGetWarningEvents";
import { QUERY_KEY_WARNING_EVENTS } from "../../../api/api.const";
import type { Event } from "../../../api/resources";

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

const listWarningEventsMock = vi.hoisted(() => vi.fn());

vi.mock("@wailsjs/runtime/runtime", () => ({ EventsOn: eventsOnMock }));
vi.mock("../../../api/resources", () => ({
  ListWarningEvents: listWarningEventsMock,
}));

const mockEvent = (overrides: Partial<Event> = {}): Event => ({
  Name: "event-1",
  Namespace: "default",
  Type: "Warning",
  Reason: "Failed",
  Message: "Test warning",
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
  listWarningEventsMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useGetWarningEvents edge cases", () => {
  describe("1. triggerRefresh toggle causes queryKey change and refetch", () => {
    it("refetches when triggerRefresh toggles from false to true", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const callCount1 = listWarningEventsMock.mock.calls.length;

      triggerEvent("events:warning:update");

      await waitFor(() => {
        expect(listWarningEventsMock.mock.calls.length).toBeGreaterThan(callCount1);
      });
    });

    it("maintains success state through toggle", async () => {
      listWarningEventsMock.mockResolvedValue([mockEvent()]);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      triggerEvent("events:warning:update");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe("2. Multiple toggles cause multiple refetches", () => {
    it("refetches again when triggerRefresh toggles back to original value", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const callCount1 = listWarningEventsMock.mock.calls.length;

      triggerEvent("events:warning:update");

      await waitFor(() => {
        expect(listWarningEventsMock.mock.calls.length).toBeGreaterThan(callCount1);
      });

      const callCount2 = listWarningEventsMock.mock.calls.length;

      triggerEvent("events:warning:update");

      await waitFor(() => {
        expect(listWarningEventsMock.mock.calls.length).toBeGreaterThan(callCount2);
      });
    });
  });

  describe("3. Sort order (descending by CreatedAt)", () => {
    it("sorts events in descending order by CreatedAt", async () => {
      const events = [
        mockEvent({ Name: "event-1", CreatedAt: 1735689600 }),
        mockEvent({ Name: "event-2", CreatedAt: 1735689610 }),
        mockEvent({ Name: "event-3", CreatedAt: 1735689605 }),
      ];
      listWarningEventsMock.mockResolvedValue(events);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([
        mockEvent({ Name: "event-2", CreatedAt: 1735689610 }),
        mockEvent({ Name: "event-3", CreatedAt: 1735689605 }),
        mockEvent({ Name: "event-1", CreatedAt: 1735689600 }),
      ]);
    });

    it("handles events with same CreatedAt timestamp", async () => {
      const now = 1735689600;
      const events = [
        mockEvent({ Name: "event-a", CreatedAt: now }),
        mockEvent({ Name: "event-b", CreatedAt: now }),
        mockEvent({ Name: "event-c", CreatedAt: now }),
      ];
      listWarningEventsMock.mockResolvedValue(events);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.length).toBe(3);
      expect(result.current.data?.every((e) => e.CreatedAt === now)).toBe(true);
    });

    it("sorts empty array", async () => {
      listWarningEventsMock.mockResolvedValue([]);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe("4. Context empty string — hook disabled but respects queryKey shape", () => {
    it("does not call ListWarningEvents when context is empty", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetWarningEvents({ context: "", namespaces: ["default"] }), {
        wrapper,
      });
      await new Promise((r) => setTimeout(r, 20));
      expect(listWarningEventsMock).not.toHaveBeenCalled();
    });

    it("queryKey shape includes triggerRefresh even when disabled", async () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetWarningEvents({ context: "", namespaces: ["default"] }), {
        wrapper,
      });
      await new Promise((r) => setTimeout(r, 20));

      const queries = client.getQueryCache().findAll();
      if (queries.length > 0) {
        const key = queries[0].queryKey;
        expect(key[0]).toBe(QUERY_KEY_WARNING_EVENTS);
        expect(key[1]).toEqual({ context: "", namespaces: ["default"] });
        expect(typeof key[2]).toBe("boolean");
      }
    });
  });

  describe("5. API handles namespace filtering; hook sorts the result", () => {
    it("sorts all returned events in descending order by CreatedAt", async () => {
      const events = [
        mockEvent({ Name: "event-1", Namespace: "default", CreatedAt: 1735689600 }),
        mockEvent({ Name: "event-3", Namespace: "default", CreatedAt: 1735689605 }),
        mockEvent({ Name: "event-2", Namespace: "default", CreatedAt: 1735689610 }),
      ];
      listWarningEventsMock.mockResolvedValue(events);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.length).toBe(3);
      expect(result.current.data?.[0].Name).toBe("event-2");
      expect(result.current.data?.[1].Name).toBe("event-3");
      expect(result.current.data?.[2].Name).toBe("event-1");
    });
  });

  describe("6. Cluster-wide (namespace === '') receives all warning events", () => {
    it("returns all events without namespace filtering when namespace is empty", async () => {
      const events = [
        mockEvent({ Name: "event-1", Namespace: "default", CreatedAt: 1735689600 }),
        mockEvent({ Name: "event-2", Namespace: "kube-system", CreatedAt: 1735689610 }),
        mockEvent({ Name: "event-3", Namespace: "other", CreatedAt: 1735689605 }),
      ];
      listWarningEventsMock.mockResolvedValue(events);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetWarningEvents({ context: "ctx", namespaces: [] }), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.length).toBe(3);
      expect(result.current.data?.[0].CreatedAt).toBeGreaterThanOrEqual(
        result.current.data![1].CreatedAt
      );
    });
  });

  describe("7. queryFn error state", () => {
    it("reflects error state when ListWarningEvents fails", async () => {
      listWarningEventsMock.mockRejectedValue(new Error("Network error"));

      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(expect.any(Error));
    });
  });

  describe("8. Fetch behavior on subsequent calls", () => {
    it("uses cached result on re-render without triggerRefresh change", async () => {
      const { wrapper } = makeWrapper();
      const { result, rerender } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const callCount1 = listWarningEventsMock.mock.calls.length;

      rerender();

      await new Promise((r) => setTimeout(r, 20));
      expect(listWarningEventsMock.mock.calls.length).toBe(callCount1);
    });

    it("refetches when triggerRefresh boolean changes due to event", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["default"] }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const callCount1 = listWarningEventsMock.mock.calls.length;

      triggerEvent("events:warning:update");

      await waitFor(() => {
        expect(listWarningEventsMock.mock.calls.length).toBeGreaterThan(callCount1);
      });
    });
  });
});
