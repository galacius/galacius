import { beforeEach, describe, expect, it, vi } from "vitest";
import { pluginFooterRegistry } from "../pluginFooterRegistry";

describe("pluginFooterRegistry", () => {
  beforeEach(() => {
    pluginFooterRegistry.clearRegistry();
  });

  it("registers footer widgets keyed by pluginId", () => {
    const widget = { id: "helm-footer", component: () => null };
    pluginFooterRegistry.registerFooterWidget("helm", widget);
    expect(pluginFooterRegistry.getFooterWidget("helm")).toEqual(widget);
  });

  it("returns an empty array for unregistered widgets", () => {
    expect(pluginFooterRegistry.getFooterWidgets()).toEqual([]);
  });

  it("returns all registered widgets as an array with pluginIds", () => {
    const helmWidget = { id: "helm-footer", component: () => null };
    const kubeWidget = { id: "kube-footer", component: () => null };
    pluginFooterRegistry.registerFooterWidget("helm", helmWidget);
    pluginFooterRegistry.registerFooterWidget("kube", kubeWidget);

    const widgets = pluginFooterRegistry.getFooterWidgets();
    expect(widgets).toHaveLength(2);
    expect(widgets).toContainEqual({ pluginId: "helm", widget: helmWidget });
    expect(widgets).toContainEqual({ pluginId: "kube", widget: kubeWidget });
  });

  it("overwrites a previous registration for the same pluginId", () => {
    const oldWidget = { id: "helm-footer-old", component: () => null };
    const newWidget = { id: "helm-footer-new", component: () => null };
    pluginFooterRegistry.registerFooterWidget("helm", oldWidget);
    pluginFooterRegistry.registerFooterWidget("helm", newWidget);

    expect(pluginFooterRegistry.getFooterWidget("helm")).toEqual(newWidget);
  });

  it("removes a registration on unregister", () => {
    const widget = { id: "helm-footer", component: () => null };
    pluginFooterRegistry.registerFooterWidget("helm", widget);
    pluginFooterRegistry.unregisterFooterWidget("helm");
    expect(pluginFooterRegistry.getFooterWidget("helm")).toBeUndefined();
  });

  it("unregister on a nonexistent pluginId is a no-op", () => {
    const helmWidget = { id: "helm-footer", component: () => null };
    pluginFooterRegistry.registerFooterWidget("helm", helmWidget);
    pluginFooterRegistry.unregisterFooterWidget("nonexistent-plugin");
    expect(pluginFooterRegistry.getFooterWidget("helm")).toEqual(helmWidget);
  });

  it("clearRegistry empties the registry", () => {
    pluginFooterRegistry.registerFooterWidget("helm", {
      id: "helm-footer",
      component: () => null,
    });
    pluginFooterRegistry.registerFooterWidget("kube", {
      id: "kube-footer",
      component: () => null,
    });

    pluginFooterRegistry.clearRegistry();
    expect(pluginFooterRegistry.getFooterWidgets()).toEqual([]);
  });

  it("returns registered pluginIds", () => {
    pluginFooterRegistry.registerFooterWidget("helm", {
      id: "helm-footer",
      component: () => null,
    });
    pluginFooterRegistry.registerFooterWidget("kube", {
      id: "kube-footer",
      component: () => null,
    });

    expect(pluginFooterRegistry.getRegisteredPluginIds().sort()).toEqual(["helm", "kube"]);
  });

  it("notifies subscribers when a widget is registered", () => {
    const subscriber = { fn: () => {} };
    const spy = vi.spyOn(subscriber, "fn");
    pluginFooterRegistry.subscribeFooterRegistry(subscriber.fn);

    pluginFooterRegistry.registerFooterWidget("helm", {
      id: "helm-footer",
      component: () => null,
    });

    expect(spy).toHaveBeenCalled();
  });

  it("notifies subscribers when a widget is unregistered", () => {
    const subscriber = { fn: () => {} };
    pluginFooterRegistry.registerFooterWidget("helm", {
      id: "helm-footer",
      component: () => null,
    });

    vi.clearAllMocks();
    const spy = vi.spyOn(subscriber, "fn");
    pluginFooterRegistry.subscribeFooterRegistry(subscriber.fn);
    pluginFooterRegistry.unregisterFooterWidget("helm");

    expect(spy).toHaveBeenCalled();
  });

  it("unsubscribe function removes the listener", () => {
    const subscriber = { fn: () => {} };
    const spy = vi.spyOn(subscriber, "fn");
    const unsubscribe = pluginFooterRegistry.subscribeFooterRegistry(subscriber.fn);

    unsubscribe();
    pluginFooterRegistry.registerFooterWidget("helm", {
      id: "helm-footer",
      component: () => null,
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
