import {
  Button,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Divider,
  PackageIcon,
  Settings2Icon,
  SettingsIcon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TruncatedText,
  cn,
} from "@galacius/design-system";
import { FC, useState } from "react";
import { useIsMarketplaceEnabled } from "./shared/hooks/useIsMarketplaceEnabled";

const PALETTE = [
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
  "#15803d", // green-700
  "#ea580c", // orange-600
  "#db2777", // pink-600
  "#0e7490", // cyan-700
  "#d97706", // amber-600
  "#b91c1c", // red-700
  "#4f46e5", // indigo-600
  "#0f766e", // teal-600
];

function clusterColor(name: string): string {
  const hash = Array.from(name).reduce((acc, c) => acc + c.codePointAt(0)!, 0);
  return PALETTE[hash % PALETTE.length];
}

function clusterInitials(name: string): string {
  const parts = name.split(/[-_\s]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function kubeconfigBasename(path: string): string {
  return path.replace(/^\/(?:Users|home)\/[^/]+\//, "~/");
}

type KubeconfigGroup = { kubeconfigPath: string; contexts: string[] };

interface ClusterRailProps {
  contexts: string[];
  contextGroups: KubeconfigGroup[];
  activeContext: string;
  connectedContexts: Set<string>;
  connectingContext: string | null;
  settingsOpen: boolean;
  marketplaceOpen: boolean;
  onSelect: (ctx: string) => void;
  onSettingsToggle: () => void;
  onMarketplaceToggle: () => void;
  onClusterSettings: (ctx: string) => void;
}

export const ClusterRail: FC<ClusterRailProps> = ({
  contexts,
  contextGroups,
  activeContext,
  connectedContexts,
  connectingContext,
  settingsOpen,
  marketplaceOpen,
  onSelect,
  onSettingsToggle,
  onMarketplaceToggle,
  onClusterSettings,
}) => {
  // `expanded` drives the CSS width; `contentExpanded` drives the layout.
  // On collapse, content swaps only after the width transition finishes (200ms)
  // so the original collapsed buttons never appear inside a wide-then-shrinking rail.
  const [expanded, setExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const isMarketplaceEnabled = useIsMarketplaceEnabled();

  const toggle = () => {
    if (expanded) {
      setExpanded(false);
      setTimeout(() => setContentExpanded(false), 200);
    } else {
      setExpanded(true);
      setContentExpanded(true);
    }
  };

  const renderCollapsedButton = (ctx: string) => {
    const isActive = ctx === activeContext && !settingsOpen && !marketplaceOpen;
    const isConnected = connectedContexts.has(ctx);
    const isConnecting = ctx === connectingContext;

    return (
      <ContextMenu key={ctx}>
        <ContextMenuTrigger>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  onClick={() => onSelect(ctx)}
                  disabled={isConnecting}
                  style={{ backgroundColor: clusterColor(ctx) }}
                  className={cn(
                    "relative h-10 w-10 rounded-lg text-xs font-bold text-white hover:opacity-75",
                    isActive && "ring-2 ring-white ring-offset-2 ring-offset-background"
                  )}
                >
                  {clusterInitials(ctx)}
                  <span
                    className={cn(
                      "absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-background",
                      isConnected ? "bg-success" : "bg-muted-foreground/40"
                    )}
                  />
                </Button>
              }
            />
            <TooltipContent side="right">{ctx}</TooltipContent>
          </Tooltip>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onClusterSettings(ctx)}>
            <Settings2Icon className="size-3.5" />
            Settings
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderExpandedButton = (ctx: string) => {
    const isActive = ctx === activeContext && !settingsOpen && !marketplaceOpen;
    const isConnected = connectedContexts.has(ctx);
    const isConnecting = ctx === connectingContext;

    return (
      <ContextMenu key={ctx}>
        <ContextMenuTrigger className="w-full">
          <Button
            onClick={() => onSelect(ctx)}
            disabled={isConnecting}
            variant="ghost"
            className={cn(
              "relative h-10 w-full justify-start gap-2 rounded-lg px-2 hover:opacity-90",
              isActive && "bg-secondary text-secondary-foreground"
            )}
          >
            <span
              style={{ backgroundColor: clusterColor(ctx) }}
              className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
            >
              {clusterInitials(ctx)}
              <span
                className={cn(
                  "absolute -right-1 -bottom-1 h-2.5 w-2.5 rounded-full border-2 border-background",
                  isConnected ? "bg-success" : "bg-muted-foreground/40"
                )}
              />
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1 text-xs text-muted-foreground">
              <TruncatedText text={ctx} />
            </span>
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onClusterSettings(ctx)}>
            <Settings2Icon className="size-3.5" />
            Settings
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col items-center gap-3 overflow-hidden border-r bg-muted/20 py-4 transition-[width] duration-200",
        expanded ? "w-52" : "w-16"
      )}
    >
      {/* SettingsIcon button */}
      <div className={cn("w-full px-2", !contentExpanded && "flex justify-center px-0")}>
        <Button
          variant="ghost"
          title="SettingsIcon"
          onClick={onSettingsToggle}
          className={cn(
            "h-10",
            contentExpanded ? "w-full justify-start gap-2 px-2" : "w-10 justify-center",
            settingsOpen
              ? "bg-secondary text-secondary-foreground ring-2 ring-white ring-offset-2 ring-offset-background"
              : "text-muted-foreground"
          )}
        >
          <SettingsIcon className="size-5 shrink-0" />
          {contentExpanded && <span className="truncate text-xs font-normal">Settings</span>}
        </Button>
      </div>

      {/* Marketplace button */}
      {isMarketplaceEnabled && (
        <div className={cn("w-full px-2", !contentExpanded && "flex justify-center px-0")}>
          <Button
            variant="ghost"
            title="Marketplace"
            onClick={onMarketplaceToggle}
            className={cn(
              "h-10",
              contentExpanded ? "w-full justify-start gap-2 px-2" : "w-10 justify-center",
              marketplaceOpen
                ? "bg-secondary text-secondary-foreground ring-2 ring-white ring-offset-2 ring-offset-background"
                : "text-muted-foreground"
            )}
          >
            <PackageIcon className="size-5 shrink-0" />
            {contentExpanded && <span className="truncate text-xs font-normal">Marketplace</span>}
          </Button>
        </div>
      )}

      <Divider className={cn(contentExpanded ? "w-full" : "w-8")} />

      {/* Cluster buttons */}
      <div
        className={cn(
          "flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto py-1 [&::-webkit-scrollbar]:hidden",
          contentExpanded ? "w-full gap-4 px-2" : "items-center gap-3 px-2"
        )}
      >
        {contentExpanded
          ? contextGroups.map((group) => (
              <div key={group.kubeconfigPath} className="flex flex-col gap-1">
                <p className="truncate px-2 text-[10px] tracking-wider text-muted-foreground/60">
                  {kubeconfigBasename(group.kubeconfigPath)}
                </p>
                {group.contexts.map(renderExpandedButton)}
              </div>
            ))
          : contexts.map(renderCollapsedButton)}
      </div>

      <Divider className={cn(contentExpanded ? "w-full" : "w-8")} />

      {/* Expand/collapse toggle */}
      <div className={cn("w-full px-2", !contentExpanded && "flex justify-center")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          title={contentExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(
            "h-8 text-muted-foreground",
            contentExpanded ? "w-full justify-between px-2" : "w-10 justify-center px-0"
          )}
        >
          {contentExpanded && <span className="text-xs">Collapse</span>}
          {contentExpanded ? (
            <ChevronsLeftIcon className="size-4 shrink-0" />
          ) : (
            <ChevronsRightIcon className="size-4 shrink-0" />
          )}
        </Button>
      </div>
    </aside>
  );
};
