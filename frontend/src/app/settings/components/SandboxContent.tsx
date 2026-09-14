import { Button, Input, SaveIcon, renderSuccessToast } from "@galacius/design-system";
import { FC, useEffect, useRef, useState } from "react";
import { useGetSettings } from "../hooks/data-access/useGetSettings";
import { useMergeSettingsOnSave } from "../hooks/useMergeSettingsOnSave";
import { useSectionSaveState, saveLabel } from "../hooks/useSectionSaveState";

export const SandboxContent: FC = () => {
  const { data: settings } = useGetSettings();
  const mergeAndSave = useMergeSettingsOnSave();
  const [status, setStatus] = useSectionSaveState();

  const [accessTokenSaved, setAccessTokenSaved] = useState("");
  const [accessTokenPending, setAccessTokenPending] = useState("");
  const [accessTokenReplacing, setAccessTokenReplacing] = useState(false);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!settings || initializedRef.current) return;
    initializedRef.current = true;
    setAccessTokenSaved(settings.accessToken ?? "");
    setAccessTokenPending("");
    setAccessTokenReplacing(false);
  }, [settings]);

  const handleReplacingChange = (value: boolean) => {
    setAccessTokenReplacing(value);
    if (value) {
      setAccessTokenPending(accessTokenSaved);
    } else {
      setAccessTokenPending("");
    }
  };

  async function handleSave() {
    setStatus("saving");
    try {
      const accessTokenValue =
        accessTokenReplacing || !accessTokenSaved ? accessTokenPending : accessTokenSaved;
      await mergeAndSave({
        accessToken: accessTokenValue,
      });
      setAccessTokenSaved(accessTokenValue);
      setAccessTokenPending("");
      setAccessTokenReplacing(false);
      setStatus("saved");
      renderSuccessToast({
        title: "GitHub token saved",
        description: "Private access token has been updated.",
      });
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="flex max-w-5xl flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              className="text-left text-xs font-semibold tracking-wider uppercase"
              htmlFor="access-token"
            >
              GitHub Private Access Token
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="access-token"
                type={!accessTokenSaved || accessTokenReplacing ? "text" : "password"}
                value={
                  !accessTokenSaved || accessTokenReplacing ? accessTokenPending : accessTokenSaved
                }
                onChange={(e) => setAccessTokenPending(e.target.value)}
                disabled={!!accessTokenSaved && !accessTokenReplacing}
                placeholder={accessTokenReplacing ? "Enter new value" : undefined}
                className="flex-1 font-mono"
              />
              {accessTokenReplacing && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleReplacingChange(false)}
                  className="shrink-0 text-muted-foreground"
                >
                  Cancel
                </Button>
              )}
              {accessTokenSaved && !accessTokenReplacing ? (
                <Button
                  size="sm"
                  onClick={() => handleReplacingChange(true)}
                  disabled={!settings}
                  className="shrink-0"
                >
                  Replace
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={status === "saving" || !settings}
                  className="shrink-0"
                >
                  <SaveIcon className="size-3.5" />
                  {saveLabel(status)}
                </Button>
              )}
            </div>
            {status === "error" && (
              <p className="text-xs text-destructive">Failed to save. Please try again.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Allows Galacius to access &amp; download the app from a private source.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
