import { Button, FullTextSearchInput, cn } from "@galacius/design-system";

import { FC } from "react";
import { ModificationResourceKind } from "./ModificationTrayTypes";

interface ModificationTrayToolbarProps {
  collapsed: boolean;
  kind: ModificationResourceKind;
  name: string;
  namespace?: string;
  isLoading: boolean;
  isDirty: boolean;
  isPending: boolean;
  onCancel: () => void;
  onSave: () => void;
  onSaveAndClose: () => void;
  searchTerm: string;
  matchCount: number;
  currentMatchIdx: number;
  onSearch: (term: string) => void;
  onSearchNext: () => void;
}

export const ModificationTrayToolbar: FC<ModificationTrayToolbarProps> = ({
  collapsed,
  kind,
  name,
  namespace,
  isLoading,
  isDirty,
  isPending,
  onCancel,
  onSave,
  onSaveAndClose,
  searchTerm,
  matchCount,
  currentMatchIdx,
  onSearch,
  onSearchNext,
}) => (
  <div className={cn("flex h-10 shrink-0 items-center gap-3 border-b px-4", collapsed && "hidden")}>
    {/* Kind chip */}
    <span className="text-xs text-muted-foreground">Kind</span>
    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">{kind}</span>

    {/* Name chip */}
    <span className="text-xs text-muted-foreground">Name</span>
    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">{name}</span>

    {/* Namespace chip — cluster-scoped resources repeat name */}
    <span className="text-xs text-muted-foreground">Namespace</span>
    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
      {namespace ?? name}
    </span>

    <div className="flex-1" />

    {/* Search */}
    <FullTextSearchInput
      searchTerm={searchTerm}
      matchCount={matchCount}
      currentMatchIdx={currentMatchIdx}
      onSearch={onSearch}
      onSearchNext={onSearchNext}
      ariaLabel="Search YAML"
    />

    {/* Actions */}
    <Button
      variant="ghost"
      size="sm"
      onClick={onCancel}
      className="h-7 text-xs"
      disabled={isLoading || isPending}
    >
      Cancel
    </Button>
    <Button
      variant="outline"
      size="sm"
      onClick={onSave}
      className="h-7 text-xs"
      disabled={!isDirty || isPending}
    >
      Save
    </Button>
    <Button
      variant="default"
      size="sm"
      onClick={onSaveAndClose}
      className="h-7 text-xs"
      disabled={!isDirty || isPending}
    >
      Save & Close
    </Button>
  </div>
);
