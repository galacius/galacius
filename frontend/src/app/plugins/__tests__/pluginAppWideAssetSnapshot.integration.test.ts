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

  it("restores the footer widget after a disable/re-enable cycle", () => {
    const footerWidget = { id: "helm-footer", component: () => null };

    // Step 1: Plugin bundle's module-eval registers its footer widget.
    pluginFooterRegistry.registerFooterWidget("helm", footerWidget);

    // Step 2: Reconciler captures the snapshot right after the fresh import.
    captureAppWidePluginSnapshot("helm", "abc123");

    // Step 3: Plugin is disabled — the reconciler unregisters it from the
    // live registry (the widget disappears from the footer immediately).
    pluginFooterRegistry.unregisterFooterWidget("helm");
    expect(pluginFooterRegistry.getFooterWidget("helm")).toBeUndefined();

    // Step 4: Plugin is re-enabled. Re-importing the same bundle URL is a
    // cache hit (module already evaluated) and doesn't re-run the top-level
    // registerFooterWidget call, so the reconciler restores from the
    // snapshot instead.
    const restored = restoreAppWidePluginSnapshot("helm", "abc123");

    expect(restored).toBe(true);
    expect(pluginFooterRegistry.getFooterWidget("helm")).toEqual(footerWidget);
  });
});
