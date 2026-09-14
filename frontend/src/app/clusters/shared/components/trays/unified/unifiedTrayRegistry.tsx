import { ModificationTrayFamily } from "./families/ModificationTrayFamily";
import { PodTrayFamily } from "./families/PodTrayFamily";
import type { UnifiedTrayContentComponent } from "./UnifiedTrayTypes";

// Core (built-in) tray families only. Plugin-owned families are merged in at
// runtime from each installed plugin's own bundle — see usePluginTrayRegistry.
export const unifiedTrayRegistry: Record<string, UnifiedTrayContentComponent> = {
  modification: ModificationTrayFamily,
  pod: PodTrayFamily,
};
