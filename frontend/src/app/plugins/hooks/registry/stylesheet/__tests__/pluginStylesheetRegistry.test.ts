import { beforeEach, describe, expect, it } from "vitest";
import { pluginStylesheetRegistry } from "../pluginStylesheetRegistry";

describe("pluginStylesheetRegistry", () => {
  beforeEach(() => {
    pluginStylesheetRegistry.clearStylesheetRegistry();
  });

  it("registers stylesheets keyed by pluginId", () => {
    const stylesheet = Promise.resolve({ default: ".helm { color: red; }" });
    pluginStylesheetRegistry.registerStylesheets("helm", [stylesheet]);
    expect(pluginStylesheetRegistry.getStylesheets("helm")).toEqual([stylesheet]);
  });

  it("returns an empty array for an unregistered pluginId", () => {
    expect(pluginStylesheetRegistry.getStylesheets("nonexistent-plugin")).toEqual([]);
  });

  it("overwrites a previous registration for the same pluginId", () => {
    pluginStylesheetRegistry.registerStylesheets("helm", [
      Promise.resolve({ default: ".old { color: red; }" }),
    ]);
    const updated = Promise.resolve({ default: ".new { color: blue; }" });
    pluginStylesheetRegistry.registerStylesheets("helm", [updated]);

    expect(pluginStylesheetRegistry.getStylesheets("helm")).toEqual([updated]);
  });

  it("removes a registration on unregister", () => {
    pluginStylesheetRegistry.registerStylesheets("helm", [
      Promise.resolve({ default: ".helm { color: red; }" }),
    ]);
    pluginStylesheetRegistry.unregisterStylesheets("helm");
    expect(pluginStylesheetRegistry.getStylesheets("helm")).toEqual([]);
  });

  it("unregister on a nonexistent pluginId is a no-op", () => {
    const stylesheet = Promise.resolve({ default: ".helm { color: red; }" });
    pluginStylesheetRegistry.registerStylesheets("helm", [stylesheet]);
    pluginStylesheetRegistry.unregisterStylesheets("nonexistent-plugin");
    expect(pluginStylesheetRegistry.getStylesheets("helm")).toEqual([stylesheet]);
  });

  it("clearStylesheetRegistry empties the registry", () => {
    pluginStylesheetRegistry.registerStylesheets("helm", [
      Promise.resolve({ default: ".helm { color: red; }" }),
    ]);
    pluginStylesheetRegistry.registerStylesheets("kube", [
      Promise.resolve({ default: ".kube { color: blue; }" }),
    ]);

    pluginStylesheetRegistry.clearStylesheetRegistry();
    expect(pluginStylesheetRegistry.getStylesheets("helm")).toEqual([]);
    expect(pluginStylesheetRegistry.getStylesheets("kube")).toEqual([]);
  });

  it("returns registered pluginIds", () => {
    pluginStylesheetRegistry.registerStylesheets("helm", [
      Promise.resolve({ default: ".helm {}" }),
    ]);
    pluginStylesheetRegistry.registerStylesheets("kube", [
      Promise.resolve({ default: ".kube {}" }),
    ]);

    expect(pluginStylesheetRegistry.getRegisteredPluginIds().sort()).toEqual(["helm", "kube"]);
  });

  it("keeps multiple stylesheets in registration order for one pluginId", () => {
    const first = Promise.resolve({ default: ".a {}" });
    const second = Promise.resolve({ default: ".b {}" });
    pluginStylesheetRegistry.registerStylesheets("helm", [first, second]);
    expect(pluginStylesheetRegistry.getStylesheets("helm")).toEqual([first, second]);
  });
});
