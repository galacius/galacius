import { NavEntry, NavItem } from "@galacius/core";
import {
  Button,
  ChevronDownIcon,
  ChevronRightIcon,
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
  Separator,
  cn,
} from "@galacius/design-system";
import { FC } from "react";
import { NAV_CORE, ViewType } from "./navConfig";

interface NavSidebarProps {
  activeResource: ViewType;
  openGroups: Set<string>;
  onToggleGroup: (id: string) => void;
  onSelectItem: (item: NavItem<ViewType>) => void;
  pluginNavEntries?: NavEntry<string>[];
}

export const NavSidebar: FC<NavSidebarProps> = ({
  activeResource,
  openGroups,
  onToggleGroup,
  onSelectItem,
  pluginNavEntries = [],
}) => {
  function renderEntry(entry: NavEntry<ViewType | string>) {
    if (entry.kind === "item") {
      const { icon: Icon, item } = entry;
      const isActive = item.view === activeResource;
      const isImplemented = !!item.view;
      return (
        <Button
          key={item.id}
          variant="ghost"
          onClick={() => onSelectItem(item as NavItem<ViewType>)}
          disabled={!isImplemented}
          className={cn(
            "h-auto w-full justify-start gap-2 rounded-md px-2 py-1.5",
            isActive && "bg-primary/20 text-foreground hover:bg-primary/30"
          )}
        >
          <Icon className="size-4 shrink-0" />
          {item.label}
        </Button>
      );
    }

    const { group } = entry;
    const isOpen = openGroups.has(group.id);
    const Icon = group.icon;
    return (
      <Collapsible key={group.id} open={isOpen} onOpenChange={() => onToggleGroup(group.id)}>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2 rounded-md px-2 py-1.5 font-medium aria-expanded:bg-transparent aria-expanded:text-inherit"
            />
          }
        >
          <Icon className="size-4 shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          {isOpen ? (
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="size-3.5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsiblePanel className="mt-0.5 mb-1 ml-3 flex flex-col gap-0.5 border-l pl-3">
          {group.items.map((item) => {
            const isActive = item.view === activeResource;
            const isImplemented = !!item.view;
            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => onSelectItem(item as NavItem<ViewType>)}
                disabled={!isImplemented}
                className={cn(
                  "h-auto w-full justify-start rounded-md px-2 py-1 text-sm",
                  isActive && "bg-primary/20 text-foreground hover:bg-primary/30"
                )}
              >
                {item.label}
              </Button>
            );
          })}
        </CollapsiblePanel>
      </Collapsible>
    );
  }

  return (
    <aside className="flex w-62 shrink-0 flex-col overflow-y-auto border-r">
      <div className="flex flex-col gap-0.5 p-2">
        {NAV_CORE.map(renderEntry)}
        {pluginNavEntries.length > 0 && <Separator className="my-2" />}
        {pluginNavEntries.map(renderEntry)}
      </div>
    </aside>
  );
};
