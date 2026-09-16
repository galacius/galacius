import { useMainLayoutContext } from "../../app/clusters/MainLayoutContext";
import { useGetNamespaces } from "../../app/clusters/modules/base/namespaces/hooks/data-access/useGetNamespaces";
import { useUnifiedTray } from "../../app/clusters/shared/components/trays/unified/UnifiedTrayContext";
import { useResourceLinks } from "../../app/clusters/shared/hooks/useResourceLinks";

/**
 * Cluster-scoped property values exposed to plugins. Valid only for
 * components rendered inside MainLayout's subtree.
 */
export function useExposeProperties() {
  const { activeContext, activeResource, namespaces: activeNamespaces } = useMainLayoutContext();

  const { data: availableNamespaces = [] } = useGetNamespaces(activeContext);
  const resourceLinks = useResourceLinks();
  const unifiedTray = useUnifiedTray();

  return {
    activeContext,
    activeNamespaces,
    activeResource,
    availableNamespaces,
    resourceLinks,
    unifiedTray,
  };
}
