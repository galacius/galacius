import type { NavEntry } from "@galacius/core";

type Listener = () => void;

export interface RegisteredNavEntry {
  pluginId: string;
  navEntry: NavEntry<string>;
}

class PluginNavRegistry {
  private readonly registry = new Map<string, RegisteredNavEntry>();
  private readonly listeners = new Set<Listener>();

  // useSyncExternalStore requires getSnapshot to return a referentially
  // stable value between mutations (React re-invokes it on every render to
  // detect changes via Object.is) — a fresh Array.from() on every call fails
  // that check and causes an infinite render loop. Cache the array here and
  // only rebuild it when the registry actually changes.
  private snapshot: RegisteredNavEntry[] = [];

  registerNavEntry(pluginId: string, navEntry: NavEntry<string>): void {
    this.registry.set(pluginId, { pluginId, navEntry });
    this.notify();
  }

  unregisterNavEntry(pluginId: string): void {
    if (this.registry.delete(pluginId)) {
      this.notify();
    }
  }

  getNavEntries(): RegisteredNavEntry[] {
    return this.snapshot;
  }

  getRegisteredPluginIds(): string[] {
    return Array.from(this.registry.keys());
  }

  subscribeNavRegistry(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clearNavRegistry(): void {
    if (this.registry.size > 0) {
      this.registry.clear();
      this.notify();
    }
  }

  private notify(): void {
    this.snapshot = Array.from(this.registry.values());
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const pluginNavRegistry = new PluginNavRegistry();
