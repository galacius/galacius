import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStatefulSetsUpdateEvents } from "../useStatefulSetsUpdateEvents";
import type { StatefulSet } from "../../../api/resources";

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

describe("useStatefulSetsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useStatefulSetsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed statefulsets after an event is received", async () => {
    const { result } = renderHook(() => useStatefulSetsUpdateEvents());
    const payload: StatefulSet[] = [
      {
        Name: "ss-1",
        Namespace: "default",
        Pods: "1/1",
        Replicas: 1,
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { app: "ss-1" },
        Images: ["postgres:latest"],
        Affinities: 0,
        PodStatus: "Running",
        HealthStatus: "Healthy",
        HealthMessage: "",
      },
    ];
    triggerEvent("statefulsets:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned statefulsets when a new event is received", async () => {
    const { result } = renderHook(() => useStatefulSetsUpdateEvents());
    const payload1: StatefulSet[] = [
      {
        Name: "ss-1",
        Namespace: "default",
        Pods: "1/1",
        Replicas: 1,
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { app: "ss-1" },
        Images: ["postgres:latest"],
        Affinities: 0,
        PodStatus: "Running",
        HealthStatus: "Healthy",
        HealthMessage: "",
      },
    ];
    triggerEvent("statefulsets:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: StatefulSet[] = [
      {
        Name: "ss-2",
        Namespace: "kube-system",
        Pods: "0/1",
        Replicas: 1,
        Age: "5m",
        CreatedAt: "2025-01-01T00:05:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { app: "ss-2" },
        Images: ["redis:latest"],
        Affinities: 0,
        PodStatus: "Pending",
        HealthStatus: "Progressing",
        HealthMessage: "Waiting for 1 pods to be ready...",
      },
    ];
    triggerEvent("statefulsets:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
