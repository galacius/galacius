import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWarningEventsUpdateEvents } from "../useWarningEventsUpdateEvents";

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

describe("useWarningEventsUpdateEvents", () => {
  it("returns false initially", () => {
    const { result } = renderHook(() => useWarningEventsUpdateEvents());
    expect(result.current).toBe(false);
  });

  it("toggles the returned value when an event is triggered", () => {
    const { result } = renderHook(() => useWarningEventsUpdateEvents());
    act(() => triggerEvent("events:warning:update"));
    expect(result.current).toBe(true);

    act(() => triggerEvent("events:warning:update"));
    expect(result.current).toBe(false);
  });
});
