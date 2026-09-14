import {
  Button,
  FormModal,
  MinusIcon,
  PlusIcon,
  Slider,
  TriangleAlertIcon,
  clamp,
} from "@galacius/design-system";
import { FC, useState } from "react";

interface DeploymentScaleModalProps {
  open: boolean;
  name: string;
  currentReplicas: number;
  isPending: boolean;
  onClose: () => void;
  onScale: (replicas: number) => void;
}

export const DeploymentScaleModal: FC<DeploymentScaleModalProps> = ({
  open,
  name,
  currentReplicas,
  isPending,
  onClose,
  onScale,
}) => {
  const [desired, setDesired] = useState(() => currentReplicas);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={
        <span className="flex gap-2">
          Scale Deployment:{" "}
          <span className="font-mono font-normal text-muted-foreground">{name}</span>
        </span>
      }
      isLoading={isPending}
      submitLabel="Scale"
      onSubmit={() => onScale(desired)}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Current replica scale:</span>
        <span className="font-mono">{currentReplicas}</span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span>Desired number of replicas:</span>
          <span className="font-mono font-medium">{desired}</span>
        </div>

        <div className="flex items-center gap-3">
          <Slider
            min={0}
            max={100}
            value={[desired]}
            onValueChange={(v) => setDesired(Array.isArray(v) ? v[0] : v)}
            aria-label="Desired replicas"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Decrease replicas"
            disabled={desired <= 0}
            onClick={() => setDesired(clamp(desired - 1, 0, 100))}
            className="shrink-0 rounded-full"
          >
            <MinusIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Increase replicas"
            disabled={desired >= 100}
            onClick={() => setDesired(clamp(desired + 1, 0, 100))}
            className="shrink-0 rounded-full"
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>

        {desired === 0 && (
          <div className="flex items-start gap-1.5 text-destructive">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            <span className="text-xs">
              ScalingIcon to 0 will take the deployment offline — all pods will be terminated
            </span>
          </div>
        )}
        {desired > 10 && (
          <div className="flex items-start gap-1.5 text-warning">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            <span className="text-xs">
              High number of replicas may cause cluster performance issues
            </span>
          </div>
        )}
      </div>
    </FormModal>
  );
};
