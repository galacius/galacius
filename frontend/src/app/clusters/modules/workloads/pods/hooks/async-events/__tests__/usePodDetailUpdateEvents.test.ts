import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePodDetailUpdateEvents } from "../usePodDetailUpdateEvents";
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

const { watchPodDetailMock, unwatchPodDetailMock } = vi.hoisted(() => ({
  watchPodDetailMock: vi.fn(),
  unwatchPodDetailMock: vi.fn(),
}));

vi.mock("@wailsjs/runtime/runtime", () => ({ EventsOn: eventsOnMock }));
vi.mock("../../../api/resources", () => ({
  WatchPodDetail: watchPodDetailMock,
  UnwatchPodDetail: unwatchPodDetailMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  resetRegistry();
});

afterEach(() => {
  vi.clearAllMocks();
});

const makePod = (overrides: Partial<Pod> = {}): Pod =>
  ({
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
    ManagedFields: [{ Manager: "kubectl" } as Pod["ManagedFields"][number]],
    Conditions: [],
    ContainerDetails: [],
    InitContainerDetails: [],
    Volumes: [],
    ...overrides,
  }) as Pod;

describe("usePodDetailUpdateEvents", () => {
  it("returns undefined initially and does not watch without namespace/name", () => {
    const { result } = renderHook(() => usePodDetailUpdateEvents("", ""));
    expect(result.current).toBeUndefined();
    expect(watchPodDetailMock).not.toHaveBeenCalled();
  });

  it("watches the given pod and subscribes to the singular pod:update topic", () => {
    renderHook(() => usePodDetailUpdateEvents("default", "pod-1"));
    expect(watchPodDetailMock).toHaveBeenCalledWith("default", "pod-1");
    expect(eventsOnMock).toHaveBeenCalledWith("pod:update", expect.any(Function));
  });

  it("returns detail-only fields (e.g. ManagedFields) carried by the pod:update push", async () => {
    const { result } = renderHook(() => usePodDetailUpdateEvents("default", "pod-1"));
    const payload = makePod();
    triggerEvent("pod:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
    expect(result.current?.ManagedFields).toHaveLength(1);
  });

  it("ignores pushes for a different namespace/name", async () => {
    const { result } = renderHook(() => usePodDetailUpdateEvents("default", "pod-1"));
    const payload = makePod({ Namespace: "kube-system", Name: "other-pod" });
    triggerEvent("pod:update", payload);
    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });
  });

  it("unwatches on unmount", () => {
    const { unmount } = renderHook(() => usePodDetailUpdateEvents("default", "pod-1"));
    unmount();
    expect(unwatchPodDetailMock).toHaveBeenCalledWith("default", "pod-1");
  });
});
