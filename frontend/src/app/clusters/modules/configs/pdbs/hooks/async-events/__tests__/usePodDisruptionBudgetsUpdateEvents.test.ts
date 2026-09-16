import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePodDisruptionBudgetsUpdateEvents } from "../usePodDisruptionBudgetsUpdateEvents";

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

describe("usePodDisruptionBudgetsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => usePodDisruptionBudgetsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("updates with pushed PodDisruptionBudget data when event is triggered", () => {
    const { result } = renderHook(() => usePodDisruptionBudgetsUpdateEvents());
    const payload = [
      { Name: "pdb-1", Namespace: "default" },
      { Name: "pdb-2", Namespace: "kube-system" },
    ];
    act(() => triggerEvent("pdbs:update", payload));
    expect(result.current).toEqual(payload);
  });

  it("clears the previous data when a new event is triggered", () => {
    const { result } = renderHook(() => usePodDisruptionBudgetsUpdateEvents());
    const payload1 = [{ Name: "pdb-1", Namespace: "default" }];
    act(() => triggerEvent("pdbs:update", payload1));
    expect(result.current).toEqual(payload1);

    const payload2 = [{ Name: "pdb-2", Namespace: "kube-system" }];
    act(() => triggerEvent("pdbs:update", payload2));
    expect(result.current).toEqual(payload2);
  });
});
