import {
  Button,
  CheckCircle2Icon,
  cn,
  EyeIcon,
  EyeOffIcon,
  Input,
  KeyIcon,
  LockIcon,
  LockOpenIcon,
  Switch,
  XIcon,
} from "@galacius/design-system";
import { FC } from "react";

export interface MarketplaceRow {
  id: number;
  url: string;
  private: boolean;
  tokenSaved: string;
  tokenPending: string;
  tokenReplacing: boolean;
  locked: boolean;
  disabled: boolean;
}

export const MarketplaceRepositoryRow: FC<{
  row: MarketplaceRow;
  onUrlChange: (rowId: number, value: string) => void;
  onPrivateChange: (rowId: number, checked: boolean) => void;
  onTokenModalOpen: (rowId: number) => void;
  onRemoveRow: (rowId: number) => void;
  onToggleDisable: (rowId: number) => void;
  onToggleLock: (rowId: number) => void;
  inputRef: (rowId: number, el: HTMLInputElement | null) => void;
}> = ({
  row,
  onUrlChange,
  onPrivateChange,
  onTokenModalOpen,
  onRemoveRow,
  onToggleDisable,
  onToggleLock,
  inputRef,
}) => {
  return (
    <div className={cn("flex flex-col gap-3 rounded-md border p-3", row.disabled && "opacity-60")}>
      {/* URL input + token button + private switch + remove button */}
      <div className="flex items-center gap-4">
        <Input
          ref={(el) => inputRef(row.id, el)}
          value={row.url}
          onChange={(e) => onUrlChange(row.id, e.target.value)}
          placeholder="https://github.com/user/plugins"
          aria-label={`Marketplace repository URL ${row.id}`}
          className="flex-1 font-mono text-sm"
          disabled={row.locked}
        />

        {row.private && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onTokenModalOpen(row.id)}
            aria-label={row.tokenSaved ? "Update access token" : "Add access token"}
            className="shrink-0"
            disabled={row.locked}
          >
            <div className="flex items-center gap-1">
              <KeyIcon className="size-4 text-muted-foreground" />
              {row.tokenSaved && <CheckCircle2Icon className="size-3 text-green-500" />}
            </div>
          </Button>
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          <label htmlFor={`private-${row.id}`} className="text-xs font-medium">
            Private
          </label>
          <Switch
            id={`private-${row.id}`}
            checked={row.private}
            onCheckedChange={(checked) => onPrivateChange(row.id, checked)}
            aria-label={`Mark marketplace repository ${row.id} as private`}
            disabled={row.locked}
          />
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemoveRow(row.id)}
          aria-label="Remove this marketplace repository"
          className="shrink-0"
          disabled={row.locked}
        >
          <XIcon className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onToggleDisable(row.id)}
          aria-label={
            row.disabled
              ? "Enable this marketplace repository"
              : "Disable this marketplace repository"
          }
          aria-pressed={row.disabled}
          className="shrink-0"
        >
          {row.disabled ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onToggleLock(row.id)}
          aria-label={
            row.locked ? "Unlock this marketplace repository" : "Lock this marketplace repository"
          }
          aria-pressed={row.locked}
          className="shrink-0"
        >
          {row.locked ? (
            <LockIcon className="size-4" />
          ) : (
            <LockOpenIcon className="size-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
};
