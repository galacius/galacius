import { beforeEach, describe, expect, it } from "vitest";
import {
  captureAppWidePluginSnapshot,
  restoreAppWidePluginSnapshot,
} from "../pluginAppWideAssetSnapshot";
import { pluginFooterRegistry } from "../hooks/registry/footer/pluginFooterRegistry";

describe("pluginAppWideAssetSnapshot integration (real registry)", () => {
  beforeEach(() => {
    pluginFooterRegistry.clearRegistry();
  });

  it("does not resurrect footer widget on restore after plugin self-unregisters", () => {
    const footerWidget = { id: "helm-footer", component: () => null };

    // Step 1: Register a widget
    pluginFooterRegistry.registerFooterWidget("helm", footerWidget);

    // Step 2: Capture the snapshot (after first import)
    captureAppWidePluginSnapshot("helm", "abc123");

    // Verify widget was captured
    expect(pluginFooterRegistry.getFooterWidget("helm")).toEqual(footerWidget);

    // Step 3: Plugin self-unregisters the widget at runtime
    pluginFooterRegistry.unregisterFooterWidget("helm");

    // Verify it's removed from registry
    expect(pluginFooterRegistry.getFooterWidget("helm")).toBeUndefined();

    // Step 4: Simulate a disable/re-enable cycle (restore from snapshot)
    // The widget should NOT be resurrected because the snapshot was cleared
    // on unregister
    const restored = restoreAppWidePluginSnapshot("helm", "abc123");

    // Restore should succeed (checksum matches)
    expect(restored).toBe(true);

    // But the widget should still be unregistered, not resurrected
    expect(pluginFooterRegistry.getFooterWidget("helm")).toBeUndefined();
  });

  it("clears snapshot when unregister is called, preventing resurrection", () => {
    const footerWidget = { id: "plugin-footer", component: () => null };

    // Register and capture
    pluginFooterRegistry.registerFooterWidget("plugin-a", footerWidget);
    captureAppWidePluginSnapshot("plugin-a", "v1");

    // Self-unregister
    pluginFooterRegistry.unregisterFooterWidget("plugin-a");
    expect(pluginFooterRegistry.getFooterWidget("plugin-a")).toBeUndefined();

    // Restore should not resurrect because snapshot was cleared
    restoreAppWidePluginSnapshot("plugin-a", "v1");
    expect(pluginFooterRegistry.getFooterWidget("plugin-a")).toBeUndefined();
  });
});
