import type { SharedUnifiedTrayContentProps } from "@galacius/core";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pluginTrayRegistry } from "../pluginTrayRegistry";

const TrayComponent = (() => null) as ComponentType<SharedUnifiedTrayContentProps>;
const families = { "helm-chart": TrayComponent };

describe("pluginTrayRegistry", () => {
  beforeEach(() => {
    pluginTrayRegistry.clearTrayRegistry();
  });

  it("registers tray families keyed by pluginId", () => {
    pluginTrayRegistry.registerTrayFamilies("helm", families);
    expect(pluginTrayRegistry.getTrayFamilies()).toEqual([{ pluginId: "helm", families }]);
  });

  it("overwrites a previous registration for the same pluginId", () => {
    pluginTrayRegistry.registerTrayFamilies("helm", families);
    const updated = { "helm-chart-upgrade": TrayComponent };
    pluginTrayRegistry.registerTrayFamilies("helm", updated);

    const entries = pluginTrayRegistry.getTrayFamilies();
    expect(entries).toHaveLength(1);
    expect(entries[0].families).toEqual(updated);
  });

  it("removes a registration on unregister", () => {
    pluginTrayRegistry.registerTrayFamilies("helm", families);
    pluginTrayRegistry.unregisterTrayFamilies("helm");
    expect(pluginTrayRegistry.getTrayFamilies()).toEqual([]);
  });

  it("notifies subscribers on register/unregister but not on a no-op unregister", () => {
    const listener = vi.fn();
    const unsubscribe = pluginTrayRegistry.subscribeTrayRegistry(listener);

    pluginTrayRegistry.registerTrayFamilies("helm", families);
    expect(listener).toHaveBeenCalledTimes(1);

    pluginTrayRegistry.unregisterTrayFamilies("nonexistent-plugin");
    expect(listener).toHaveBeenCalledTimes(1);

    pluginTrayRegistry.unregisterTrayFamilies("helm");
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    pluginTrayRegistry.registerTrayFamilies("kube", families);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("clearTrayRegistry empties the registry and notifies once", () => {
    const listener = vi.fn();
    pluginTrayRegistry.subscribeTrayRegistry(listener);

    pluginTrayRegistry.registerTrayFamilies("helm", families);
    pluginTrayRegistry.registerTrayFamilies("kube", families);
    listener.mockClear();

    pluginTrayRegistry.clearTrayRegistry();
    expect(pluginTrayRegistry.getTrayFamilies()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
