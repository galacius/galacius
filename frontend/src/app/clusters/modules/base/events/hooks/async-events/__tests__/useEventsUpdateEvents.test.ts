import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEventsUpdateEvents } from "../useEventsUpdateEvents";
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

vi.mock("@wailsjs/runtime/runtime", () => ({ EventsOn: eventsOnMock }));

beforeEach(() => {
  vi.clearAllMocks();
  resetRegistry();
});

describe("useEventsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useEventsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed events after an event is received", async () => {
    const { result } = renderHook(() => useEventsUpdateEvents());
    const payload: Event[] = [
      {
        Name: "event-1",
        Namespace: "default",
        Type: "Normal",
        Reason: "Created",
        Message: "Pod created",
        InvolvedObjectKind: "Pod",
        InvolvedObjectName: "test",
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
      },
    ];
    triggerEvent("events:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned events when a new event is received", async () => {
    const { result } = renderHook(() => useEventsUpdateEvents());
    const payload1: Event[] = [
      {
        Name: "event-1",
        Namespace: "default",
        Type: "Normal",
        Reason: "Created",
        Message: "Pod created",
        InvolvedObjectKind: "Pod",
        InvolvedObjectName: "test",
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
      },
    ];
    triggerEvent("events:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: Event[] = [
      {
        Name: "event-2",
        Namespace: "kube-system",
        Type: "Warning",
        Reason: "Failed",
        Message: "Pod failed",
        InvolvedObjectKind: "Pod",
        InvolvedObjectName: "other",
        InvolvedObjectNamespace: "kube-system",
        InvolvedObjectFieldPath: "",
        Source: "kubelet",
        Count: 2,
        Age: "5m",
        LastSeen: "5m",
        FirstSeen: "10m",
        FirstSeenAt: 1735689605,
        LastSeenAt: 1735689610,
        CreatedAt: 1735689610,
        ManagedFields: [],
      },
    ];
    triggerEvent("events:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
