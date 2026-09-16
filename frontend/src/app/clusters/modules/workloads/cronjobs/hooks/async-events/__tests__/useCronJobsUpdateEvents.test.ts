import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCronJobsUpdateEvents } from "../useCronJobsUpdateEvents";
import type { CronJob } from "../../../api/resources";

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

describe("useCronJobsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useCronJobsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed cronjobs after an event is received", async () => {
    const { result } = renderHook(() => useCronJobsUpdateEvents());
    const payload: CronJob[] = [
      {
        Name: "cj-1",
        Namespace: "default",
        Schedule: "0 0 * * *",
        Timezone: "UTC",
        Suspend: false,
        Active: 0,
        LastSchedule: "2025-01-01T00:00:00Z",
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        ManagedFields: [],
        ConcurrencyPolicy: "Allow",
        SuccessfulJobsHistoryLimit: 3,
        FailedJobsHistoryLimit: 1,
        JobParallelism: 1,
        JobCompletions: "1",
        JobSuspend: false,
        JobTTLSecondsAfterFinished: 0,
      },
    ];
    triggerEvent("cronjobs:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned cronjobs when a new event is received", async () => {
    const { result } = renderHook(() => useCronJobsUpdateEvents());
    const payload1: CronJob[] = [
      {
        Name: "cj-1",
        Namespace: "default",
        Schedule: "0 0 * * *",
        Timezone: "UTC",
        Suspend: false,
        Active: 0,
        LastSchedule: "2025-01-01T00:00:00Z",
        Age: "1h",
        CreatedAt: "2025-01-01T00:00:00Z",
        ManagedFields: [],
        ConcurrencyPolicy: "Allow",
        SuccessfulJobsHistoryLimit: 3,
        FailedJobsHistoryLimit: 1,
        JobParallelism: 1,
        JobCompletions: "1",
        JobSuspend: false,
        JobTTLSecondsAfterFinished: 0,
      },
    ];
    triggerEvent("cronjobs:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: CronJob[] = [
      {
        Name: "cj-2",
        Namespace: "kube-system",
        Schedule: "*/5 * * * *",
        Timezone: "UTC",
        Suspend: true,
        Active: 1,
        LastSchedule: "2025-01-01T00:05:00Z",
        Age: "5m",
        CreatedAt: "2025-01-01T00:00:00Z",
        ManagedFields: [],
        ConcurrencyPolicy: "Forbid",
        SuccessfulJobsHistoryLimit: 3,
        FailedJobsHistoryLimit: 1,
        JobParallelism: 1,
        JobCompletions: "1",
        JobSuspend: true,
        JobTTLSecondsAfterFinished: 0,
      },
    ];
    triggerEvent("cronjobs:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
