import { Button, Input, renderSuccessToast, SaveIcon, Switch } from "@galacius/design-system";
import { FC, useEffect, useRef, useState } from "react";
import { useGetSettings } from "../hooks/data-access/useGetSettings";
import { useMergeSettingsOnSave } from "../hooks/useMergeSettingsOnSave";
import { saveLabel, useSectionSaveState } from "../hooks/useSectionSaveState";

const DEFAULT_HEALTH_CHECK_INTERVAL_SECONDS = 10;

export const ProxyContent: FC = () => {
  const { data: settings } = useGetSettings();
  const mergeAndSave = useMergeSettingsOnSave();

  const [intervalStatus, setIntervalStatus] = useSectionSaveState();
  const [healthCheckInterval, setHealthCheckInterval] = useState(
    String(DEFAULT_HEALTH_CHECK_INTERVAL_SECONDS)
  );

  const initializedRef = useRef(false);

  const proxySetupEnabled = settings?.proxySetupEnabled ?? false;

  useEffect(() => {
    if (!settings || initializedRef.current) return;
    initializedRef.current = true;
    setHealthCheckInterval(
      String(settings.proxyHealthCheckIntervalSeconds || DEFAULT_HEALTH_CHECK_INTERVAL_SECONDS)
    );
  }, [settings]);

  function handleToggleEnabled(checked: boolean) {
    mergeAndSave({ proxySetupEnabled: checked }).then(() => {
      renderSuccessToast({
        title: checked ? "Proxy setup enabled" : "Proxy setup disabled",
        description: checked
          ? "Cluster connects will run each cluster's configured setup command."
          : "Cluster connects will skip proxy setup commands entirely.",
      });
    });
  }

  async function handleSaveInterval() {
    const seconds = Number(healthCheckInterval);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      setIntervalStatus("error");
      return;
    }

    setIntervalStatus("saving");
    try {
      await mergeAndSave({ proxyHealthCheckIntervalSeconds: seconds });
      setIntervalStatus("saved");
      renderSuccessToast({
        title: "Health check interval saved",
        description: `Proxy status will be re-checked every ${seconds}s while connected.`,
      });
    } catch {
      setIntervalStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-lg flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="proxy-setup-enabled"
              className="text-left text-xs font-semibold tracking-wider uppercase"
            >
              Proxy Setup
            </label>
            <p className="text-sm text-muted-foreground">
              Run a cluster's configured setup command before connecting.
            </p>
          </div>
          <Switch
            id="proxy-setup-enabled"
            checked={proxySetupEnabled}
            onCheckedChange={handleToggleEnabled}
            aria-label="Enable proxy setup"
          />
        </div>
      </div>

      <div className="flex max-w-lg flex-col gap-2">
        <label
          htmlFor="proxy-health-check-interval"
          className="text-left text-xs font-semibold tracking-wider uppercase"
        >
          Health Check Interval (seconds)
        </label>
        <p className="text-sm text-muted-foreground">
          How often a connected proxy's port is re-checked to catch a tunnel that died silently.
        </p>
        <div className="flex items-center gap-2">
          <Input
            id="proxy-health-check-interval"
            type="number"
            min={1}
            value={healthCheckInterval}
            onChange={(e) => setHealthCheckInterval(e.target.value)}
            disabled={!proxySetupEnabled}
            className="w-32"
          />
          <Button
            size="sm"
            onClick={handleSaveInterval}
            disabled={intervalStatus === "saving" || !settings || !proxySetupEnabled}
          >
            <SaveIcon className="size-3.5" />
            {saveLabel(intervalStatus)}
          </Button>
        </div>
        {intervalStatus === "error" && (
          <p className="text-xs text-destructive">
            Enter a whole number of seconds greater than 0.
          </p>
        )}
      </div>
    </div>
  );
};
