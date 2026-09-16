import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLeasesUpdateEvents } from "../useLeasesUpdateEvents";
import type { Lease } from "../../../api/resources";

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

describe("useLeasesUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useLeasesUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed leases after an event is received", async () => {
    const { result } = renderHook(() => useLeasesUpdateEvents());
    const payload: Lease[] = [
      {
        Name: "lease-1",
        Namespace: "default",
        HolderIdentity: "node-1",
        LeaseDurationSeconds: 15,
        AcquireTime: "2025-01-01T00:00:00Z",
        RenewTime: "2025-01-01T00:00:10Z",
        LeaseTransitions: 0,
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
      },
    ];
    triggerEvent("leases:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned leases when a new event is received", async () => {
    const { result } = renderHook(() => useLeasesUpdateEvents());
    const payload1: Lease[] = [
      {
        Name: "lease-1",
        Namespace: "default",
        HolderIdentity: "node-1",
        LeaseDurationSeconds: 15,
        AcquireTime: "2025-01-01T00:00:00Z",
        RenewTime: "2025-01-01T00:00:10Z",
        LeaseTransitions: 0,
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
      },
    ];
    triggerEvent("leases:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: Lease[] = [
      {
        Name: "lease-2",
        Namespace: "kube-system",
        HolderIdentity: "node-2",
        LeaseDurationSeconds: 15,
        AcquireTime: "2025-01-01T00:00:05Z",
        RenewTime: "2025-01-01T00:00:15Z",
        LeaseTransitions: 1,
        Age: "5m",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
      },
    ];
    triggerEvent("leases:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
