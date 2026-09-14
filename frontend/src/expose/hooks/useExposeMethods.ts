import { useMainLayoutContext } from "../../app/clusters/MainLayoutContext";

/**
 * Cluster-scoped plain functions exposed to plugins. Valid only for
 * components rendered inside MainLayout's subtree.
 */
export function useExposeMethods() {
  const { onNavigateToView } = useMainLayoutContext();

  return {
    onNavigateToView,
  };
}
