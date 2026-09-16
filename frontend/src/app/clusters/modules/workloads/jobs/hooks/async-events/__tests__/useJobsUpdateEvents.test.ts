import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useJobsUpdateEvents } from "../useJobsUpdateEvents";
import type { Job } from "../../../api/resources";

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

describe("useJobsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useJobsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed jobs after an event is received", async () => {
    const { result } = renderHook(() => useJobsUpdateEvents());
    const payload: Job[] = [
      {
        Name: "job-1",
        Namespace: "default",
        Status: "Complete",
        Completions: 1,
        Duration: "10s",
        Age: "1h",
        Conditions: [],
        Resumed: false,
        Succeeded: 1,
        Parallelism: 1,
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { "job-name": "job-1" },
        CompletionMode: "NonIndexed",
        StartTime: "2025-01-01T00:00:00Z",
        StartTimeAge: "1h",
        CompletedAt: "2025-01-01T00:00:10Z",
        CompletedAtAge: "1h",
        PodsStatuses: ["1 Succeeded"],
        OwnerKind: "",
        OwnerName: "",
      },
    ];
    triggerEvent("jobs:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned jobs when a new event is received", async () => {
    const { result } = renderHook(() => useJobsUpdateEvents());
    const payload1: Job[] = [
      {
        Name: "job-1",
        Namespace: "default",
        Status: "Complete",
        Completions: 1,
        Duration: "10s",
        Age: "1h",
        Conditions: [],
        Resumed: false,
        Succeeded: 1,
        Parallelism: 1,
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { "job-name": "job-1" },
        CompletionMode: "NonIndexed",
        StartTime: "2025-01-01T00:00:00Z",
        StartTimeAge: "1h",
        CompletedAt: "2025-01-01T00:00:10Z",
        CompletedAtAge: "1h",
        PodsStatuses: ["1 Succeeded"],
        OwnerKind: "",
        OwnerName: "",
      },
    ];
    triggerEvent("jobs:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: Job[] = [
      {
        Name: "job-2",
        Namespace: "kube-system",
        Status: "Running",
        Completions: 0,
        Duration: "5s",
        Age: "5m",
        Conditions: [],
        Resumed: false,
        Succeeded: 0,
        Parallelism: 1,
        CreatedAt: "2025-01-01T00:00:00Z",
        Labels: {},
        Annotations: {},
        ManagedFields: [],
        Selector: { "job-name": "job-2" },
        CompletionMode: "NonIndexed",
        StartTime: "2025-01-01T00:05:00Z",
        StartTimeAge: "5m",
        CompletedAt: "",
        CompletedAtAge: "",
        PodsStatuses: ["1 Running"],
        OwnerKind: "",
        OwnerName: "",
      },
    ];
    triggerEvent("jobs:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
