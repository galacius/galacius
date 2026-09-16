import {
  AnnotationBadge,
  Button,
  ButtonGroup,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  Input,
  Loader2Icon,
  LoadingSpinner,
  PlusIcon,
  ResourceDeletionButton,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
  ResourceModificationButton,
  ScrollArea,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TooltipProvider,
  Trash2Icon,
  useCopyToClipboard,
} from "@galacius/design-system";
import { FC, FormEvent, useEffect, useReducer, useRef, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { SecretDetail } from "../api/resources";
import { useGetSecretDetail } from "../hooks/data-access/useGetSecretDetail";
import { useDeleteSecret } from "../hooks/data-mutation/useDeleteSecret";
import { useUpdateSecret } from "../hooks/data-mutation/useUpdateSecret";
import { SecretDeleteConfirmationModal } from "./SecretDeleteConfirmationModal";
import { SecretModificationConfirmationModal } from "./SecretModificationConfirmationModal";

const SecretValueField: FC<{
  name: string;
  value: string;
  isEditing?: boolean;
  isDeleted?: boolean;
  isRevealed?: boolean;
  isCopied?: boolean;
  onChange?: (v: string) => void;
  onKeyChange?: (k: string) => void;
  onToggleReveal?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}> = ({
  name,
  value,
  isEditing,
  isDeleted,
  isRevealed,
  isCopied,
  onChange,
  onKeyChange,
  onToggleReveal,
  onCopy,
  onDelete,
}) => {
  const isNew = !!onKeyChange;

  return (
    <div
      className={`mt-4 flex flex-col gap-1.5 transition-opacity ${isDeleted ? "opacity-40" : ""}`}
    >
      {isNew ? (
        <Input
          variant="ghost"
          value={name}
          placeholder="key name"
          onChange={(e) => onKeyChange(e.target.value)}
          className="max-w-48 font-mono text-xs font-semibold placeholder:text-muted-foreground/50"
          aria-label="New secret key"
        />
      ) : (
        <p className="font-mono text-xs font-semibold text-muted-foreground">{name}</p>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type={isNew && !isRevealed ? "password" : "text"}
            value={value}
            placeholder={isNew ? "value" : undefined}
            disabled={!isNew && (!isEditing || isDeleted)}
            onChange={(e) => onChange?.(e.target.value)}
            className="pr-7 font-mono text-xs"
            aria-label={isNew ? "New secret value" : `Secret value for ${name}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-0.5"
            onClick={onCopy}
            aria-label="CopyIcon value"
          >
            {isCopied ? (
              <CheckIcon className="h-3.5 w-3.5 text-success" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleReveal}
          aria-label={isRevealed ? "Hide" : "Show"}
          aria-pressed={isRevealed}
          disabled={!isNew && isDeleted}
        >
          {isRevealed ? (
            <EyeOffIcon className="h-3.5 w-3.5" />
          ) : (
            <EyeIcon className="h-3.5 w-3.5" />
          )}
        </Button>
        {(isNew || isEditing) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={!isNew && isDeleted ? "Undo remove" : "Remove key"}
            className={
              !isNew && isDeleted
                ? "text-muted-foreground"
                : "text-destructive hover:text-destructive"
            }
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

interface SecretEditState {
  isEditing: boolean;
  showKeys: Record<string, boolean>;
  editedValues: Record<string, string>;
  newEntries: { id: number; key: string; value: string }[];
  showNewKeys: Record<number, boolean>;
  deletedKeys: Set<string>;
  showConfirm: boolean;
}

const initialSecretEditState: SecretEditState = {
  isEditing: false,
  showKeys: {},
  editedValues: {},
  newEntries: [],
  showNewKeys: {},
  deletedKeys: new Set(),
  showConfirm: false,
};

type SecretEditAction =
  | { type: "start_editing" }
  | { type: "cancel" }
  | { type: "confirmed" }
  | { type: "edit_value"; key: string; value: string }
  | { type: "toggle_reveal"; key: string }
  | { type: "add_entry"; id: number }
  | { type: "update_entry"; id: number; field: "key" | "value"; value: string }
  | { type: "remove_entry"; id: number }
  | { type: "toggle_new_reveal"; id: number }
  | { type: "toggle_delete_key"; key: string }
  | { type: "show_confirm" }
  | { type: "hide_confirm" };

function secretEditReducer(state: SecretEditState, action: SecretEditAction): SecretEditState {
  switch (action.type) {
    case "start_editing":
      return { ...state, isEditing: true };
    case "cancel":
    case "confirmed":
      return initialSecretEditState;
    case "edit_value":
      return { ...state, editedValues: { ...state.editedValues, [action.key]: action.value } };
    case "toggle_reveal":
      return {
        ...state,
        showKeys: { ...state.showKeys, [action.key]: !state.showKeys[action.key] },
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
    case "toggle_new_reveal":
      return {
        ...state,
        showNewKeys: { ...state.showNewKeys, [action.id]: !state.showNewKeys[action.id] },
      };
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

const SecretOverviewTab: FC<{ secret: SecretDetail }> = ({ secret }) => {
  const [
    { isEditing, showKeys, editedValues, newEntries, showNewKeys, deletedKeys, showConfirm },
    dispatch,
  ] = useReducer(secretEditReducer, initialSecretEditState);
  const nextIdRef = useRef(0);

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

  const toggleDeleteKey = (key: string) => {
    dispatch({ type: "toggle_delete_key", key });
  };

  const { mutate: updateSecret, isPending } = useUpdateSecret();

  const hasChanges =
    Object.keys(editedValues).length > 0 ||
    newEntries.some((e) => e.key && e.value) ||
    deletedKeys.size > 0;

  const handleCancel = () => {
    dispatch({ type: "cancel" });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: "show_confirm" });
  };

  const onConfirm = () => {
    const finalData = { ...secret.Data };
    for (const key of deletedKeys) {
      delete finalData[key];
    }
    for (const [k, v] of Object.entries(editedValues)) {
      finalData[k] = btoa(v);
    }
    for (const entry of newEntries) {
      if (entry.key && entry.value) {
        finalData[entry.key] = btoa(entry.value);
      }
    }
    updateSecret(
      { namespace: secret.Namespace, name: secret.Name, data: finalData },
      {
        onSuccess: () => {
          dispatch({ type: "confirmed" });
        },
      }
    );
  };

  const { copiedValue: copiedKey, copy } = useCopyToClipboard<string>();

  const copyToClipboard = (key: string, text: string) => copy(text, key);

  const dataKeys = Object.keys(secret.Data || {}).sort();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
          <span className="text-h3 text-muted-foreground">Created</span>
          <span className="text-body font-mono">
            {secret.Age} ago ({secret.CreatedAt})
          </span>

          <span className="text-h3 text-muted-foreground">Name</span>
          <span className="text-body font-mono">{secret.Name}</span>

          <span className="text-h3 text-muted-foreground">Namespace</span>
          <span className="text-body font-mono">{secret.Namespace}</span>

          <span className="text-h3 text-muted-foreground">Type</span>
          <span className="text-body font-mono">{secret.Type}</span>

          <span className="text-h3 text-muted-foreground">Labels</span>
          <div className="flex flex-wrap gap-1">
            {Object.keys(secret.Labels ?? {}).length > 0 ? (
              Object.entries(secret.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={`${k}=${v}`} />
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

          <span className="text-h3 text-muted-foreground">Annotations</span>
          <div className="flex flex-wrap gap-1">
            {Object.keys(secret.Annotations ?? {}).length > 0 ? (
              Object.entries(secret.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={`${k}=${v}`} />
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>

        {dataKeys.length > 0 && (
          <form onSubmit={handleSubmit}>
            <SectionDivider
              label="Data"
              className="border-y-0 border-t bg-muted/50 tracking-wide uppercase"
            />

            <div className="flex flex-col px-4 pb-4">
              {dataKeys.map((key) => {
                const original = secret.Data[key] ?? "";
                const decoded = key in editedValues ? editedValues[key] : atob(original);
                const displayed = showKeys[key]
                  ? decoded
                  : key in editedValues
                    ? btoa(decoded)
                    : original;
                return (
                  <SecretValueField
                    key={key}
                    name={key}
                    value={displayed}
                    isEditing={isEditing}
                    isDeleted={deletedKeys.has(key)}
                    isRevealed={showKeys[key]}
                    isCopied={copiedKey === key}
                    onChange={(v) => dispatch({ type: "edit_value", key, value: v })}
                    onToggleReveal={() => dispatch({ type: "toggle_reveal", key })}
                    onCopy={() => copyToClipboard(key, displayed)}
                    onDelete={() => toggleDeleteKey(key)}
                  />
                );
              })}
              {isEditing &&
                newEntries.map((entry) => (
                  <SecretValueField
                    key={entry.id}
                    name={entry.key}
                    value={entry.value}
                    isRevealed={showNewKeys[entry.id]}
                    isCopied={copiedKey === `__new__${entry.id}`}
                    onKeyChange={(k) => updateNewEntry(entry.id, "key", k)}
                    onChange={(v) => updateNewEntry(entry.id, "value", v)}
                    onToggleReveal={() => dispatch({ type: "toggle_new_reveal", id: entry.id })}
                    onCopy={() => copyToClipboard(`__new__${entry.id}`, entry.value)}
                    onDelete={() => removeNewEntry(entry.id)}
                  />
                ))}
            </div>

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
                      Save
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

      <SecretModificationConfirmationModal
        open={showConfirm}
        name={secret.Name}
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

interface SecretDrawerCtaButtonsProps {
  secretName: string;
  secretNamespace: string;
  onClose: () => void;
}

const SecretDrawerCtaButtons: FC<SecretDrawerCtaButtonsProps> = ({
  secretName,
  secretNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { mutate: deleteSecret, isPending: isDeletePending } = useDeleteSecret();

  const handleDeleteConfirm = () => {
    deleteSecret(
      { namespace: secretNamespace, name: secretName },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onClose();
        },
      }
    );
  };

  const { openTab } = useUnifiedTray();

  return (
    <>
      <ButtonGroup>
        <TooltipProvider>
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit Secret"
            onClick={() =>
              openTab("modification", {
                kind: "Secret",
                name: secretName,
                namespace: secretNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete Secret"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <SecretDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={secretName}
        namespace={secretNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const SecretEventsTab: FC<{ secret: SecretDetail }> = ({ secret }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [] });
  const secretEvents = events.filter(
    (e) => e.InvolvedObjectKind.toLowerCase() === "secret" && e.InvolvedObjectName === secret.Name
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={secretEvents} />
    </ScrollArea>
  );
};

interface SecretDetailDrawerProps {
  secretName: string | null;
  secretNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const SecretDrawerBody: FC<
  SecretDetailDrawerProps & {
    secretName: string;
    secretNamespace: string;
    onDataChange: (secret: SecretDetail | undefined) => void;
  }
> = ({ secretName, secretNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: secret, isLoading } = useGetSecretDetail(
    activeContext,
    secretNamespace,
    secretName
  );
  useCatchForbiddenResource("secrets", {
    open,
    resourceName: secretName,
    resourceLabel: "Secret",
    namespace: secretNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(secret);
  }, [secret, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!secret) {
    return <ResourceDetailEmptyBody resourceKind="Secret" />;
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
        <SecretOverviewTab secret={secret} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <SecretEventsTab secret={secret} />}
      </TabsContent>
    </Tabs>
  );
};

export const SecretDetailDrawer: FC<SecretDetailDrawerProps> = ({
  secretName,
  secretNamespace,
  open,
  onClose,
}) => {
  const [secret, setSecret] = useState<SecretDetail | undefined>(undefined);

  const hasData = !!secretName && !!secretNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Secret: {secret?.Name ?? secretName}</SheetTitle>
        {secret && (
          <SecretDrawerCtaButtons
            secretName={secret.Name}
            secretNamespace={secret.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <SecretDrawerBody
          key={`${secretNamespace}/${secretName}`}
          secretName={secretName}
          secretNamespace={secretNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setSecret}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Secret" />
      )}
    </ResourceDetailDrawer>
  );
};
