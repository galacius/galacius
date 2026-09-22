import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePluginFooterWidgets } from "../usePluginFooterWidgets";
import { pluginFooterRegistry } from "../pluginFooterRegistry";

describe("usePluginFooterWidgets", () => {
  beforeEach(() => {
    pluginFooterRegistry.clearRegistry();
  });

  it("returns an empty array initially", () => {
    const { result } = renderHook(() => usePluginFooterWidgets());
    expect(result.current).toEqual([]);
  });

  it("returns registered footer widgets with pluginIds", () => {
    const widget = { id: "helm-footer", component: () => null };
    pluginFooterRegistry.registerFooterWidget("helm", widget);

    const { result } = renderHook(() => usePluginFooterWidgets());
    expect(result.current).toEqual([{ pluginId: "helm", widget }]);
  });

  it("updates when a widget is registered", () => {
    const { result, rerender } = renderHook(() => usePluginFooterWidgets());
    expect(result.current).toEqual([]);

    const widget = { id: "helm-footer", component: () => null };
    pluginFooterRegistry.registerFooterWidget("helm", widget);

    rerender();
    expect(result.current).toEqual([{ pluginId: "helm", widget }]);
  });

  it("updates when a widget is unregistered", () => {
    const widget = { id: "helm-footer", component: () => null };
    pluginFooterRegistry.registerFooterWidget("helm", widget);

    const { result, rerender } = renderHook(() => usePluginFooterWidgets());
    expect(result.current).toEqual([{ pluginId: "helm", widget }]);

    pluginFooterRegistry.unregisterFooterWidget("helm");
    rerender();
    expect(result.current).toEqual([]);
  });

  it("returns multiple widgets from different plugins", () => {
    const helmWidget = { id: "helm-footer", component: () => null };
    const kubeWidget = { id: "kube-footer", component: () => null };
    pluginFooterRegistry.registerFooterWidget("helm", helmWidget);
    pluginFooterRegistry.registerFooterWidget("kube", kubeWidget);

    const { result } = renderHook(() => usePluginFooterWidgets());
    expect(result.current).toHaveLength(2);
    expect(result.current).toContainEqual({ pluginId: "helm", widget: helmWidget });
    expect(result.current).toContainEqual({ pluginId: "kube", widget: kubeWidget });
  });
});
