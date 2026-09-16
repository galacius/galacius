import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useConfigMapsUpdateEvents } from "../useConfigMapsUpdateEvents";
import type { ConfigMap } from "../../../api/resources";

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

describe("useConfigMapsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useConfigMapsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed configmaps after an event is received", async () => {
    const { result } = renderHook(() => useConfigMapsUpdateEvents());
    const payload: ConfigMap[] = [
      {
        Name: "config-1",
        Namespace: "default",
        Keys: ["key1"],
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Data: { key1: "value1" },
      },
    ];
    triggerEvent("configmaps:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned configmaps when a new event is received", async () => {
    const { result } = renderHook(() => useConfigMapsUpdateEvents());
    const payload1: ConfigMap[] = [
      {
        Name: "config-1",
        Namespace: "default",
        Keys: ["key1"],
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Data: { key1: "value1" },
      },
    ];
    triggerEvent("configmaps:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: ConfigMap[] = [
      {
        Name: "config-2",
        Namespace: "kube-system",
        Keys: ["key2"],
        Age: "2h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Data: { key2: "value2" },
      },
    ];
    triggerEvent("configmaps:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
