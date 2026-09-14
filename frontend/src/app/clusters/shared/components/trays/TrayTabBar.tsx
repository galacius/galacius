import {
  Button,
  ChevronDownIcon,
  ChevronUpIcon,
  Maximize2Icon,
  Minimize2Icon,
  Tabs,
  TabsList,
  TabsTrigger,
  XIcon,
  cn,
} from "@galacius/design-system";
import { FC, memo } from "react";

export interface TrayTabBarTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
}

export interface TrayTabBarProps {
  tabs: TrayTabBarTab[];
  onTabSelect: (id: string) => void;
  onCloseTab?: (id: string) => void;
  snapPoint: "36px" | 400 | 1;
  onSetSnapPoint: (point: "36px" | 400 | 1) => void;
  showCloseButtonOnInactive?: boolean;
  /** Content rendered below the tab bar row inside the tray container. */
  children?: React.ReactNode;
}

export const TrayTabBar: FC<TrayTabBarProps> = memo(
  ({
    tabs,
    onTabSelect,
    onCloseTab,
    snapPoint,
    onSetSnapPoint,
    showCloseButtonOnInactive = true,
    children,
  }) => {
    const activeTabId = tabs.find((t) => t.isActive)?.id ?? "";
    const isCollapsed = snapPoint === "36px";
    const isExpanded = snapPoint === 1;

    return (
      <Tabs
        value={activeTabId}
        onValueChange={onTabSelect}
        orientation="horizontal"
        className="min-h-0 flex-1 gap-0"
      >
        {/* Tab bar row */}
        <div className="flex min-w-0 shrink-0 items-center justify-between border-b">
          {/* Left section: tabs */}
          <div className="min-w-0 flex-1 scrollbar-none overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <TabsList
              className="w-max gap-0 rounded-none bg-transparent p-0"
              variant="line"
              indicatorClassName="bg-success"
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "group shrink-0 rounded-none bg-transparent px-3 text-xs shadow-none",
                    "flex cursor-pointer items-center gap-1.5 transition-colors",
                    "text-muted-foreground hover:text-foreground",
                    "data-active:bg-transparent data-active:font-medium data-active:text-foreground data-active:shadow-none"
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <Button
                    render={<span />}
                    nativeButton={false}
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Close ${tab.label} tab`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab?.(tab.id);
                    }}
                    className={cn(
                      "size-4 rounded",
                      tab.isActive || showCloseButtonOnInactive
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <XIcon className="size-2.5" />
                  </Button>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Right section: expand / collapse buttons */}
          <div className="flex shrink-0 items-center border-l px-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={isExpanded ? "Restore tray height" : "Maximize tray"}
              onClick={() => onSetSnapPoint(isExpanded ? 400 : 1)}
            >
              {isExpanded ? (
                <Minimize2Icon className="size-3.5" />
              ) : (
                <Maximize2Icon className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={isCollapsed ? "Show tray content" : "Collapse tray"}
              onClick={() => onSetSnapPoint(isCollapsed ? 400 : "36px")}
            >
              {isCollapsed ? (
                <ChevronUpIcon className="size-3.5" />
              ) : (
                <ChevronDownIcon className="size-3.5" />
              )}
            </Button>
          </div>
        </div>

        {children}
      </Tabs>
    );
  }
);

TrayTabBar.displayName = "TrayTabBar";
