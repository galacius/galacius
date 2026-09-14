import { cn } from "@galacius/design-system";
import { useState, type FC } from "react";
import { usePluginSettingsTabs } from "../plugins/hooks/registry/settings/usePluginSettingsTabs";
import { useIsMarketplaceEnabled } from "../shared/hooks/useIsMarketplaceEnabled";
import { AppContent } from "./components/AppContent";
import { K8sContent } from "./components/K8sContent";
import { MarketplaceContent } from "./components/MarketplaceContent";
import { ProxyContent } from "./components/ProxyContent";
import { SandboxContent } from "./components/SandboxContent";
import { SectionHeader } from "./components/SectionHeader";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { Section, SECTION_HEADER, isBuiltinSection } from "./components/types";
import { WelcomeView } from "./components/WelcomeView";
import { useIsPrivateRepoAccess } from "./hooks/data-access/useIsPrivateRepoAccess";

export const SettingsView: FC<{
  initialSection?: Section;
}> = ({ initialSection = "welcome" }) => {
  const { data: isPrivateRepoAccess = true } = useIsPrivateRepoAccess();
  const isMarketplaceEnabled = useIsMarketplaceEnabled();
  const pluginTabs = usePluginSettingsTabs();

  const [section, setSection] = useState<Section>(initialSection);

  const pluginTab = pluginTabs.find((tab) => tab.id === section);

  // Derived every render (not just at mount) so a sandbox selection is never
  // shown once private repo access resolves to disabled, without needing an
  // effect to reset state. Similarly, if marketplace is disabled, or the
  // selected section was a plugin tab that got disabled/removed, redirect to welcome.
  const displaySection =
    (section === "sandbox" && !isPrivateRepoAccess) ||
    (section === "marketplace" && !isMarketplaceEnabled) ||
    (!isBuiltinSection(section) && !pluginTab)
      ? "welcome"
      : section;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <SettingsSidebar section={displaySection} onSelect={setSection} />

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {displaySection === "welcome" ? (
          <WelcomeView />
        ) : (
          <>
            <SectionHeader
              title={
                isBuiltinSection(displaySection)
                  ? SECTION_HEADER[displaySection]
                  : pluginTab?.label || displaySection
              }
            />
            <div
              className={cn(
                "flex flex-1 flex-col px-6 py-4",
                displaySection === "marketplace" ? "overflow-hidden" : "overflow-auto"
              )}
            >
              {displaySection === "sandbox" && <SandboxContent />}
              {displaySection === "kubernetes" && <K8sContent />}
              {displaySection === "app" && <AppContent />}
              {displaySection === "proxy" && <ProxyContent />}
              {displaySection === "marketplace" && <MarketplaceContent />}
              {pluginTab && <pluginTab.component />}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
