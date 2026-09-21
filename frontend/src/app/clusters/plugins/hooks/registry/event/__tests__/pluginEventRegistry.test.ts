import { describe, it, expect, beforeEach, vi } from "vitest";
import { pluginEventRegistry } from "../pluginEventRegistry";

describe("pluginEventRegistry", () => {
  beforeEach(() => {
    // Clear all handlers before each test
    pluginEventRegistry.unregisterEvents("plugin1");
    pluginEventRegistry.unregisterEvents("plugin2");
    pluginEventRegistry.unregisterEvents("plugin3");
  });

  describe("getHandlerFor", () => {
    it("should return the correct handler for a registered (pluginId, eventName) pair", () => {
      const handler = vi.fn();
      pluginEventRegistry.registerEvents("plugin1", { "test:event": handler });

      const result = pluginEventRegistry.getHandlerFor("plugin1", "test:event");
      expect(result).toBe(handler);
    });

    it("should return undefined if pluginId does not match", () => {
      const handler = vi.fn();
      pluginEventRegistry.registerEvents("plugin1", { "test:event": handler });

      const result = pluginEventRegistry.getHandlerFor("plugin2", "test:event");
      expect(result).toBeUndefined();
    });

    it("should return undefined if eventName is not registered", () => {
      const handler = vi.fn();
      pluginEventRegistry.registerEvents("plugin1", { "test:event": handler });

      const result = pluginEventRegistry.getHandlerFor("plugin1", "unknown:event");
      expect(result).toBeUndefined();
    });

    it("should handle event-name collision: only return handler for the matching pluginId", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      pluginEventRegistry.registerEvents("plugin1", { "shared:event": handler1 });
      pluginEventRegistry.registerEvents("plugin2", { "shared:event": handler2 });

      // When two plugins register the same event name, the second overwrites the first
      // in the internal registry (collision). getHandlerFor should only return the
      // handler if both the pluginId AND eventName match.
      const result1 = pluginEventRegistry.getHandlerFor("plugin1", "shared:event");
      const result2 = pluginEventRegistry.getHandlerFor("plugin2", "shared:event");

      // Only plugin2's handler is in the registry (collision), so only it should be returned
      expect(result1).toBeUndefined();
      expect(result2).toBe(handler2);
    });

    it("should work correctly after unregisterEvents is called", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      pluginEventRegistry.registerEvents("plugin1", {
        event1: handler1,
        event2: handler2,
      });

      pluginEventRegistry.unregisterEvents("plugin1");

      const result1 = pluginEventRegistry.getHandlerFor("plugin1", "event1");
      const result2 = pluginEventRegistry.getHandlerFor("plugin1", "event2");

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    it("should handle multiple plugins with different events", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      pluginEventRegistry.registerEvents("plugin1", { event1: handler1 });
      pluginEventRegistry.registerEvents("plugin2", { event2: handler2 });
      pluginEventRegistry.registerEvents("plugin3", { event3: handler3 });

      expect(pluginEventRegistry.getHandlerFor("plugin1", "event1")).toBe(handler1);
      expect(pluginEventRegistry.getHandlerFor("plugin2", "event2")).toBe(handler2);
      expect(pluginEventRegistry.getHandlerFor("plugin3", "event3")).toBe(handler3);

      // Cross-plugin requests should return undefined
      expect(pluginEventRegistry.getHandlerFor("plugin1", "event2")).toBeUndefined();
      expect(pluginEventRegistry.getHandlerFor("plugin2", "event3")).toBeUndefined();
    });
  });

  describe("getHandler (existing method)", () => {
    it("should still work for backwards compatibility", () => {
      const handler = vi.fn();
      pluginEventRegistry.registerEvents("plugin1", { "test:event": handler });

      const result = pluginEventRegistry.getHandler("test:event");
      expect(result).toBe(handler);
    });
  });
});
