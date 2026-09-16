import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEndpointSlicesUpdateEvents } from "../useEndpointSlicesUpdateEvents";
import type { EndpointSlice } from "../../../api/resources";

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

describe("useEndpointSlicesUpdateEvents", () => {
  it("returns latest endpoint slices from pushed events", async () => {
    const { result } = renderHook(() => useEndpointSlicesUpdateEvents());
    expect(result.current).toEqual([]);

    const payload: EndpointSlice[] = [{ Name: "eps-1", Namespace: "default" } as EndpointSlice];
    triggerEvent("endpointslices:update", payload);

    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned endpoint slices on subsequent events", async () => {
    const { result } = renderHook(() => useEndpointSlicesUpdateEvents());

    const payload1: EndpointSlice[] = [{ Name: "eps-1", Namespace: "default" } as EndpointSlice];
    triggerEvent("endpointslices:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: EndpointSlice[] = [
      { Name: "eps-1", Namespace: "default" } as EndpointSlice,
      { Name: "eps-2", Namespace: "kube-system" } as EndpointSlice,
    ];
    triggerEvent("endpointslices:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
