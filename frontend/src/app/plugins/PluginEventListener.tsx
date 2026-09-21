import { FC } from "react";
import { usePluginEventListener } from "./hooks/registry/event/usePluginEventListener";

// Renders at the app root (before any cluster connection) to listen to plugin
// events and dispatch them to registered handlers. No cluster/tray dependencies.
export const PluginEventListener: FC = () => {
  usePluginEventListener();
  return null;
};
