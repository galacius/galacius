import { describe, it, expect } from "vitest";
import { isPluginMounted, shouldResetActiveResource } from "../MainLayout.utils";

/**
 * Tests for MainLayout plugin lifecycle handling: the fix prevents stale
 * plugin UI when a plugin transitions to DISABLED/CRASHED/INCOMPATIBLE,
 * and resets the active view when the user is viewing a now-unavailable plugin.
 *
 * These tests import and exercise the ACTUAL utility functions from
 * MainLayout.utils.ts. If the real implementation is reverted, these tests
 * will fail, providing regression protection.
 */

describe("MainLayout - Plugin Lifecycle (fix for DISABLED/CRASHED/INCOMPATIBLE)", () => {
  describe("isPluginMounted(status): boolean", () => {
    /**
     * CORE TEST: The allowlist correctly excludes DISABLED plugins.
     * This is the main regression the fix prevents (nav/view persisting).
     */
    it("returns false for DISABLED plugins", () => {
      expect(isPluginMounted("DISABLED")).toBe(false);
    });

    /**
     * Test that CRASHED plugins are also excluded.
     * Verifies the fix handles CRASHED correctly (important for crash recovery).
     */
    it("returns false for CRASHED plugins", () => {
      expect(isPluginMounted("CRASHED")).toBe(false);
    });

    /**
     * Test that INCOMPATIBLE plugins are also excluded.
     */
    it("returns false for INCOMPATIBLE plugins", () => {
      expect(isPluginMounted("INCOMPATIBLE")).toBe(false);
    });

    /**
     * Test that NOT_INSTALLED plugins are not mounted.
     */
    it("returns false for NOT_INSTALLED plugins", () => {
      expect(isPluginMounted("NOT_INSTALLED")).toBe(false);
    });

    /**
     * Test that READY plugins are included.
     * Ensures we don't break existing working plugins.
     */
    it("returns true for READY plugins", () => {
      expect(isPluginMounted("READY")).toBe(true);
    });

    /**
     * Test that INSTALLING plugins are included.
     * Ensures we keep plugins that are still initializing.
     */
    it("returns true for INSTALLING plugins", () => {
      expect(isPluginMounted("INSTALLING")).toBe(true);
    });
  });

  describe("shouldResetActiveResource(activeResource, mountedPluginIds, viewTypeToPluginId): boolean", () => {
    /**
     * Test: activeResource does not map to any plugin (built-in view).
     * Should NOT reset (overview, pods, etc. have no plugin mapping).
     */
    it("returns false when activeResource maps to no plugin (built-in view)", () => {
      const mountedPluginIds = new Set(["test-plugin"]);
      const viewTypeToPluginId: Record<string, string> = {
        "test-plugin-view": "test-plugin",
      };

      expect(shouldResetActiveResource("overview", mountedPluginIds, viewTypeToPluginId)).toBe(
        false
      );

      expect(shouldResetActiveResource("pods", mountedPluginIds, viewTypeToPluginId)).toBe(false);
    });

    /**
     * Test: activeResource maps to a plugin that IS mounted.
     * Should NOT reset (plugin is available).
     */
    it("returns false when activeResource maps to a mounted plugin", () => {
      const mountedPluginIds = new Set(["test-plugin"]);
      const viewTypeToPluginId: Record<string, string> = {
        "test-plugin-view": "test-plugin",
      };

      expect(
        shouldResetActiveResource("test-plugin-view", mountedPluginIds, viewTypeToPluginId)
      ).toBe(false);
    });

    /**
     * BLANK SCREEN FIX TEST: activeResource maps to a plugin that is NO LONGER mounted.
     * This is the core regression fix: should return true so activeResource resets to "overview".
     * Simulates: user viewing plugin-view, then plugin becomes DISABLED/CRASHED.
     */
    it("returns true when activeResource maps to an unmounted plugin (blank screen prevention)", () => {
      const mountedPluginIds = new Set<string>([]); // Plugin is no longer mounted
      const viewTypeToPluginId: Record<string, string> = {
        "test-plugin-view": "test-plugin",
      };

      expect(
        shouldResetActiveResource("test-plugin-view", mountedPluginIds, viewTypeToPluginId)
      ).toBe(true); // Should reset to prevent blank screen
    });

    /**
     * Test: multiple mounted plugins, viewing one, another is available.
     * Should NOT reset (viewed plugin is still mounted).
     */
    it("returns false with multiple mounted plugins when viewed plugin is still mounted", () => {
      const mountedPluginIds = new Set(["plugin-a", "plugin-b", "plugin-c"]);
      const viewTypeToPluginId: Record<string, string> = {
        "view-a": "plugin-a",
        "view-b": "plugin-b",
        "view-c": "plugin-c",
      };

      expect(shouldResetActiveResource("view-b", mountedPluginIds, viewTypeToPluginId)).toBe(false);
    });

    /**
     * Test: multiple mounted plugins, viewing one that just became unmounted.
     * Should return true (the one exception in the set).
     */
    it("returns true with multiple mounted plugins when viewed plugin becomes unmounted", () => {
      const mountedPluginIds = new Set(["plugin-a", "plugin-c"]); // plugin-b was removed
      const viewTypeToPluginId: Record<string, string> = {
        "view-a": "plugin-a",
        "view-b": "plugin-b", // This plugin is no longer mounted
        "view-c": "plugin-c",
      };

      expect(shouldResetActiveResource("view-b", mountedPluginIds, viewTypeToPluginId)).toBe(true); // Should reset
    });
  });

  describe("Transition scenarios", () => {
    /**
     * Scenario: READY → DISABLED.
     * Simulates a plugin being disabled while the app is running.
     */
    it("plugin transition READY → DISABLED: isPluginMounted changes from true to false", () => {
      expect(isPluginMounted("READY")).toBe(true);
      expect(isPluginMounted("DISABLED")).toBe(false);
    });

    /**
     * Scenario: READY → CRASHED.
     * Simulates a plugin crashing while the app is running.
     */
    it("plugin transition READY → CRASHED: isPluginMounted changes from true to false", () => {
      expect(isPluginMounted("READY")).toBe(true);
      expect(isPluginMounted("CRASHED")).toBe(false);
    });

    /**
     * Scenario: User viewing plugin-view, plugin becomes disabled.
     * Combined test: filter AND reset logic.
     */
    it("combined scenario: viewing plugin-view, plugin status changes to DISABLED", () => {
      // Initial state: plugin is READY and mounted
      expect(isPluginMounted("READY")).toBe(true);

      // Plugin becomes DISABLED
      expect(isPluginMounted("DISABLED")).toBe(false);

      // Reset logic: user still has "test-plugin-view" as activeResource,
      // but the plugin is no longer in mountedPluginIds
      const mountedPluginIds = new Set<string>([]); // After filter, empty
      const viewTypeToPluginId = { "test-plugin-view": "test-plugin" };

      expect(
        shouldResetActiveResource("test-plugin-view", mountedPluginIds, viewTypeToPluginId)
      ).toBe(true); // Should reset to "overview"
    });
  });
});
