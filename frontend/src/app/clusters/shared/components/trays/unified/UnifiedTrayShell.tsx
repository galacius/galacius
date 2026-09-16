import {
  Drawer,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerViewport,
  PencilIcon,
  ScrollTextIcon,
  TabsContent,
  TerminalIcon,
} from "@galacius/design-system";
import { FC, useCallback, useMemo } from "react";
import { TrayTabBar } from "../TrayTabBar";
import { useUnifiedTray } from "./UnifiedTrayContext";
import type { UnifiedTrayContentComponent, UnifiedTrayTab } from "./UnifiedTrayTypes";

function getTabLabelAndIcon(tab: UnifiedTrayTab) {
  if (tab.origin === "core") {
    if (tab.family === "modification") {
      return {
        label: `${tab.kind}: ${tab.name}`,
        icon: <PencilIcon className="size-3.5 shrink-0 text-muted-foreground" />,
      };
    }
    const Icon = tab.mode === "logs" ? ScrollTextIcon : TerminalIcon;
    return {
      label: tab.pod,
      icon: <Icon className="size-3 shrink-0" />,
    };
  }
  // Generic plugin-owned family — label/icon come from the plugin itself.
  return {
    label: tab.label,
    icon: tab.icon,
  };
}

export interface UnifiedTrayShellProps {
  registry: Record<string, UnifiedTrayContentComponent>;
}

export const UnifiedTrayShell: FC<UnifiedTrayShellProps> = ({ registry }) => {
  const { tabs, activeTabId, snapPoint, setActiveTab, closeTab, closeAll, setSnapPoint } =
    useUnifiedTray();

  const tabIds = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);
  const resolvedActiveTabId =
    activeTabId && tabIds.has(activeTabId) ? activeTabId : (tabs[0]?.id ?? null);

  const closeTabHandler = useCallback(
    (tabId: string) => {
      if (tabs.length === 1) {
        closeAll();
        return;
      }
      closeTab(tabId);
    },
    [tabs, closeTab, closeAll]
  );

  const heightClass = snapPoint === "36px" ? "h-9" : snapPoint === 1 ? "h-screen" : "h-100";

  return (
    <Drawer open={tabs.length > 0} modal={false} disablePointerDismissal>
      <DrawerPortal>
        <DrawerViewport>
          <DrawerPopup className={heightClass}>
            <DrawerContent>
              <TrayTabBar
                tabs={tabs.map((tab) => {
                  const { label, icon } = getTabLabelAndIcon(tab);
                  return {
                    id: tab.id,
                    label,
                    icon,
                    isActive: tab.id === resolvedActiveTabId,
                  };
                })}
                onTabSelect={setActiveTab}
                onCloseTab={closeTabHandler}
                snapPoint={snapPoint}
                onSetSnapPoint={setSnapPoint}
                showCloseButtonOnInactive={true}
              >
                {/* Render all tabs' content */}
                {tabs.map((tab) => {
                  const Content = registry[tab.family];
                  return (
                    <TabsContent
                      key={tab.id}
                      value={tab.id}
                      keepMounted
                      className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                      <Content
                        tab={tab}
                        collapsed={snapPoint === "36px"}
                        onClose={() => closeTabHandler(tab.id)}
                      />
                    </TabsContent>
                  );
                })}
              </TrayTabBar>
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
};
