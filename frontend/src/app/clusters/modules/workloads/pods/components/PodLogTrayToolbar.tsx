import {
  Button,
  FullTextSearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Trash2Icon,
  cn,
} from "@galacius/design-system";

import { FC } from "react";
import type { TrayTab } from "./PodTray";
import { PodMetaStrip } from "./PodMetaStrip";
import { statusDotClass } from "./podStatusUtils";

interface PodLogTrayToolbarProps {
  collapsed: boolean;
  tab: TrayTab;
  container: string;
  onContainerChange: (c: string) => void;
  searchTerm: string;
  matchCount: number;
  currentMatchIdx: number;
  status: string;
  onClear: () => void;
  onSearch: (term: string) => void;
  onSearchNext: () => void;
}

export const PodLogTrayToolbar: FC<PodLogTrayToolbarProps> = ({
  collapsed,
  tab,
  container,
  onContainerChange,
  searchTerm,
  matchCount,
  currentMatchIdx,
  status,
  onClear,
  onSearch,
  onSearchNext,
}) => (
  <div className={cn("flex h-10 shrink-0 items-center gap-2 border-b px-3", collapsed && "hidden")}>
    <PodMetaStrip tab={tab} />

    {tab.containers.length > 0 && (
      <Select
        value={container}
        onValueChange={(v) => {
          if (v) onContainerChange(v);
        }}
      >
        <SelectTrigger className="h-6 w-fit text-xs" size="sm">
          <SelectValue placeholder="ContainerIcon" />
        </SelectTrigger>
        <SelectContent
          className="w-fit"
          positionerClassName="z-popover-nested"
          alignItemWithTrigger={false}
        >
          {tab.containers.map((c) => (
            <SelectItem key={c.Name} value={c.Name}>
              {c.Name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}

    <FullTextSearchInput
      searchTerm={searchTerm}
      matchCount={matchCount}
      currentMatchIdx={currentMatchIdx}
      onSearch={onSearch}
      onSearchNext={onSearchNext}
      ariaLabel="Search logs"
    />

    <div className="ml-auto flex shrink-0 items-center gap-2">
      <Button
        variant="ghost"
        size="xs"
        className="gap-1.5"
        aria-label="Clear terminal"
        onClick={onClear}
      >
        <Trash2Icon className="size-3.5" />
        Clear
      </Button>
      <span
        className={cn("inline-block h-2 w-2 rounded-full", statusDotClass(status))}
        title={status}
      />
    </div>
  </div>
);
