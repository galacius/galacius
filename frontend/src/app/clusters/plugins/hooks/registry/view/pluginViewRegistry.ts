import type { ComponentType } from "react";

export interface ViewAssets {
  pluginId: string;
  name: string;
  component: ComponentType;
  stylesheet?: Promise<{ default: string }>;
}

class PluginViewRegistry {
  private readonly registry = new Map<string, ViewAssets[]>();

  registerViews(
    pluginId: string,
    configs: Array<{
      name: string;
      component: ComponentType;
      stylesheet?: Promise<{ default: string }>;
    }>
  ): void {
    this.registry.set(
      pluginId,
      configs.map((config) => ({ pluginId, ...config }))
    );
  }

  unregisterView(pluginId: string): void {
    this.registry.delete(pluginId);
  }

  getViewAssets(): ViewAssets[] {
    return Array.from(this.registry.values()).flat();
  }

  getRegisteredPluginIds(): string[] {
    return Array.from(this.registry.keys());
  }

  clearViewRegistry(): void {
    this.registry.clear();
  }
}

export const pluginViewRegistry = new PluginViewRegistry();
