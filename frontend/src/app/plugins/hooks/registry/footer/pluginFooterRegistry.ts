import type { PluginFooterWidget } from "@galacius/core";

type Listener = () => void;

class PluginFooterRegistry {
  private readonly registry = new Map<string, PluginFooterWidget>();
  private readonly listeners = new Set<Listener>();

  private snapshot: Array<{ pluginId: string; widget: PluginFooterWidget }> = [];

  registerFooterWidget(pluginId: string, widget: PluginFooterWidget): void {
    this.registry.set(pluginId, widget);
    this.notify();
  }

  unregisterFooterWidget(pluginId: string): void {
    if (this.registry.delete(pluginId)) {
      this.notify();
    }
  }

  getFooterWidgets(): Array<{ pluginId: string; widget: PluginFooterWidget }> {
    return this.snapshot;
  }

  getRegisteredPluginIds(): string[] {
    return Array.from(this.registry.keys());
  }

  getFooterWidget(pluginId: string): PluginFooterWidget | undefined {
    return this.registry.get(pluginId);
  }

  subscribeFooterRegistry(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clearRegistry(): void {
    if (this.registry.size > 0) {
      this.registry.clear();
      this.notify();
    }
  }

  private notify(): void {
    this.snapshot = Array.from(this.registry.entries()).map(([pluginId, widget]) => ({
      pluginId,
      widget,
    }));
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const pluginFooterRegistry = new PluginFooterRegistry();
