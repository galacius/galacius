import { toast } from "../../atoms/toast";
import { TOAST_STYLE } from "./const";
import { SuccessToast, type SuccessToastProps } from "./SuccessToast";

export function renderSuccessToast(props: SuccessToastProps) {
  toast.custom(
    (t) => (
      <SuccessToast
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
