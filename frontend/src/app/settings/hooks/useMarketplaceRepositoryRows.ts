import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import type { config } from "@wailsjs/go/models";
import { useEffect, useRef, useState } from "react";
import type { MarketplaceRow } from "../components/MarketplaceRepositoryRow";
import { useGetSettings } from "./data-access/useGetSettings";
import { useSaveMarketplaceRepositories } from "./data-mutation/useSaveMarketplaceRepositories";
import { useSectionSaveState } from "./useSectionSaveState";

function buildMarketplaceRepositoriesPayload(
  rowsList: MarketplaceRow[]
): config.MarketplaceRepository[] {
  return rowsList
    .filter((r) => r.url.trim())
    .map((r) => ({
      url: r.url,
      private: r.private,
      accessToken: r.tokenReplacing || !r.tokenSaved ? r.tokenPending : r.tokenSaved,
      locked: r.locked,
      disabled: r.disabled,
    }));
}

// Owns all state and persistence for the marketplace repository rows editor:
// row CRUD, the access-token modal, the lock/unlock confirmation flow, and
// saving to backend settings. Kept separate from MarketplaceContent so that
// component stays focused on rendering.
export function useMarketplaceRepositoryRows() {
  const { data: settings, isFetching: isFetchingSettings } = useGetSettings();
  const { mutateAsync: saveMarketplaceRepositories } = useSaveMarketplaceRepositories();
  const [repoStatus, setRepoStatus] = useSectionSaveState();

  const [rows, setRows] = useState<MarketplaceRow[]>([]);
  const [nextRowId, setNextRowId] = useState(1);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [unlockRowId, setUnlockRowId] = useState<number | null>(null);

  const initializedRef = useRef(false);
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (!settings || isFetchingSettings || initializedRef.current) return;
    initializedRef.current = true;

    // Initialize rows from settings.marketplaceRepositories
    const initialRows: MarketplaceRow[] = (settings.marketplaceRepositories ?? []).map(
      (repo, idx) => ({
        id: idx + 1,
        url: repo.url,
        private: repo.private,
        tokenSaved: repo.accessToken ?? "",
        tokenPending: "",
        tokenReplacing: false,
        locked: repo.locked ?? false,
        disabled: repo.disabled ?? false,
      })
    );
    setRows(initialRows);
    setNextRowId((initialRows.length || 0) + 1);
  }, [settings, isFetchingSettings]);

  function handleUrlChange(rowId: number, value: string) {
    initializedRef.current = true;
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, url: value } : r)));
  }

  function handlePrivateChange(rowId: number, checked: boolean) {
    initializedRef.current = true;
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, private: checked } : r)));
  }

  function handleTokenModalOpen(rowId: number) {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    setEditingRowId(rowId);
    if (row.tokenSaved) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, tokenReplacing: true, tokenPending: row.tokenSaved } : r
        )
      );
    }
    setTokenModalOpen(true);
  }

  function handleTokenModalClose() {
    setTokenModalOpen(false);
    setEditingRowId(null);
    setRows((prev) =>
      prev.map((r) =>
        r.id === editingRowId ? { ...r, tokenReplacing: false, tokenPending: "" } : r
      )
    );
  }

  function handleTokenModalSubmit(token: string) {
    initializedRef.current = true;
    if (editingRowId !== null) {
      setRows((prev) =>
        prev.map((r) => (r.id === editingRowId ? { ...r, tokenPending: token } : r))
      );
    }
    setTokenModalOpen(false);
  }

  function handleRemoveRow(rowId: number) {
    initializedRef.current = true;
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }

  async function persistLockChange(rowId: number, locked: boolean) {
    initializedRef.current = true;
    const nextRows = rows.map((r) => (r.id === rowId ? { ...r, locked } : r));
    setRows(nextRows);
    try {
      await saveMarketplaceRepositories(buildMarketplaceRepositoriesPayload(nextRows));
    } catch {
      // Revert the optimistic UI update if persisting the lock state failed.
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, locked: !locked } : r)));
      renderErrorToast({
        title: "Failed to update lock state",
        description: "Please try again.",
      });
    }
  }

  async function persistDisableChange(rowId: number, disabled: boolean) {
    initializedRef.current = true;
    const nextRows = rows.map((r) => (r.id === rowId ? { ...r, disabled } : r));
    setRows(nextRows);
    try {
      await saveMarketplaceRepositories(buildMarketplaceRepositoriesPayload(nextRows));
    } catch {
      // Revert the optimistic UI update if persisting the disabled state failed.
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, disabled: !disabled } : r)));
      renderErrorToast({
        title: "Failed to update disable state",
        description: "Please try again.",
      });
    }
  }

  function handleToggleLock(rowId: number) {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    if (row.locked) {
      setUnlockRowId(rowId);
      return;
    }
    void persistLockChange(rowId, true);
  }

  function handleUnlockConfirm() {
    if (unlockRowId === null) return;
    void persistLockChange(unlockRowId, false);
    setUnlockRowId(null);
  }

  function handleUnlockCancel() {
    setUnlockRowId(null);
  }

  function handleToggleDisable(rowId: number) {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    void persistDisableChange(rowId, !row.disabled);
  }

  function handleAddRow() {
    initializedRef.current = true;
    const newRow: MarketplaceRow = {
      id: nextRowId,
      url: "",
      private: false,
      tokenSaved: "",
      tokenPending: "",
      tokenReplacing: false,
      locked: false,
      disabled: false,
    };
    setRows((prev) => [...prev, newRow]);
    setNextRowId((prev) => prev + 1);
    // Focus new row's input
    setTimeout(() => {
      const input = inputRefs.current.get(newRow.id);
      if (input) input.focus();
    }, 0);
  }

  async function handleSaveMarketplaceRepo() {
    setRepoStatus("saving");
    try {
      await saveMarketplaceRepositories(buildMarketplaceRepositoriesPayload(rows));

      // Update tokenSaved from resolved values
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          tokenSaved: r.tokenReplacing || !r.tokenSaved ? r.tokenPending : r.tokenSaved,
          tokenPending: "",
          tokenReplacing: false,
        }))
      );

      setRepoStatus("saved");
      renderSuccessToast({
        title: "Marketplace settings saved",
        description: "Marketplace repository configuration has been updated.",
      });
    } catch {
      setRepoStatus("error");
    }
  }

  function setInputRef(rowId: number, el: HTMLInputElement | null) {
    if (el) inputRefs.current.set(rowId, el);
  }

  return {
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
  };
}
