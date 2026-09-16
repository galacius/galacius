interface RegisteredEventHandler {
  pluginId: string;
  handler: (payload: unknown) => void;
}

class PluginEventRegistry {
  private readonly registry = new Map<string, RegisteredEventHandler>();

  registerEvents(
    pluginId: string,
    // Plugins type each handler's payload with its own event-specific shape
    // rather than `unknown`, so this must accept `any` here — a `(payload:
    // unknown) => void` signature would reject those narrower handlers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlers: Record<string, (payload: any) => void>
  ): void {
    for (const [eventName, handler] of Object.entries(handlers)) {
      this.registry.set(eventName, { pluginId, handler });
    }
  }

  unregisterEvents(pluginId: string): void {
    for (const [eventName, entry] of this.registry) {
      if (entry.pluginId === pluginId) {
        this.registry.delete(eventName);
      }
    }
  }

  getHandler(eventName: string): ((payload: unknown) => void) | undefined {
    return this.registry.get(eventName)?.handler;
  }

  getRegisteredPluginIds(): string[] {
    return Array.from(new Set(Array.from(this.registry.values()).map((entry) => entry.pluginId)));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHandlersForPlugin(pluginId: string): Record<string, (payload: any) => void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers: Record<string, (payload: any) => void> = {};
    for (const [eventName, entry] of this.registry) {
      if (entry.pluginId === pluginId) {
        handlers[eventName] = entry.handler;
      }
    }
    return handlers;
  }
}

export const pluginEventRegistry = new PluginEventRegistry();
