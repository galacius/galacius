import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePodsUpdateEvents } from "../usePodsUpdateEvents";
import type { Pod } from "../../../api/resources";

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

afterEach(() => {
  vi.clearAllMocks();
});

describe("usePodsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => usePodsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("subscribes to the single cluster-wide pods:update event", () => {
    renderHook(() => usePodsUpdateEvents());
    expect(eventsOnMock).toHaveBeenCalledWith("pods:update", expect.any(Function));
  });

  it("returns the pushed pods after a pods:update event is received", async () => {
    const { result } = renderHook(() => usePodsUpdateEvents());
    const payload: Pod[] = [
      {
        Name: "pod-1",
        Namespace: "default",
        Status: "Running",
        Ready: "1/1",
        Containers: 1,
        Restarts: 0,
        ControlledBy: "Deployment",
        NodeName: "node-1",
        QoS: "BestEffort",
        Age: "1h",
        CPU: "10m",
        Memory: "64Mi",
        Disk: "0",
        CPUPercent: 1,
        MemPercent: 2,
        DiskPercent: 0,
        CreatedAt: "2025-01-01T00:00:00Z",
        ServiceAccount: "default",
        PriorityClass: "",
        TerminationGracePeriod: "30s",
        ControlledByName: "my-deployment",
        HostIPs: [],
        PodIPs: ["10.0.0.1"],
        Tolerations: 0,
        TolerationDetails: [],
        AffinityCount: 0,
        Affinities: "",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Conditions: [],
        ContainerDetails: [],
        InitContainerDetails: [],
        Volumes: [],
      },
    ];
    triggerEvent("pods:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned pods when a new event is received", async () => {
    const { result } = renderHook(() => usePodsUpdateEvents());
    const payload1: Pod[] = [
      {
        Name: "pod-1",
        Namespace: "default",
        Status: "Running",
        Ready: "1/1",
        Containers: 1,
        Restarts: 0,
        ControlledBy: "Deployment",
        NodeName: "node-1",
        QoS: "BestEffort",
        Age: "1h",
        CPU: "10m",
        Memory: "64Mi",
        Disk: "0",
        CPUPercent: 1,
        MemPercent: 2,
        DiskPercent: 0,
        CreatedAt: "2025-01-01T00:00:00Z",
        ServiceAccount: "default",
        PriorityClass: "",
        TerminationGracePeriod: "30s",
        ControlledByName: "my-deployment",
        HostIPs: [],
        PodIPs: ["10.0.0.1"],
        Tolerations: 0,
        TolerationDetails: [],
        AffinityCount: 0,
        Affinities: "",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Conditions: [],
        ContainerDetails: [],
        InitContainerDetails: [],
        Volumes: [],
      },
    ];
    triggerEvent("pods:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: Pod[] = [
      {
        Name: "pod-2",
        Namespace: "kube-system",
        Status: "Pending",
        Ready: "0/1",
        Containers: 1,
        Restarts: 0,
        ControlledBy: "",
        NodeName: "",
        QoS: "BestEffort",
        Age: "5m",
        CPU: "0m",
        Memory: "0Mi",
        Disk: "0",
        CPUPercent: 0,
        MemPercent: 0,
        DiskPercent: 0,
        CreatedAt: "2025-01-01T00:05:00Z",
        ServiceAccount: "",
        PriorityClass: "",
        TerminationGracePeriod: "30s",
        ControlledByName: "",
        HostIPs: [],
        PodIPs: [],
        Tolerations: 0,
        TolerationDetails: [],
        AffinityCount: 0,
        Affinities: "",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Conditions: [],
        ContainerDetails: [],
        InitContainerDetails: [],
        Volumes: [],
      },
    ];
    triggerEvent("pods:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
