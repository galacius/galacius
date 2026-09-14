import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useIngressesUpdateEvents } from "../useIngressesUpdateEvents";
import type { Ingress } from "../../../api/resources";

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

describe("useIngressesUpdateEvents", () => {
  it("returns latest ingresses from pushed events", async () => {
    const { result } = renderHook(() => useIngressesUpdateEvents());
    expect(result.current).toEqual([]);

    const payload: Ingress[] = [{ Name: "ing-1", Namespace: "default" } as Ingress];
    triggerEvent("ingresses:update", payload);

    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned ingresses on subsequent events", async () => {
    const { result } = renderHook(() => useIngressesUpdateEvents());

    const payload1: Ingress[] = [{ Name: "ing-1", Namespace: "default" } as Ingress];
    triggerEvent("ingresses:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: Ingress[] = [
      { Name: "ing-1", Namespace: "default" } as Ingress,
      { Name: "ing-2", Namespace: "kube-system" } as Ingress,
    ];
    triggerEvent("ingresses:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
