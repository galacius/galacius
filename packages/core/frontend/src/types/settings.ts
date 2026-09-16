import type { ComponentType } from "react";

export interface PluginSettingsTab {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  component: ComponentType;
}
