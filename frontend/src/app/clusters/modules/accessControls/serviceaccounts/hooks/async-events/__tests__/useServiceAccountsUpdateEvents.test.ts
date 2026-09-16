import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useServiceAccountsUpdateEvents } from "../useServiceAccountsUpdateEvents";

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

describe("useServiceAccountsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useServiceAccountsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("updates with pushed data when event is triggered", () => {
    const { result } = renderHook(() => useServiceAccountsUpdateEvents());
    const payload = [{ Name: "one" }, { Name: "two" }];
    act(() => triggerEvent("serviceaccounts:update", payload));
    expect(result.current).toEqual(payload);
  });

  it("clears the previous data when a new event is triggered", () => {
    const { result } = renderHook(() => useServiceAccountsUpdateEvents());
    const payload1 = [{ Name: "one" }];
    act(() => triggerEvent("serviceaccounts:update", payload1));
    expect(result.current).toEqual(payload1);

    const payload2 = [{ Name: "two" }];
    act(() => triggerEvent("serviceaccounts:update", payload2));
    expect(result.current).toEqual(payload2);
  });
});
