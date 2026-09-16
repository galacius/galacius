import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDeploymentsUpdateEvents } from "../useDeploymentsUpdateEvents";
import type { Deployment } from "../../../api/resources";

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

describe("useDeploymentsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useDeploymentsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed deployments after an event is received", async () => {
    const { result } = renderHook(() => useDeploymentsUpdateEvents());
    const payload: Deployment[] = [
      {
        Name: "deploy-1",
        Namespace: "default",
        Pods: "1/1",
        Replicas: 1,
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        ReplicasDetail: "1/1",
        Selector: { app: "deploy-1" },
        NodeSelector: {},
        StrategyType: "RollingUpdate",
        Conditions: [],
        Tolerations: 0,
        TolerationDetails: [],
        AffinityCount: 0,
        Affinities: "",
      },
    ];
    triggerEvent("deployments:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned deployments when a new event is received", async () => {
    const { result } = renderHook(() => useDeploymentsUpdateEvents());
    const payload1: Deployment[] = [
      {
        Name: "deploy-1",
        Namespace: "default",
        Pods: "1/1",
        Replicas: 1,
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        ReplicasDetail: "1/1",
        Selector: { app: "deploy-1" },
        NodeSelector: {},
        StrategyType: "RollingUpdate",
        Conditions: [],
        Tolerations: 0,
        TolerationDetails: [],
        AffinityCount: 0,
        Affinities: "",
      },
    ];
    triggerEvent("deployments:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: Deployment[] = [
      {
        Name: "deploy-2",
        Namespace: "kube-system",
        Pods: "0/1",
        Replicas: 1,
        Age: "5m",
        CreatedAt: "2025-01-01T00:05:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        ReplicasDetail: "0/1",
        Selector: { app: "deploy-2" },
        NodeSelector: {},
        StrategyType: "RollingUpdate",
        Conditions: [],
        Tolerations: 0,
        TolerationDetails: [],
        AffinityCount: 0,
        Affinities: "",
      },
    ];
    triggerEvent("deployments:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
