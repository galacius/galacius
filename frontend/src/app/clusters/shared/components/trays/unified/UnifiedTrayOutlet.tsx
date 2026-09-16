import { FC } from "react";
import { UnifiedTrayShell, type UnifiedTrayShellProps } from "./UnifiedTrayShell";

export const UnifiedTrayOutlet: FC<UnifiedTrayShellProps> = ({ registry }) => {
  // Always mounted: Drawer's own `open` prop (driven by tabs.length) controls
  // the animated mount/unmount. Hard-unmounting here would remove the DOM
  // node instantly and skip Base UI's exit animation entirely.
  return <UnifiedTrayShell registry={registry} />;
};
