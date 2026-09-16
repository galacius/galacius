import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useReplicaSetsUpdateEvents } from "../useReplicaSetsUpdateEvents";
import type { ReplicaSet } from "../../../api/resources";

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

describe("useReplicaSetsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useReplicaSetsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed replicasets after an event is received", async () => {
    const { result } = renderHook(() => useReplicaSetsUpdateEvents());
    const payload: ReplicaSet[] = [
      {
        Name: "rs-1",
        Namespace: "default",
        Desired: 1,
        Current: 1,
        Ready: 1,
        Age: "1h",
        OwnerName: "my-deployment",
        OwnerKind: "Deployment",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { app: "rs-1" },
        NodeSelector: {},
        Images: ["nginx:latest"],
        ReplicasDetail: "1/1",
        Tolerations: 0,
        Affinities: 0,
        PodStatus: "Running",
        HealthStatus: "Healthy",
        HealthMessage: "",
      },
    ];
    triggerEvent("replicasets:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned replicasets when a new event is received", async () => {
    const { result } = renderHook(() => useReplicaSetsUpdateEvents());
    const payload1: ReplicaSet[] = [
      {
        Name: "rs-1",
        Namespace: "default",
        Desired: 1,
        Current: 1,
        Ready: 1,
        Age: "1h",
        OwnerName: "my-deployment",
        OwnerKind: "Deployment",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { app: "rs-1" },
        NodeSelector: {},
        Images: ["nginx:latest"],
        ReplicasDetail: "1/1",
        Tolerations: 0,
        Affinities: 0,
        PodStatus: "Running",
        HealthStatus: "Healthy",
        HealthMessage: "",
      },
    ];
    triggerEvent("replicasets:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: ReplicaSet[] = [
      {
        Name: "rs-2",
        Namespace: "kube-system",
        Desired: 1,
        Current: 1,
        Ready: 0,
        Age: "5m",
        OwnerName: "",
        OwnerKind: "",
        CreatedAt: "2025-01-01T00:05:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { app: "rs-2" },
        NodeSelector: {},
        Images: ["fluentd:latest"],
        ReplicasDetail: "0/1",
        Tolerations: 0,
        Affinities: 0,
        PodStatus: "Pending",
        HealthStatus: "Progressing",
        HealthMessage: "Waiting for rollout to finish: 0 out of 1 new replicas are available",
      },
    ];
    triggerEvent("replicasets:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
