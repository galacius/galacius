class PluginStylesheetRegistry {
  private readonly registry = new Map<string, Array<Promise<{ default: string }>>>();

  registerStylesheets(pluginId: string, stylesheets: Array<Promise<{ default: string }>>): void {
    this.registry.set(pluginId, stylesheets);
  }

  unregisterStylesheets(pluginId: string): void {
    this.registry.delete(pluginId);
  }

  getStylesheets(pluginId: string): Array<Promise<{ default: string }>> {
    return this.registry.get(pluginId) ?? [];
  }

  getRegisteredPluginIds(): string[] {
    return Array.from(this.registry.keys());
  }

  clearStylesheetRegistry(): void {
    this.registry.clear();
  }
}

export const pluginStylesheetRegistry = new PluginStylesheetRegistry();
