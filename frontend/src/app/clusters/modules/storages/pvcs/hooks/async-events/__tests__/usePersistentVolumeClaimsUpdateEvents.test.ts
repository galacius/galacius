import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePersistentVolumeClaimsUpdateEvents } from "../usePersistentVolumeClaimsUpdateEvents";
import type { PersistentVolumeClaim } from "../../../api/resources";

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

describe("usePersistentVolumeClaimsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => usePersistentVolumeClaimsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed pvcs after an event is received", async () => {
    const { result } = renderHook(() => usePersistentVolumeClaimsUpdateEvents());
    const payload: PersistentVolumeClaim[] = [
      {
        Name: "pvc-1",
        Namespace: "default",
        StorageClass: "standard",
        Size: "10Gi",
        Pods: "pod-1",
        Age: "1h",
        Status: "Bound",
      },
    ];
    triggerEvent("persistentvolumeclaims:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned pvcs when a new event is received", async () => {
    const { result } = renderHook(() => usePersistentVolumeClaimsUpdateEvents());
    const payload1: PersistentVolumeClaim[] = [
      {
        Name: "pvc-1",
        Namespace: "default",
        StorageClass: "standard",
        Size: "10Gi",
        Pods: "pod-1",
        Age: "1h",
        Status: "Bound",
      },
    ];
    triggerEvent("persistentvolumeclaims:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: PersistentVolumeClaim[] = [
      {
        Name: "pvc-2",
        Namespace: "kube-system",
        StorageClass: "fast",
        Size: "20Gi",
        Pods: "pod-2",
        Age: "2h",
        Status: "Bound",
      },
    ];
    triggerEvent("persistentvolumeclaims:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
