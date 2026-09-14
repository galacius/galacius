import type { SharedUnifiedTrayContentProps } from "@galacius/core";
import type { ComponentType } from "react";

type Listener = () => void;

export interface RegisteredTrayFamilies {
  pluginId: string;
  families: Record<string, ComponentType<SharedUnifiedTrayContentProps>>;
}

class PluginTrayRegistry {
  private readonly registry = new Map<string, RegisteredTrayFamilies>();
  private readonly listeners = new Set<Listener>();

  // useSyncExternalStore requires getSnapshot to return a referentially
  // stable value between mutations (React re-invokes it on every render to
  // detect changes via Object.is) — a fresh Array.from() on every call fails
  // that check and causes an infinite render loop. Cache the array here and
  // only rebuild it when the registry actually changes.
  private snapshot: RegisteredTrayFamilies[] = [];

  registerTrayFamilies(
    pluginId: string,
    families: Record<string, ComponentType<SharedUnifiedTrayContentProps>>
  ): void {
    this.registry.set(pluginId, { pluginId, families });
    this.notify();
  }

  unregisterTrayFamilies(pluginId: string): void {
    if (this.registry.delete(pluginId)) {
      this.notify();
    }
  }

  getTrayFamilies(): RegisteredTrayFamilies[] {
    return this.snapshot;
  }

  getRegisteredPluginIds(): string[] {
    return Array.from(this.registry.keys());
  }

  subscribeTrayRegistry(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clearTrayRegistry(): void {
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

export const pluginTrayRegistry = new PluginTrayRegistry();
