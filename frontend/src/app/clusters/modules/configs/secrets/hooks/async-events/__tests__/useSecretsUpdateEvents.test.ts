import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSecretsUpdateEvents } from "../useSecretsUpdateEvents";
import type { Secret } from "../../../api/resources";

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

describe("useSecretsUpdateEvents", () => {
  it("returns an empty array initially", () => {
    const { result } = renderHook(() => useSecretsUpdateEvents());
    expect(result.current).toEqual([]);
  });

  it("returns the pushed secrets after an event is received", async () => {
    const { result } = renderHook(() => useSecretsUpdateEvents());
    const payload: Secret[] = [
      {
        Name: "secret-1",
        Namespace: "default",
        Labels: ["label1=value1"],
        Keys: ["key1"],
        Type: "Opaque",
        Age: "1h",
      },
    ];
    triggerEvent("secrets:update", payload);
    await waitFor(() => {
      expect(result.current).toEqual(payload);
    });
  });

  it("updates returned secrets when a new event is received", async () => {
    const { result } = renderHook(() => useSecretsUpdateEvents());
    const payload1: Secret[] = [
      {
        Name: "secret-1",
        Namespace: "default",
        Labels: ["label1=value1"],
        Keys: ["key1"],
        Type: "Opaque",
        Age: "1h",
      },
    ];
    triggerEvent("secrets:update", payload1);
    await waitFor(() => {
      expect(result.current).toEqual(payload1);
    });

    const payload2: Secret[] = [
      {
        Name: "secret-2",
        Namespace: "kube-system",
        Labels: ["label2=value2"],
        Keys: ["key2"],
        Type: "kubernetes.io/service-account-token",
        Age: "2h",
      },
    ];
    triggerEvent("secrets:update", payload2);
    await waitFor(() => {
      expect(result.current).toEqual(payload2);
    });
  });
});
