import { Button } from "../../atoms/button";
import { CircleCheckIcon } from "../../atoms/icon";

export interface SuccessToastProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ title, description, action }) => {
  return (
    <div className="flex w-full flex-col gap-1.5 rounded-(--radius) bg-success px-4 py-3 text-white shadow-lg">
      <div className="flex items-start gap-3">
        <CircleCheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="flex-1 text-sm font-semibold">{title}</p>
        {action && (
          <Button
            variant="outline"
            size="xs"
            className="shrink-0 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
      <p className="pl-7 text-xs opacity-90">{description}</p>
    </div>
  );
};
