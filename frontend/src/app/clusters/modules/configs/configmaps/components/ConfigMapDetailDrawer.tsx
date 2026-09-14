import {
  AnnotationBadge,
  Button,
  ButtonGroup,
  Input,
  Loader2Icon,
  LoadingSpinner,
  PlusIcon,
  ResourceDeletionButton,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
  ResourceLink,
  ResourceModificationButton,
  ScrollArea,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TooltipProvider,
  Trash2Icon,
  cn,
} from "@galacius/design-system";
import { FC, FormEvent, useEffect, useReducer, useRef, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { ConfigMap } from "../api/resources";
import { useGetConfigMapDetail } from "../hooks/data-access/useGetConfigMapDetail";
import { useDeleteConfigMap } from "../hooks/data-mutation/useDeleteConfigMap";
import { useUpdateConfigMap } from "../hooks/data-mutation/useUpdateConfigMap";
import { ConfigMapDeleteConfirmationModal } from "./ConfigMapDeleteConfirmationModal";
import { ConfigMapModificationConfirmationModal } from "./ConfigMapModificationConfirmationModal";

const ConfigMapValueField: FC<{
  name: string;
  value: string | undefined;
  isEditing?: boolean;
  isDeleted?: boolean;
  editedValue?: string;
  onChange?: (v: string) => void;
  onKeyChange?: (k: string) => void;
  onDelete?: () => void;
}> = ({ name, value, isEditing, isDeleted, editedValue, onChange, onKeyChange, onDelete }) => {
  const currentValue = editedValue ?? value ?? "";

  return (
    <div className={isDeleted ? "opacity-40" : ""}>
      {onKeyChange ? (
        <Input
          variant="ghost"
          placeholder="key name"
          value={name}
          onChange={(e) => onKeyChange(e.target.value)}
          className="mx-4 mt-4 max-w-48 font-mono text-xs font-semibold placeholder:text-muted-foreground/50"
          aria-label="New ConfigMap key"
        />
      ) : (
        <p className="px-4 pt-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground">
          {name}
        </p>
      )}
      {value === undefined ? (
        <p className="mx-4 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-muted-foreground">
          [binary data not shown]
        </p>
      ) : (
        <div className="mx-3 flex items-start gap-2">
          <Textarea
            variant="code"
            placeholder={onKeyChange ? "value" : undefined}
            className="flex-1"
            value={currentValue}
            disabled={!isEditing || isDeleted}
            onChange={(e) => onChange?.(e.target.value)}
            aria-label={
              onKeyChange
                ? "New ConfigMap value"
                : `${isEditing ? "Edit" : "View"} value for ${name}`
            }
          />
          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              aria-label={isDeleted ? "Undo remove" : "Remove key"}
              className={cn(
                "mt-1",
                isDeleted ? "text-muted-foreground" : "text-destructive hover:text-destructive"
              )}
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

interface ConfigMapEditState {
  isEditing: boolean;
  editedValues: Record<string, string>;
  newEntries: { id: number; key: string; value: string }[];
  deletedKeys: Set<string>;
  showConfirm: boolean;
}

const initialConfigMapEditState: ConfigMapEditState = {
  isEditing: false,
  editedValues: {},
  newEntries: [],
  deletedKeys: new Set(),
  showConfirm: false,
};

type ConfigMapEditAction =
  | { type: "start_editing" }
  | { type: "cancel" }
  | { type: "confirmed" }
  | { type: "edit_value"; key: string; value: string }
  | { type: "add_entry"; id: number }
  | { type: "update_entry"; id: number; field: "key" | "value"; value: string }
  | { type: "remove_entry"; id: number }
  | { type: "toggle_delete_key"; key: string }
  | { type: "show_confirm" }
  | { type: "hide_confirm" };

function configMapEditReducer(
  state: ConfigMapEditState,
  action: ConfigMapEditAction
): ConfigMapEditState {
  switch (action.type) {
    case "start_editing":
      return { ...state, isEditing: true };
    case "cancel":
    case "confirmed":
      return initialConfigMapEditState;
    case "edit_value":
      return {
        ...state,
        editedValues: { ...state.editedValues, [action.key]: action.value },
      };
    case "add_entry":
      return {
        ...state,
        newEntries: [...state.newEntries, { id: action.id, key: "", value: "" }],
      };
    case "update_entry":
      return {
        ...state,
        newEntries: state.newEntries.map((e) =>
          e.id === action.id ? { ...e, [action.field]: action.value } : e
        ),
      };
    case "remove_entry":
      return { ...state, newEntries: state.newEntries.filter((e) => e.id !== action.id) };
    case "toggle_delete_key": {
      const next = new Set(state.deletedKeys);
      if (next.has(action.key)) next.delete(action.key);
      else next.add(action.key);
      return { ...state, deletedKeys: next };
    }
    case "show_confirm":
      return { ...state, showConfirm: true };
    case "hide_confirm":
      return { ...state, showConfirm: false };
  }
}

const ConfigMapOverviewTab: FC<{ cm: ConfigMap }> = ({ cm }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  const keys = (cm.Keys ?? []).slice().sort((a, b) => a.localeCompare(b));

  const [{ isEditing, editedValues, newEntries, deletedKeys, showConfirm }, dispatch] = useReducer(
    configMapEditReducer,
    initialConfigMapEditState
  );
  const nextIdRef = useRef(0);

  const { mutate: updateConfigMap, isPending } = useUpdateConfigMap();

  const hasChanges =
    Object.keys(editedValues).length > 0 ||
    newEntries.some((e) => e.key && e.value) ||
    deletedKeys.size > 0;

  const handleCancel = () => {
    dispatch({ type: "cancel" });
  };

  const toggleDeleteKey = (key: string) => {
    dispatch({ type: "toggle_delete_key", key });
  };

  const addEntry = () => {
    dispatch({ type: "add_entry", id: nextIdRef.current });
    nextIdRef.current += 1;
  };

  const updateNewEntry = (id: number, field: "key" | "value", text: string) => {
    dispatch({ type: "update_entry", id, field, value: text });
  };

  const removeNewEntry = (id: number) => {
    dispatch({ type: "remove_entry", id });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: "show_confirm" });
  };

  const onConfirm = () => {
    const finalData = { ...cm.Data };
    for (const key of deletedKeys) {
      delete finalData[key];
    }
    for (const [k, v] of Object.entries(editedValues)) {
      finalData[k] = v;
    }
    for (const entry of newEntries) {
      if (entry.key && entry.value) {
        finalData[entry.key] = entry.value;
      }
    }
    updateConfigMap(
      { namespace: cm.Namespace, name: cm.Name, data: finalData },
      {
        onSuccess: () => {
          dispatch({ type: "confirmed" });
        },
      }
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
          <span className="text-h3 text-muted-foreground">Created</span>
          <span className="text-body font-mono">
            {cm.Age} ago ({cm.CreatedAt})
          </span>

          <span className="text-h3 text-muted-foreground">Name</span>
          <span className="text-body font-mono">{cm.Name}</span>

          <span className="text-h3 text-muted-foreground">Namespace</span>
          <ResourceLink onClick={() => onToggleNamespaceDetail(cm.Namespace)}>
            {cm.Namespace}
          </ResourceLink>

          {Object.keys(cm.Labels ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Labels</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(cm.Labels ?? {}).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {Object.keys(cm.Annotations ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Annotations</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(cm.Annotations ?? {}).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {(cm.ManagedFields ?? []).length > 0 && (
            <>
              <span className="text-h3 self-start pt-0.5 text-muted-foreground">
                Managed Fields
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                {cm.ManagedFields.map((mf) => (
                  <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
                ))}
              </div>
            </>
          )}
        </div>

        {keys.length > 0 && (
          <form onSubmit={handleSubmit}>
            <SectionDivider
              label="Data"
              className="border-y-0 border-t bg-muted/50 tracking-wide uppercase"
            />

            <div className="flex flex-col">
              {keys.map((key) => (
                <ConfigMapValueField
                  key={key}
                  name={key}
                  value={cm.Data?.[key]}
                  isEditing={isEditing && cm.Data?.[key] !== undefined}
                  isDeleted={deletedKeys.has(key)}
                  editedValue={editedValues[key]}
                  onChange={(v) => dispatch({ type: "edit_value", key, value: v })}
                  onDelete={() => toggleDeleteKey(key)}
                />
              ))}
            </div>

            {newEntries.map((entry) => (
              <ConfigMapValueField
                key={entry.id}
                name={entry.key}
                value={entry.value}
                isEditing
                onKeyChange={(k) => updateNewEntry(entry.id, "key", k)}
                onChange={(v) => updateNewEntry(entry.id, "value", v)}
                onDelete={() => removeNewEntry(entry.id)}
              />
            ))}

            <div className="mt-4 flex items-center gap-2 border-t px-4 py-3">
              {isEditing ? (
                <div className="flex flex-1 justify-between">
                  <Button size="sm" variant="outline" type="button" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" type="button" onClick={addEntry}>
                      <PlusIcon className="h-3.5 w-3.5" />
                      Add
                    </Button>
                    <Button size="sm" type="submit" disabled={!hasChanges || isPending}>
                      {isPending && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
                      SaveIcon
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => dispatch({ type: "start_editing" })}
                >
                  Edit
                </Button>
              )}
            </div>
          </form>
        )}
      </ScrollArea>

      <ConfigMapModificationConfirmationModal
        open={showConfirm}
        name={cm.Name}
        isPending={isPending}
        editedKeys={Object.keys(editedValues)}
        newEntries={newEntries}
        deletedKeys={[...deletedKeys]}
        onClose={() => dispatch({ type: "hide_confirm" })}
        onConfirm={onConfirm}
      />
    </div>
  );
};

interface ConfigMapDrawerCtaButtonsProps {
  configMapName: string;
  configMapNamespace: string;
  onClose: () => void;
}

const ConfigMapDrawerCtaButtons: FC<ConfigMapDrawerCtaButtonsProps> = ({
  configMapName,
  configMapNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteConfigMap, isPending: isDeletePending } = useDeleteConfigMap();

  const handleDeleteConfirm = () => {
    deleteConfigMap(
      { namespace: configMapNamespace, name: configMapName },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onClose();
        },
      }
    );
  };

  return (
    <>
      <ButtonGroup>
        <TooltipProvider>
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit ConfigMap"
            onClick={() =>
              openTab("modification", {
                kind: "ConfigMap",
                name: configMapName,
                namespace: configMapNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete ConfigMap"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <ConfigMapDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={configMapName}
        namespace={configMapNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const ConfigMapEventsTab: FC<{ cm: ConfigMap }> = ({ cm }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [cm.Namespace],
  });
  const cmEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "configmap" &&
      e.InvolvedObjectName === cm.Name &&
      e.Namespace === cm.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={cmEvents} />
    </ScrollArea>
  );
};

interface ConfigMapDetailDrawerProps {
  cmName: string | null;
  cmNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const ConfigMapDrawerBody: FC<
  ConfigMapDetailDrawerProps & {
    cmName: string;
    cmNamespace: string;
    onDataChange: (cm: ConfigMap | undefined) => void;
  }
> = ({ cmName, cmNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: cm, isLoading } = useGetConfigMapDetail(activeContext, cmNamespace, cmName);
  useCatchForbiddenResource("configmaps", {
    open,
    resourceName: cmName,
    resourceLabel: "ConfigMap",
    namespace: cmNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(cm);
  }, [cm, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!cm) {
    return <ResourceDetailEmptyBody resourceKind="ConfigMap" />;
  }

  return (
    <Tabs
      defaultValue="overview"
      className="min-h-0 flex-1"
      onValueChange={(v) => {
        if (v === "events") setEventsVisible(true);
      }}
    >
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
        <TabsTrigger value="overview" className="text-xs">
          Overview
        </TabsTrigger>
        <TabsTrigger value="events" className="text-xs">
          Events
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-0 min-h-0 flex-1">
        <ConfigMapOverviewTab cm={cm} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <ConfigMapEventsTab cm={cm} />}
      </TabsContent>
    </Tabs>
  );
};

export const ConfigMapDetailDrawer: FC<ConfigMapDetailDrawerProps> = ({
  cmName,
  cmNamespace,
  open,
  onClose,
}) => {
  const [cm, setCm] = useState<ConfigMap | undefined>(undefined);

  const hasData = !!(cmName && cmNamespace);
  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">ConfigMap: {cm?.Name ?? cmName}</SheetTitle>
        {cm && (
          <ConfigMapDrawerCtaButtons
            configMapName={cm.Name}
            configMapNamespace={cm.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <ConfigMapDrawerBody
          key={`${cmNamespace}/${cmName}`}
          cmName={cmName}
          cmNamespace={cmNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setCm}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="ConfigMap" />
      )}
    </ResourceDetailDrawer>
  );
};
