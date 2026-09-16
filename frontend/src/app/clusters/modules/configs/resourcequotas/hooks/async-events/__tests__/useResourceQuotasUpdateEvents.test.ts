import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useResourceQuotasUpdateEvents } from "../useResourceQuotasUpdateEvents";
import type { ResourceQuota } from "../../../api/resources";

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

describe("useResourceQuotasUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useResourceQuotasUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed resourcequotas after an event is received", async () => {
    const { result } = renderHook(() => useResourceQuotasUpdateEvents());
    const payload: ResourceQuota[] = [
      {
        Name: "quota-1",
        Namespace: "default",
        Age: "1h",
      },
    ];
    triggerEvent("resourcequotas:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned resourcequotas when a new event is received", async () => {
    const { result } = renderHook(() => useResourceQuotasUpdateEvents());
    const payload1: ResourceQuota[] = [
      {
        Name: "quota-1",
        Namespace: "default",
        Age: "1h",
      },
    ];
    triggerEvent("resourcequotas:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: ResourceQuota[] = [
      {
        Name: "quota-2",
        Namespace: "kube-system",
        Age: "2h",
      },
    ];
    triggerEvent("resourcequotas:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
