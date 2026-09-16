import { toast } from "../../atoms/toast";
import { TOAST_STYLE } from "./const";
import { ErrorToast, type ErrorToastProps } from "./ErrorToast";

export function renderErrorToast(props: ErrorToastProps) {
  toast.custom(
    (t) => (
      <ErrorToast
        {...props}
        action={
          props.action && {
            label: props.action.label,
            onClick: () => {
              toast.dismiss(t);
              props.action!.onClick();
            },
          }
        }
      />
    ),
    { style: TOAST_STYLE }
  );
}
