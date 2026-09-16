import { renderErrorToast } from "@galacius/design-system";
import { useEffect, useMemo, useRef, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { IsResourceForbidden } from "@wailsjs/go/app/App";

interface UseCatchForbiddenResourcesOptions {
  labelMap: Record<string, string>;
  activeContext?: string;
  // Namespaces this dashboard is currently aggregating across (mirrors the
  // `activeNamespaces` cluster-wide config — empty/undefined means "all
  // namespaces"). A forbidden event/poll result for a namespace outside this
  // set is ignored, so denying a resource in a namespace the user isn't even
  // viewing doesn't toast here.
  namespaces?: string[];
}

interface UseCatchForbiddenResourcesResult {
  forbiddenResources: Set<string>;
}

// Renders as "" for a cluster-wide denial (namespace === "") so toast copy doesn't
// claim a specific namespace when none was actually identified.
const namespaceSuffix = (namespace: string): string =>
  namespace ? ` in namespace "${namespace}"` : "";

// A forbidden namespace applies to this hook instance when it's cluster-wide
// (namespace === ""), when the dashboard is viewing all namespaces (activeNamespaces
// empty), or when it's one of the specific namespaces being aggregated.
const appliesToActiveNamespaces = (namespace: string, activeNamespaces: string[]): boolean =>
  namespace === "" || activeNamespaces.length === 0 || activeNamespaces.includes(namespace);

// For a caller that depends on several resource kinds at once (e.g. a dashboard
// aggregating pods/deployments/jobs summaries), rather than a single resource
// list view — see useCatchForbiddenResource for the single-resource case.
export const useCatchForbiddenResources = (
  activeResources: string[],
  options: UseCatchForbiddenResourcesOptions
): UseCatchForbiddenResourcesResult => {
  const [forbiddenResources, setForbiddenResources] = useState<Set<string>>(new Set());

  const normalizedResources = useMemo(() => new Set(activeResources), [activeResources]);

  // Reset forbidden state when the active cluster context changes.
  const [prevActiveContext, setPrevActiveContext] = useState(options.activeContext);
  if (options.activeContext !== prevActiveContext) {
    setPrevActiveContext(options.activeContext);
    setForbiddenResources(new Set());
  }

  // Tracks which resources already toasted (from either the mount-time poll or a
  // live event) to prevent a double-toast race between the two paths.
  const toastFiredRef = useRef(new Set<string>());

  // Keep refs current so the Wails event handler always reads the latest values
  // without being re-subscribed on every render.
  const activeResourcesRef = useRef(normalizedResources);
  const optionsRef = useRef(options);
  useEffect(() => {
    activeResourcesRef.current = normalizedResources;
    optionsRef.current = options;
  });

  useEffect(() => {
    const unsub = EventsOn(
      "resource:forbidden",
      (payload: { resource: string; namespace: string }) => {
        const { resource, namespace } = payload;
        setForbiddenResources((prev) => new Set([...prev, resource]));
        if (!activeResourcesRef.current.has(resource)) return;
        if (!appliesToActiveNamespaces(namespace, optionsRef.current.namespaces ?? [])) return;
        if (toastFiredRef.current.has(resource)) return;

        toastFiredRef.current.add(resource);
        const label = optionsRef.current.labelMap[resource] ?? resource;
        renderErrorToast({
          title: `Access denied: cannot list ${label}${namespaceSuffix(namespace)}`,
        });
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // On mount, check which of the watched resources are already forbidden in the
  // informer cache (handles a 403 received before this hook mounted, which won't
  // be re-emitted as an event).
  useEffect(() => {
    let cancelled = false;
    const opts = optionsRef.current;
    const activeNamespaces = opts.namespaces ?? [];
    // Viewing all namespaces: a resource forbidden anywhere applies, same as the
    // "any namespace" semantics of IsResourceForbidden(resource, ""). Viewing a
    // specific subset: check each one individually so a denial in a namespace
    // outside that subset doesn't false-positive the toast.
    const namespacesToCheck = activeNamespaces.length > 0 ? activeNamespaces : [""];

    const promises = Array.from(activeResourcesRef.current).flatMap((resource) =>
      namespacesToCheck.map(async (namespace) => {
        const forbidden = await IsResourceForbidden(resource, namespace);
        if (cancelled || !forbidden) return;

        setForbiddenResources((prev) => new Set([...prev, resource]));
        if (toastFiredRef.current.has(resource)) return;
        toastFiredRef.current.add(resource);
        const label = opts.labelMap[resource] ?? resource;
        renderErrorToast({
          title: `Access denied: cannot list ${label}${namespaceSuffix(namespace)}`,
        });
      })
    );

    Promise.all(promises);
    return () => {
      cancelled = true;
    };
  }, []);

  return { forbiddenResources };
};
