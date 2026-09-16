import { useGetNodeYAML } from "../hooks/data-access/useGetNodeYAML";
import { useUpdateNodeYAML } from "../hooks/data-mutation/useUpdateNodeYAML";
import { Textarea, cn, useFullTextSearch } from "@galacius/design-system";
import { FC, Fragment, useReducer } from "react";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { ModificationTrayToolbar } from "../../../../shared/components/trays/modification/ModificationTrayToolbar";
import { ModificationTrayContentProps } from "../../../../shared/components/trays/modification/ModificationTrayTypes";

interface YamlEditorState {
  editedYAML: string;
  prevYAML: string | undefined;
}

type YamlEditorAction =
  { type: "sync_from_source"; yaml: string | undefined } | { type: "edit"; value: string };

function yamlEditorReducer(state: YamlEditorState, action: YamlEditorAction): YamlEditorState {
  switch (action.type) {
    case "sync_from_source":
      return { editedYAML: action.yaml ?? "", prevYAML: action.yaml };
    case "edit":
      return { ...state, editedYAML: action.value };
  }
}

export const NodeModificationTray: FC<ModificationTrayContentProps> = ({
  tab,
  collapsed,
  onClose,
}) => {
  const { activeContext } = useMainLayoutContext();

  const nodeName = tab.name;
  const [{ editedYAML, prevYAML }, dispatchYamlEditor] = useReducer(yamlEditorReducer, {
    editedYAML: "",
    prevYAML: undefined,
  });

  const {
    data: yaml,
    isLoading: isYamlLoading,
    isError,
    error,
    isFetching: isYamlFetching,
  } = useGetNodeYAML(activeContext, nodeName);

  // Reset editedYAML when yaml changes (initial load) — derived state pattern
  if (yaml !== prevYAML) {
    dispatchYamlEditor({ type: "sync_from_source", yaml });
  }

  const isLoading = isYamlLoading || isYamlFetching;
  const isDirty = editedYAML !== (yaml ?? "");

  const { mutate: updateYAML, isPending: isUpdating } = useUpdateNodeYAML();

  const {
    searchTerm,
    matchCount,
    currentMatchIdx,
    activeMatchCharIdx,
    contentRef,
    handleSearch,
    handleSearchNext,
  } = useFullTextSearch({ text: editedYAML });

  const handleSave = () => {
    updateYAML({ yamlString: editedYAML });
  };

  const handleSaveAndClose = () => {
    updateYAML({ yamlString: editedYAML }, { onSuccess: () => onClose() });
  };

  return (
    <>
      {/* [A] Toolbar row */}
      <ModificationTrayToolbar
        collapsed={collapsed}
        kind={tab.kind}
        name={nodeName}
        namespace={tab.namespace}
        isLoading={isLoading}
        isDirty={isDirty}
        isPending={isUpdating}
        onCancel={onClose}
        onSave={handleSave}
        onSaveAndClose={handleSaveAndClose}
        searchTerm={searchTerm}
        matchCount={matchCount}
        currentMatchIdx={currentMatchIdx}
        onSearch={handleSearch}
        onSearchNext={handleSearchNext}
      />

      {/* [B] Content area */}
      <div
        ref={contentRef}
        className={cn("flex flex-1 flex-col overflow-hidden", collapsed && "hidden")}
      >
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Fragment key={i}>
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
              </Fragment>
            ))}
          </div>
        ) : isError ? (
          <p className="p-4 text-xs text-destructive">Failed to load YAML: {String(error)}</p>
        ) : !yaml ? (
          <p className="p-4 text-xs text-muted-foreground">No YAML available for this Node.</p>
        ) : (
          <Textarea
            variant="yaml"
            borderRounded={false}
            className="flex-1"
            value={editedYAML}
            onChange={(e) => dispatchYamlEditor({ type: "edit", value: e.target.value })}
            editable={true}
            searchTerm={searchTerm}
            activeMatchCharIdx={activeMatchCharIdx}
          />
        )}
      </div>
    </>
  );
};
