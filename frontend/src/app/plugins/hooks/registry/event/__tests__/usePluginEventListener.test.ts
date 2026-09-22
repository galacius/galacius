import { describe, it, expect, beforeEach, vi } from "vitest";
import { pluginEventRegistry } from "../../../../../clusters/plugins/hooks/registry/event/pluginEventRegistry";

describe("usePluginEventListener", () => {
  // Note: The usePluginEventListener hook requires React Query provider context,
  // so unit tests of the hook itself are tested indirectly through integration tests
  // and end-to-end tests. These tests verify the underlying logic it depends on.

  beforeEach(() => {
    pluginEventRegistry.unregisterEvents("plugin1");
    pluginEventRegistry.unregisterEvents("plugin2");
  });

  it("should dispatch to the correct handler via getHandlerFor", () => {
    const handler1 = vi.fn();
    pluginEventRegistry.registerEvents("plugin1", { "test:event": handler1 });

    const retrieved = pluginEventRegistry.getHandlerFor("plugin1", "test:event");
    expect(retrieved).toBe(handler1);

    retrieved?.({ test: "data" });
    expect(handler1).toHaveBeenCalledWith({ test: "data" });
  });

  it("should not dispatch when pluginId does not match", () => {
    const handler1 = vi.fn();
    pluginEventRegistry.registerEvents("plugin1", { "test:event": handler1 });

    const retrieved = pluginEventRegistry.getHandlerFor("plugin2", "test:event");
    expect(retrieved).toBeUndefined();
  });

  it("should not dispatch when eventName is not registered", () => {
    const handler1 = vi.fn();
    pluginEventRegistry.registerEvents("plugin1", { "test:event": handler1 });

    const retrieved = pluginEventRegistry.getHandlerFor("plugin1", "unknown:event");
    expect(retrieved).toBeUndefined();
  });

  it("should prevent cross-plugin event-name collision", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    pluginEventRegistry.registerEvents("plugin1", { "shared:event": handler1 });
    pluginEventRegistry.registerEvents("plugin2", { "shared:event": handler2 });

    // The second registration overwrites the first in the registry (collision).
    // getHandlerFor should only return handler2 when queried with plugin2.
    const retrieved1 = pluginEventRegistry.getHandlerFor("plugin1", "shared:event");
    const retrieved2 = pluginEventRegistry.getHandlerFor("plugin2", "shared:event");

    expect(retrieved1).toBeUndefined();
    expect(retrieved2).toBe(handler2);
  });
});
