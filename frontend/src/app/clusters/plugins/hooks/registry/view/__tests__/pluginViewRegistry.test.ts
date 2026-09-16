import type { ComponentType } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { pluginViewRegistry } from "../pluginViewRegistry";

const ViewComponent = (() => null) as ComponentType;
const config = {
  name: "helm-charts",
  component: ViewComponent,
  stylesheet: Promise.resolve({ default: ".custom-view { color: red; }" }),
};

describe("pluginViewRegistry", () => {
  beforeEach(() => {
    pluginViewRegistry.clearViewRegistry();
  });

  it("registers view assets keyed by pluginId", () => {
    pluginViewRegistry.registerViews("helm", [config]);
    expect(pluginViewRegistry.getViewAssets()).toEqual([
      {
        pluginId: "helm",
        name: "helm-charts",
        component: ViewComponent,
        stylesheet: config.stylesheet,
      },
    ]);
  });

  it("registers view assets without a stylesheet", () => {
    const configNoStylesheet = { name: "kube-view", component: ViewComponent };
    pluginViewRegistry.registerViews("kube", [configNoStylesheet]);
    expect(pluginViewRegistry.getViewAssets()).toEqual([
      { pluginId: "kube", name: "kube-view", component: ViewComponent },
    ]);
  });

  it("registers multiple view components for the same pluginId", () => {
    const second = {
      name: "helm-releases",
      component: ViewComponent,
      stylesheet: Promise.resolve({ default: ".second-view { color: green; }" }),
    };
    pluginViewRegistry.registerViews("helm", [config, second]);

    const assets = pluginViewRegistry.getViewAssets();
    expect(assets).toHaveLength(2);
    expect(assets).toEqual([
      {
        pluginId: "helm",
        name: "helm-charts",
        component: ViewComponent,
        stylesheet: config.stylesheet,
      },
      {
        pluginId: "helm",
        name: "helm-releases",
        component: ViewComponent,
        stylesheet: second.stylesheet,
      },
    ]);
  });

  it("overwrites a previous registration for the same pluginId", async () => {
    pluginViewRegistry.registerViews("helm", [config]);
    const updated = {
      name: "helm-charts",
      component: ViewComponent,
      stylesheet: Promise.resolve({ default: ".new-style { color: blue; }" }),
    };
    pluginViewRegistry.registerViews("helm", [updated]);

    const assets = pluginViewRegistry.getViewAssets();
    expect(assets).toHaveLength(1);
    await expect(assets[0].stylesheet).resolves.toEqual({ default: ".new-style { color: blue; }" });
  });

  it("removes a registration on unregister", () => {
    pluginViewRegistry.registerViews("helm", [config]);
    pluginViewRegistry.unregisterView("helm");
    expect(pluginViewRegistry.getViewAssets()).toEqual([]);
  });

  it("unregister on a nonexistent pluginId is a no-op", () => {
    pluginViewRegistry.registerViews("helm", [config]);
    pluginViewRegistry.unregisterView("nonexistent-plugin");
    expect(pluginViewRegistry.getViewAssets()).toEqual([
      {
        pluginId: "helm",
        name: "helm-charts",
        component: ViewComponent,
        stylesheet: config.stylesheet,
      },
    ]);
  });

  it("clearViewRegistry empties the registry", () => {
    pluginViewRegistry.registerViews("helm", [config]);
    pluginViewRegistry.registerViews("kube", [config]);

    pluginViewRegistry.clearViewRegistry();
    expect(pluginViewRegistry.getViewAssets()).toEqual([]);
  });

  it("returns multiple registered assets in the list", () => {
    pluginViewRegistry.registerViews("helm", [config]);
    pluginViewRegistry.registerViews("kube", [{ name: "kube-view", component: ViewComponent }]);
    pluginViewRegistry.registerViews("prometheus", [config]);

    const assets = pluginViewRegistry.getViewAssets();
    expect(assets).toHaveLength(3);
    expect(assets.map((a) => a.pluginId).sort()).toEqual(["helm", "kube", "prometheus"]);
  });
});
