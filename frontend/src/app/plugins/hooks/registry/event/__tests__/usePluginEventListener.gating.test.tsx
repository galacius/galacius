import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePluginEventListener } from "../usePluginEventListener";
import { pluginEventRegistry } from "../../../../../clusters/plugins/hooks/registry/event/pluginEventRegistry";

const { eventsOnMock, triggerEvent } = vi.hoisted(() => {
  const registry: Record<string, (...args: unknown[]) => void> = {};
  const mock = vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    registry[event] = cb;
    return vi.fn();
  });
  return {
    eventsOnMock: mock,
    triggerEvent: (key: string, ...args: unknown[]) => registry[key]?.(...args),
  };
});

vi.mock("@wailsjs/runtime/runtime", () => ({ EventsOn: eventsOnMock }));

const useGetInstalledPluginsMock = vi.hoisted(() => vi.fn());
vi.mock("../../../../../marketplace/hooks/data-access/useGetInstalledPlugins", () => ({
  useGetInstalledPlugins: useGetInstalledPluginsMock,
}));

describe("usePluginEventListener gating", () => {
  beforeEach(() => {
    pluginEventRegistry.unregisterEvents("disabled-plugin");
    pluginEventRegistry.unregisterEvents("ready-plugin");
  });

  it("does not dispatch to a plugin that is installed but not READY (e.g. disabled/crashed)", () => {
    const handler = vi.fn();
    pluginEventRegistry.registerEvents("disabled-plugin", { "test:event": handler });

    // Plugin is still present in pluginStatuses (per DisablePlugin's actual behavior)
    // but its status is DISABLED, so readyPlugins excludes it.
    useGetInstalledPluginsMock.mockReturnValue({
      pluginStatuses: [{ pluginId: "disabled-plugin", status: "DISABLED" }],
      readyPlugins: [],
      isLoading: false,
    });

    renderHook(() => usePluginEventListener());

    triggerEvent("plugin:event", {
      pluginId: "disabled-plugin",
      eventName: "test:event",
      payload: { data: 1 },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("dispatches to a plugin that is installed and READY", () => {
    const handler = vi.fn();
    pluginEventRegistry.registerEvents("ready-plugin", { "test:event": handler });

    useGetInstalledPluginsMock.mockReturnValue({
      pluginStatuses: [{ pluginId: "ready-plugin", status: "READY" }],
      readyPlugins: [{ pluginId: "ready-plugin", status: "READY" }],
      isLoading: false,
    });

    renderHook(() => usePluginEventListener());

    triggerEvent("plugin:event", {
      pluginId: "ready-plugin",
      eventName: "test:event",
      payload: { data: 2 },
    });

    expect(handler).toHaveBeenCalledWith({ data: 2 });
  });
});
