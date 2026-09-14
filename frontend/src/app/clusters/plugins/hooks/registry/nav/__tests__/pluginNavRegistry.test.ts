import type { NavEntry } from "@galacius/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pluginNavRegistry } from "../pluginNavRegistry";

const navEntry: NavEntry<string> = {
  kind: "item",
  icon: (() => null) as never,
  item: { id: "helm", label: "Helm", view: "helm-releases" },
};

describe("pluginNavRegistry", () => {
  beforeEach(() => {
    pluginNavRegistry.clearNavRegistry();
  });

  it("registers a nav entry keyed by pluginId", () => {
    pluginNavRegistry.registerNavEntry("helm", navEntry);
    expect(pluginNavRegistry.getNavEntries()).toEqual([{ pluginId: "helm", navEntry }]);
  });

  it("overwrites a previous registration for the same pluginId", () => {
    pluginNavRegistry.registerNavEntry("helm", navEntry);
    const updated: NavEntry<string> = { ...navEntry, item: { ...navEntry.item, label: "Helm v2" } };
    pluginNavRegistry.registerNavEntry("helm", updated);

    const entries = pluginNavRegistry.getNavEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].navEntry).toEqual(updated);
  });

  it("removes a registration on unregister", () => {
    pluginNavRegistry.registerNavEntry("helm", navEntry);
    pluginNavRegistry.unregisterNavEntry("helm");
    expect(pluginNavRegistry.getNavEntries()).toEqual([]);
  });

  it("notifies subscribers on register/unregister but not on a no-op unregister", () => {
    const listener = vi.fn();
    const unsubscribe = pluginNavRegistry.subscribeNavRegistry(listener);

    pluginNavRegistry.registerNavEntry("helm", navEntry);
    expect(listener).toHaveBeenCalledTimes(1);

    pluginNavRegistry.unregisterNavEntry("nonexistent-plugin");
    expect(listener).toHaveBeenCalledTimes(1);

    pluginNavRegistry.unregisterNavEntry("helm");
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    pluginNavRegistry.registerNavEntry("kube", navEntry);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("clearNavRegistry empties the registry and notifies once", () => {
    const listener = vi.fn();
    pluginNavRegistry.subscribeNavRegistry(listener);

    pluginNavRegistry.registerNavEntry("helm", navEntry);
    pluginNavRegistry.registerNavEntry("kube", navEntry);
    listener.mockClear();

    pluginNavRegistry.clearNavRegistry();
    expect(pluginNavRegistry.getNavEntries()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
