import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { cn } from "../utils/common";

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerViewport({ className, ...props }: DrawerPrimitive.Viewport.Props) {
  return (
    <DrawerPrimitive.Viewport
      data-slot="drawer-viewport"
      className={cn(
        "z-overlay pointer-events-none fixed inset-0 flex flex-col items-stretch justify-end",
        className
      )}
      {...props}
    />
  );
}

function DrawerPopup({ className, ...props }: DrawerPrimitive.Popup.Props) {
  return (
    <DrawerPrimitive.Popup
      data-slot="drawer-popup"
      className={cn(
        "pointer-events-auto flex w-full flex-col border-t bg-background text-foreground shadow-[0_-4px_24px_rgba(0,0,0,0.15)] transition-[height] duration-150 ease-in-out data-ending-style:h-0 data-starting-style:h-0",
        className
      )}
      {...props}
    />
  );
}

function DrawerContent({ className, ...props }: DrawerPrimitive.Content.Props) {
  return (
    <DrawerPrimitive.Content
      data-slot="drawer-content"
      className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      {...props}
    />
  );
}

export { Drawer, DrawerContent, DrawerPopup, DrawerPortal, DrawerViewport };
