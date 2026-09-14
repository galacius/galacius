import { renderErrorToast } from "@galacius/design-system";
import { useEffect, useRef, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { IsResourceForbidden } from "@wailsjs/go/app/App";

interface UseCatchForbiddenResourceOptions {
  open?: boolean;
  resourceName?: string | null;
  resourceLabel?: string | null;
  onForbiddenDetected?: () => void;
  labelMap?: Record<string, string>;
  activeContext?: string;
  // Namespace of the specific resource this hook instance cares about (drawer
  // mode). A forbidden event/poll result for a different namespace is ignored,
  // so denying access in namespace B doesn't toast/close a drawer open on a
  // resource in namespace A. Omit for cluster-scoped resources.
  namespace?: string;
  // List-view (labelMap) mode only: namespaces currently being viewed (mirrors
  // the `activeNamespaces` cluster-wide config — empty/undefined means "all
  // namespaces"). Used by the mount/activeContext-change reconciliation poll so
  // it can check IsResourceForbidden per namespace instead of losing namespace
  // detail behind a single "forbidden anywhere" check.
  namespaces?: string[];
}

interface UseCatchForbiddenResourceResult {
  // Resource name -> set of namespaces it's known forbidden in ("" = cluster-wide
  // or "forbidden somewhere, namespace unknown" e.g. from the labelMap poll below).
  // A Map (not a plain Set<string>) so a revisit toast (see MainLayout's
  // handleSelectItem) can name the same namespace(s) the original live event did,
  // instead of falling back to a generic no-namespace message.
  forbiddenResources: Map<string, Set<string>>;
}

// Renders as "" for a cluster-wide denial (namespace === "") so toast copy doesn't
// claim a specific namespace when none was actually identified.
const namespaceSuffix = (namespace: string): string =>
  namespace ? ` in namespace "${namespace}"` : "";

// Same idea as namespaceSuffix, but for a resource's full set of known-forbidden
// namespaces (used when toasting from accumulated state rather than a single event).
export const formatForbiddenNamespaces = (namespaces: Set<string>): string => {
  if (namespaces.size === 0 || namespaces.has("")) return "";
  const list = Array.from(namespaces)
    .map((ns) => `"${ns}"`)
    .join(", ");
  return ` in namespace${namespaces.size > 1 ? "s" : ""} ${list}`;
};

export const useCatchForbiddenResource = (
  activeResource: string,
  options?: UseCatchForbiddenResourceOptions
): UseCatchForbiddenResourceResult => {
  const [forbiddenResources, setForbiddenResources] = useState<Map<string, Set<string>>>(new Map());
  const addForbiddenResource = (resource: string, namespace: string) => {
    setForbiddenResources((prev) => {
      const next = new Map(prev);
      const namespaces = new Set(next.get(resource));
      namespaces.add(namespace);
      next.set(resource, namespaces);
      return next;
    });
  };

  // Reset forbidden state when the drawer transitions from closed to open, or when
  // the active cluster context changes. Using the React-approved derived-state pattern
  // (setState during render with a prev-value guard) so the reset is synchronous,
  // before paint, with no extra effect.
  const [prevOpen, setPrevOpen] = useState(options?.open);
  if (options?.open !== prevOpen) {
    setPrevOpen(options?.open);
    if (options?.open) setForbiddenResources(new Map());
  }
  const [prevActiveContext, setPrevActiveContext] = useState(options?.activeContext);
  if (options?.activeContext !== prevActiveContext) {
    setPrevActiveContext(options?.activeContext);
    setForbiddenResources(new Map());
  }

  // Tracks whether a toast was already shown in the current open session to prevent
  // a double-toast race between the live Wails event path and the poll below.
  const drawerToastFiredRef = useRef(false);

  // Keep a single ref current so the Wails event handler always reads the latest values
  // without being re-subscribed on every render.
  const activeResourceRef = useRef(activeResource);
  const optionsRef = useRef(options);
  useEffect(() => {
    activeResourceRef.current = activeResource;
    optionsRef.current = options;
  });

  useEffect(() => {
    const unsub = EventsOn(
      "resource:forbidden",
      (payload: { resource: string; namespace: string }) => {
        const { resource, namespace } = payload;
        addForbiddenResource(resource, namespace);
        if (activeResourceRef.current !== resource) return;

        const opts = optionsRef.current;
        // A namespace-scoped forbidden event only applies to this hook instance
        // when it's cluster-wide (namespace === "") or matches the specific
        // namespace this instance cares about.
        const appliesToThisNamespace =
          namespace === "" || !opts?.namespace || opts.namespace === namespace;
        if (!appliesToThisNamespace) return;

        if (opts?.resourceName && opts?.open) {
          // Drawer mode: show per-resource "cannot get" toast and close the drawer
          drawerToastFiredRef.current = true;
          const label = opts.resourceLabel ?? activeResourceRef.current;
          renderErrorToast({
            title: `Access denied: cannot get ${label} "${opts.resourceName}"${namespaceSuffix(namespace)}`,
          });
          opts.onForbiddenDetected?.();
        } else if (opts?.labelMap) {
          // List-view mode: show "cannot list X" toast using labelMap
          const label = opts.labelMap[resource] ?? resource;
          renderErrorToast({
            title: `Access denied: cannot list ${label}${namespaceSuffix(namespace)}`,
          });
        }
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // On every open transition, check whether the resource is already forbidden in
  // the informer cache and show the drawer toast immediately (handles the case
  // where the 403 was received before the drawer was opened and won't be re-emitted).
  const open = options?.open;
  useEffect(() => {
    let cancelled = false;
    if (!open) {
      drawerToastFiredRef.current = false;
      return;
    }
    // Drawer mode only — no labelMap.
    const opts = optionsRef.current;
    if (!opts?.resourceName) return;

    IsResourceForbidden(activeResourceRef.current, opts.namespace ?? "").then((forbidden) => {
      if (cancelled || !forbidden) return;
      addForbiddenResource(activeResourceRef.current, opts.namespace ?? "");
      if (drawerToastFiredRef.current) return;
      const currentOpts = optionsRef.current;
      if (!currentOpts?.resourceName) return;
      drawerToastFiredRef.current = true;
      const label = currentOpts.resourceLabel ?? activeResourceRef.current;
      renderErrorToast({
        title: `Access denied: cannot get ${label} "${currentOpts.resourceName}"${namespaceSuffix(currentOpts.namespace ?? "")}`,
      });
      currentOpts.onForbiddenDetected?.();
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // List-view mode reconciliation: the live "resource:forbidden" event fires at
  // most once per resource for the lifetime of the backend's cluster connection
  // (see FactoryHandle.StopResource), but a frontend-only reload (e.g. Ctrl+R,
  // which remounts React without restarting the Go backend) resets
  // forbiddenResources to empty without a new event ever coming. Without this,
  // a resource forbidden before the reload would silently stop toasting/graying
  // out in the nav until the next full cluster reconnect. Poll each labelMap
  // resource's already-known state once on mount / activeContext change so a
  // pre-existing 403 is still reflected after a reload.
  const activeContext = options?.activeContext;
  useEffect(() => {
    const labelMap = optionsRef.current?.labelMap;
    if (!labelMap) return;
    let cancelled = false;
    // Viewing all namespaces: a resource forbidden anywhere applies, same as the
    // "any namespace" semantics of IsResourceForbidden(resource, ""). Viewing a
    // specific subset: check each one individually so the reconciled state (and
    // any toast built from it) can still name the actual namespace, matching
    // useCatchForbiddenResources' equivalent poll.
    const activeNamespaces = optionsRef.current?.namespaces ?? [];
    const namespacesToCheck = activeNamespaces.length > 0 ? activeNamespaces : [""];

    Promise.all(
      Object.keys(labelMap).flatMap((resource) =>
        namespacesToCheck.map(async (namespace) => {
          const forbidden = await IsResourceForbidden(resource, namespace);
          if (cancelled || !forbidden) return;
          addForbiddenResource(resource, namespace);
        })
      )
    );
    return () => {
      cancelled = true;
    };
  }, [activeContext]);

  return { forbiddenResources };
};
