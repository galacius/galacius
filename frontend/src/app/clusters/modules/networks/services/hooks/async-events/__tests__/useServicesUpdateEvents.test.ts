import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useServicesUpdateEvents } from "../useServicesUpdateEvents";
import type { Service } from "../../../api/resources";

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

describe("useServicesUpdateEvents", () => {
  it("returns latest services from pushed events", async () => {
    const { result } = renderHook(() => useServicesUpdateEvents());
    expect(result.current).toEqual([]);

    const payload: Service[] = [{ Name: "svc-1", Namespace: "default" } as Service];
    triggerEvent("services:update", payload);

    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned services on subsequent events", async () => {
    const { result } = renderHook(() => useServicesUpdateEvents());

    const payload1: Service[] = [{ Name: "svc-1", Namespace: "default" } as Service];
    triggerEvent("services:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: Service[] = [
      { Name: "svc-1", Namespace: "default" } as Service,
      { Name: "svc-2", Namespace: "kube-system" } as Service,
    ];
    triggerEvent("services:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
