import { Button, ConfirmationModal, SaveIcon } from "@galacius/design-system";
import { FC } from "react";
import { useMarketplaceRepositoryRows } from "../hooks/useMarketplaceRepositoryRows";
import { saveLabel } from "../hooks/useSectionSaveState";
import { MarketplaceRepositoryRow } from "./MarketplaceRepositoryRow";
import { TokenModal } from "./TokenModal";

export const MarketplaceContent: FC = () => {
  const {
    settings,
    rows,
    repoStatus,
    tokenModalOpen,
    editingRowId,
    unlockRowId,
    handleUrlChange,
    handlePrivateChange,
    handleTokenModalOpen,
    handleTokenModalClose,
    handleTokenModalSubmit,
    handleRemoveRow,
    handleToggleLock,
    handleUnlockConfirm,
    handleUnlockCancel,
    handleToggleDisable,
    handleAddRow,
    handleSaveMarketplaceRepo,
    setInputRef,
  } = useMarketplaceRepositoryRows();

  function handleMarketplaceFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void handleSaveMarketplaceRepo();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-6 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <form
            className="flex min-h-0 max-w-4xl flex-1 flex-col gap-4"
            onSubmit={handleMarketplaceFormSubmit}
          >
            <div className="flex items-center gap-4">
              <p className="text-left text-xs font-semibold tracking-wider uppercase">
                Marketplace Repository URLs
              </p>
              <Button type="submit" size="sm" disabled={repoStatus === "saving" || !settings}>
                <SaveIcon className="size-3.5" />
                {saveLabel(repoStatus)}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddRow}>
                + Add Marketplace
              </Button>
            </div>

            {repoStatus === "error" && (
              <p className="text-xs text-destructive">Failed to save. Please try again.</p>
            )}

            <p className="text-xs text-muted-foreground">
              Enter any marketplace source URL. The official galacius marketplace is pre-added below
              — remove it if you don't want plugins fetched from it.
              <br />- Public repositories should use the plain GitHub URL form (e.g.
              <b>https://github.com/user/plugins</b>);
              <br />- Mark a repository Private and add an access token if it needs the
              authenticated GitHub API instead (e.g.
              <b>https://api.github.com/repos/user/plugins/releases</b>).
            </p>

            {/* User-added repositories */}
            {rows.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                {rows.map((row) => (
                  <MarketplaceRepositoryRow
                    key={row.id}
                    row={row}
                    onUrlChange={handleUrlChange}
                    onPrivateChange={handlePrivateChange}
                    onTokenModalOpen={handleTokenModalOpen}
                    onRemoveRow={handleRemoveRow}
                    onToggleDisable={handleToggleDisable}
                    onToggleLock={handleToggleLock}
                    inputRef={setInputRef}
                  />
                ))}
              </div>
            )}
          </form>

          <TokenModal
            open={tokenModalOpen}
            onClose={handleTokenModalClose}
            onSubmit={handleTokenModalSubmit}
            savedToken={
              editingRowId !== null
                ? (rows.find((r) => r.id === editingRowId)?.tokenSaved ?? "")
                : ""
            }
          />

          <ConfirmationModal
            open={unlockRowId !== null}
            title="Unlock repository"
            description="This will allow this marketplace repository's fields to be edited again. Are you sure you want to unlock it?"
            confirmLabel="Unlock"
            isPending={false}
            onClose={handleUnlockCancel}
            onConfirm={handleUnlockConfirm}
          />
        </div>
      </div>
    </div>
  );
};
