import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEndpointsUpdateEvents } from "../useEndpointsUpdateEvents";
import type { Endpoint } from "../../../api/resources";

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

describe("useEndpointsUpdateEvents", () => {
  it("returns latest endpoints from pushed events", async () => {
    const { result } = renderHook(() => useEndpointsUpdateEvents());
    expect(result.current).toEqual([]);

    const payload: Endpoint[] = [{ Name: "ep-1", Namespace: "default" } as Endpoint];
    triggerEvent("endpoints:update", payload);

    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned endpoints on subsequent events", async () => {
    const { result } = renderHook(() => useEndpointsUpdateEvents());

    const payload1: Endpoint[] = [{ Name: "ep-1", Namespace: "default" } as Endpoint];
    triggerEvent("endpoints:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: Endpoint[] = [
      { Name: "ep-1", Namespace: "default" } as Endpoint,
      { Name: "ep-2", Namespace: "kube-system" } as Endpoint,
    ];
    triggerEvent("endpoints:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
