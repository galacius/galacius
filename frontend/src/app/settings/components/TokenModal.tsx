import { Button, FormModal, Input } from "@galacius/design-system";
import { FC, useState } from "react";

interface TokenModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (token: string) => void | Promise<void>;
  savedToken?: string;
  isLoading?: boolean;
}

export const TokenModal: FC<TokenModalProps> = ({
  open,
  onClose,
  onSubmit,
  savedToken,
  isLoading = false,
}) => {
  const [token, setToken] = useState("");
  const [replacing, setReplacing] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setToken("");
      setReplacing(false);
      onClose();
    }
  };

  const isEditing = !!savedToken;
  const isEditable = !savedToken || replacing;
  const valueToSubmit = isEditable ? token.trim() : savedToken;

  const handleSubmit = async () => {
    await onSubmit(valueToSubmit ?? "");
  };

  return (
    <FormModal
      open={open}
      onOpenChange={handleOpenChange}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEditing ? "Update Access Token" : "Add Access Token"}
      isLoading={isLoading}
      submitDisabled={!savedToken && !valueToSubmit}
      submitLabel="Save Token"
      size="2xl"
    >
      <div className="flex flex-col gap-3">
        <label
          htmlFor="marketplace-access-token"
          className="text-xs font-semibold tracking-wider uppercase"
        >
          Access Token
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="marketplace-access-token"
            type={isEditable ? "text" : "password"}
            value={isEditable ? token : savedToken}
            onChange={(e) => setToken(e.target.value)}
            disabled={!isEditable || isLoading}
            placeholder={replacing ? "Enter new value" : "Paste access token"}
            className="flex-1 font-mono text-sm"
            aria-label="Access token input"
          />
          {replacing ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setReplacing(false);
                setToken("");
              }}
              className="shrink-0 text-muted-foreground"
            >
              Cancel
            </Button>
          ) : (
            savedToken && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setReplacing(true);
                  setToken(savedToken ?? "");
                }}
                className="shrink-0 text-muted-foreground"
              >
                Replace
              </Button>
            )
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Required for access to private marketplace repositories.
        </p>
      </div>
    </FormModal>
  );
};
