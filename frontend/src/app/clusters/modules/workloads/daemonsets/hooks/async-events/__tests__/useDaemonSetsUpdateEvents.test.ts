import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DaemonSet } from "../../../api/resources";
import { useDaemonSetsUpdateEvents } from "../useDaemonSetsUpdateEvents";

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

describe("useDaemonSetsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useDaemonSetsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed daemonsets after an event is received", async () => {
    const { result } = renderHook(() => useDaemonSetsUpdateEvents());
    const payload: DaemonSet[] = [
      {
        Name: "ds-1",
        Namespace: "default",
        Pods: "3/3",
        NodeSelector: {},
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { app: "ds-1" },
        Images: ["nginx:latest"],
        StrategyType: "RollingUpdate",
        Tolerations: 0,
        PodStatus: "Running",
      },
    ];
    triggerEvent("daemonsets:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned daemonsets when a new event is received", async () => {
    const { result } = renderHook(() => useDaemonSetsUpdateEvents());
    const payload1: DaemonSet[] = [
      {
        Name: "ds-1",
        Namespace: "default",
        Pods: "3/3",
        NodeSelector: {},
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { app: "ds-1" },
        Images: ["nginx:latest"],
        StrategyType: "RollingUpdate",
        Tolerations: 0,
        PodStatus: "Running",
      },
    ];
    triggerEvent("daemonsets:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: DaemonSet[] = [
      {
        Name: "ds-2",
        Namespace: "kube-system",
        Pods: "2/2",
        NodeSelector: {},
        Age: "5m",
        CreatedAt: "2025-01-01T00:05:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { app: "ds-2" },
        Images: ["fluentd:latest"],
        StrategyType: "RollingUpdate",
        Tolerations: 1,
        PodStatus: "Running",
      },
    ];
    triggerEvent("daemonsets:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
