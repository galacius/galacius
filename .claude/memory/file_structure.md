---
name: file-structure
description: galacius full project file structure with per-file annotations for Go backend and React frontend
metadata:
  node_type: memory
  type: project
  originSessionId: 4c9d20f2-fae5-4639-a340-3b791fa9bae3
  modified: 2026-08-29T00:00:00.000Z
---

```text
/main.go              # Wails app entry; loads .env via godotenv, builds menu; binds ONLY *App to Wails (bindList := []any{a}). No Helm/plugin-specific wiring — every plugin (including Helm) is discovered/installed at runtime, reached over plain HTTP via App.GetPluginBackendAddr(pluginID) for business logic, never compiled in. Built-in in-process Helm (DisableBuiltinHelm/GALACIUS_DISABLE_BUILTIN_HELM, helmgo import, plugin.NewInProcessLoader) was fully removed 2026-08-01 — see [[gotcha_generic_plugin_grpc_boundary]]. The old App.InvokePlugin(pluginID, method, payloadJSON) unary-RPC entry point (and plugin_invoke.go) is GONE as of the 2026-08-27 native-gRPC-pub/sub rewrite (commit 29629aa) — see the internal/app/plugin.go and internal/api/grpc/ notes below
/version.go           # var Version = version.Dev (was hardcoded "dev" literal; refactored 2026-07-27 to import internal/version so the dev-build sentinel has one source of truth shared with internal/plugin/download.go's IsHostVersionCompatible)
/go.mod               # module github.com/galacius/galacius (root/main module); no longer requires or replaces github.com/galacius/galacius/plugins/helm (that require+replace was removed 2026-08-01 along with built-in Helm — plugins/helm is a fully standalone module now, root module has zero knowledge of it, see [[gotcha_generic_plugin_grpc_boundary]])
/go.sum
/wails.json           # Wails project config (uses pnpm)
/package.json         # pnpm workspace root (private)
/pnpm-workspace.yaml  # declares frontend/, design-system as workspace packages
/pnpm-lock.yaml       # lockfile (committed)
# /plugins/helm/ REMOVED (2026-08-10): the standalone Helm plugin Go module + its frontend package
# (@galacius/helm-plugin-frontend) were deleted along with every reference to them — workspace
# config, root package.json build/test scripts, CI/CD workflow jobs, vite.config.ts alias,
# .gitignore entries. The generic plugin host (internal/plugin, marketplace UI, unified tray
# plugin registry) is untouched and still generic; no plugin currently ships. See
# [[gotcha_generic_plugin_grpc_boundary]] for the earlier built-in-Helm removal this followed.
/.env                 # build-time env vars (git-ignored); INSTALL_SCRIPT_URL
/.env.example         # template for .env
/.github/workflows/
  react-doctor.yml    # React quality gate on every PR
/scripts/
  build.sh            # wails build + macOS ad-hoc codesign
  install.sh          # curl-pipe-sh installer (Linux + macOS, version-aware)
  uninstall.sh        # removes binary + desktop entry
/build/
  appicon.png
  darwin/iconfile.icns
  windows/icon.ico
/frontend/
  index.html            # Vite HTML entry; carries <script type="importmap"> resolving react/react-dom/react-jsx-runtime/@galacius/design-system/@tanstack/react-query bare specifiers to /vendor/*.js for dynamically-imported plugin bundles
  /public/
    /vendor/            # NEW 2026-07-27, extended 2026-07-28: raw ESM shims (untouched by Vite bundling, copied verbatim to dist/) re-exporting host singletons from window.__GALACIUS_VENDOR__ so plugin bundles (built with react/react-dom/@galacius/design-system/@tanstack/react-query as tsup `external`) resolve bare imports against the host's own module instances instead of a second bundled copy
      react.js            # shim for "react" — re-exports React's stable named API off window.__GALACIUS_VENDOR__.react
      react-dom.js        # shim for "react-dom"
      react-jsx-runtime.js  # shim for "react/jsx-runtime" (jsx, jsxs, Fragment)
      /galacius/
        design-system.js   # shim for "@galacius/design-system"; export list generated via `Object.keys()` on the built package — regenerate when design-system's public API changes
        core.js             # shim for "@galacius/core"; re-exports off window.__GALACIUS_VENDOR__.core, populated by frontend/src/expose/index.tsx — see that file below for the createPluginBridge pass-through exception
      /tanstack/
        react-query.js      # NEW 2026-07-28: shim for "@tanstack/react-query"; needed because tsup auto-externalizes anything listed in a plugin's package.json `dependencies` (not just its explicit `external` array), and QueryClientProvider/useQuery need the SAME module instance as the host to resolve their Context — see [[gotcha_plugin_bare_specifier_import_map]]
  /src/
    main.tsx            # app root entry point; renders React App component; also stashes React/ReactDOM/jsx-runtime/design-system/react-query singletons on window.__GALACIUS_VENDOR__ before render, for the vendor shims above to consume
    /expose/
      index.tsx           # populates window.__GALACIUS_VENDOR__.core (clusterWideAPI/appWideAPI/createPluginBridge/reactQuery) before any plugin bundle is dynamically imported — the host-side implementations that back @galacius/core's otherwise-throwing type-stub exports. NEW 2026-08-29: createPluginBridge (from @galacius/core itself, packages/core/frontend/src/api/frontendBridgeAPI.ts) is wired here too, but only as a straight pass-through — unlike clusterWideAPI/appWideAPI it has no separate host-side override, since it's a real self-contained implementation living in @galacius/core, not a stub
    test-setup.ts       # test environment setup (globals, mocks); also mocks window.__GALACIUS_VENDOR__ (incl. reactQuery) for jsdom tests
    /__mocks__/         # Jest mock definitions for Wails bindings + runtime
      /wailsjs/
        /go/
          /app/
            App.ts      # mocked App methods (Go bindings)
          models.ts     # mocked Wails models
        /runtime/
          runtime.ts    # mocked Wails runtime
  /wailsjs/             # Wails auto-generated TypeScript bindings (regenerated via `wails generate module` after Go changes)
    /go/
      /app/
        App.d.ts        # *App methods bound to Wails (auto-generated)
        App.js          # runtime implementation
      # /helm/ Wails bindings REMOVED (2026-08-10) along with the rest of the Helm plugin — helm.Service
      # is gone, no in-process Helm bindings remain
      models.ts         # Wails DTO model definitions (auto-generated)
    /api/               # STALE PATH as of 2026-07-25 review: this dir no longer exists on disk — contents (resources.ts/api.const.ts/api.ts) moved to /app/shared/api/ (see below). Left here as historical note until the /hooks/data-access/ list further down (which still refers to "src/hooks/data-access/") is fully swept per its own stale-note at line ~85.
      resources.ts      # (now at /app/shared/api/resources.ts) TypeScript type interfaces + re-exports list functions (7 workloads resources' types/bindings/query-keys moved out to modules/workloads/<resource>/api/ 2026-07-21)
      api.const.ts      # (now at /app/shared/api/api.const.ts) query key constants only (workloads resources' keys moved out 2026-07-21)
      api.ts             # (now at /app/shared/api/api.ts) DEFAULT_QUERY_OPTIONS (refetchOnWindowFocus: false, retry: false, placeholderData: keepPreviousData); RESTORED HERE 2026-07-20 (event-performance fix commit `1a9b843a`) — previously lived at design-system/utils/api.ts (2026-07-13–2026-07-20), that file was deleted; consumers import via `@/app/shared/api/api` (confirmed used by frontend/src/app/marketplace/hooks/* and frontend/src/app/clusters/plugins/hooks/* as of 2026-07-31, was frontend/src/app/plugins/hooks/* pre-2026-07-31 rename), not the design-system barrel
    /hooks/             # DELETED 2026-07-22 — moved wholesale to /app/shared/hooks/ (see [[gotcha_src_hooks_to_app_shared_hooks_move]]); usePodLogs/usePodExec/useResourceLinks had already moved elsewhere earlier (usePodLogs/usePodExec into workloads/pods/hooks/, useResourceLinks into clusters/shared/hooks/ per [[gotcha_use_resource_links_move]]) so only 4 files made this final move
    /app/shared/hooks/  # app-wide shared hooks (distinct from /app/clusters/shared/hooks/, which is cluster-scoped only — see [[gotcha_src_hooks_to_app_shared_hooks_move]])
      useConnect.ts      # cluster connection lifecycle
      # useListenAllResourceEvents.ts DELETED 2026-07-20 (commit `1a9b843a "fix: fix event performance issues"`) — the whole global cache-write architecture it anchored was replaced app-wide; see below and [[pattern_resource_update_events_hook]]
      /async-events/
        useCatchForbiddenResources.tsx  # subscribes to resource:forbidden Wails events; returns Set<string> of forbidden resource keys; shows toast when navigating to or already on a forbidden view; moved here 2026-07-22 (from app/shared/hooks/ to topical subfolder; 36 consumer import paths updated)
        useKubeconfigChangedEvents.ts  # subscribes to "kubeconfig:changed" Wails event, self-contained (owns useQueryClient + invalidates QUERY_KEY_CONTEXTS_GROUPED internally, no callback param); extracted from App.tsx 2026-07-20, removed now-unused EventsOn import from App.tsx
        usePluginsChangedEvents.ts     # NEW 2026-08-01: subscribes to "plugins:changed" Wails event emitted by SaveSettings when PluginsDir changes; invalidates ["installed-plugins"] and ["plugin-status"] query keys to force frontend refresh; mirrors useKubeconfigChangedEvents structure
        /__tests__/
          useCatchForbiddenResources.test.ts  # moved 2026-07-22 (formerly app/shared/hooks/__tests__/useCatchForbiddenResources.test.ts); 12 test cases covering drawer/list-view modes, forbidden-state accumulation
      /data-access/
        useGetContextsGrouped.ts  # fetch all contexts grouped for cluster switcher
    # NOTE: useConnectStatusEvents.ts and useMenuOpenSettingsEvents.ts live elsewhere (clusters/shared/hooks/ and app/ respectively) — not part of this shared/hooks dir; the giant /data-access/ list below (useGetClusterRoleBindings.ts etc.) reflects an OLDER src/hooks/data-access/ layout that no longer exists — those per-resource hooks now live under clusters/modules/<resource>/hooks/data-access/, not here. Left below for reference until fully swept.
        useXxxUpdateEvents.ts (one per resource, ~32 total incl. useWarningEventsUpdateEvents) # REWRITTEN 2026-07-20 (commit `1a9b843a`) into the "local-merge" pattern: each is now a pure data hook — `useState` + `EventsOn("<resource>:update", setLatest)` in a `useEffect`, NO `queryClient` access, defaults to `[]`. Called directly (and only) from the data-access hooks that need live updates (list/detail/YAML), which merge the pushed data over their own `useQuery` result locally via `useMemo`. Mutation hooks (delete/bulk-delete/update-YAML) now own their own `invalidateQueries` calls again since no global hook does it for them. See [[pattern_resource_update_events_hook]] for the full pattern writeup (Pods reference implementation) — rolled out to effectively all resources in this one commit, not a partial batch
      /data-access/      # all useGet* hooks (90+ files); one hook per K8s resource type + detail; list + detail combos
        useGetActiveKubeconfigPaths.ts
        useGetClusterProxy.ts  # fetch per-context ClusterProxy (httpProxy); extracted from ClusterSettingsModal imperative call
        useGetClusterRoleBindingDetail.ts
        useGetClusterRoleBindingYAML.ts
        useGetClusterRoleBindings.ts
        useGetClusterRoleDetail.ts
        useGetClusterRoleYAML.ts
        useGetClusterRoles.ts
        useGetConfigMapDetail.ts
        useGetConfigMapYAML.ts
        useGetConfigMaps.ts
        useGetContextKubeconfigPath.ts  # resolve kubeconfig path for a context
        useGetContextsGrouped.ts  # fetch all contexts grouped for cluster switcher
        useGetCronJobDetail.ts
        useGetCronJobYAML.ts
        useGetCronJobs.ts
        useGetDaemonSetDetail.ts
        useGetDaemonSetYAML.ts
        useGetDaemonSets.ts
        useGetDefaultShell.ts  # get shell path for terminal default
        useGetDeploymentDetail.ts
        useGetDeploymentYAML.ts
        useGetDeployments.ts
        useGetEndpointDetail.ts
        useGetEndpointSliceByName.ts
        useGetEndpointSliceYAML.ts
        useGetEndpointSlices.ts
        useGetEndpointYAML.ts
        useGetEndpoints.ts
        useGetEventDetail.ts
        useGetEvents.ts
        useGetHPADetail.ts
        useGetHPAYAML.ts
        useGetHPAs.ts
        useGetIngressClassDetail.ts
        useGetIngressClassYAML.ts
        useGetIngressClasses.ts
        useGetIngressDetail.ts
        useGetIngressYAML.ts
        useGetIngresses.ts
        useGetJobDetail.ts
        useGetJobYAML.ts
        useGetJobs.ts
        useGetLeaseByName.ts
        useGetLeaseYAML.ts
        useGetLeases.ts
        useGetLimitRangeDetail.ts
        useGetLimitRangeYAML.ts
        useGetLimitRanges.ts
        useGetNamespaceDetail.ts
        useGetNamespaceNames.ts
        useGetNamespaceYAML.ts
        useGetNamespaces.ts
        useGetNetworkPolicies.ts
        useGetNetworkPolicyDetail.ts
        useGetNetworkPolicyYAML.ts
        useGetNodeDetail.ts
        useGetNodeYAML.ts
        useGetNodes.ts
        useGetPDBYAML.ts
        useGetPersistentVolumeByName.ts
        useGetPersistentVolumeClaimDetail.ts
        useGetPersistentVolumeClaimYAML.ts
        useGetPersistentVolumeClaims.ts
        useGetPersistentVolumeYAML.ts
        useGetPersistentVolumes.ts
        useGetPodDetail.ts
        useGetPodDisruptionBudgetDetail.ts
        useGetPodDisruptionBudgets.ts
        useGetPodYAML.ts
        useGetPods.ts
        useGetPortForwards.ts
        useGetPriorityClassByName.ts
        useGetPriorityClassYAML.ts
        useGetPriorityClasses.ts
        useGetWarningEvents.ts
        useGetReplicaSetDetail.ts
        useGetReplicaSetYAML.ts
        useGetReplicaSets.ts
        useGetResourceQuotaDetail.ts
        useGetResourceQuotaYAML.ts
        useGetResourceQuotas.ts
        useGetRoleBindingDetail.ts
        useGetRoleBindingYAML.ts
        useGetRoleBindings.ts
        useGetRoleDetail.ts
        useGetRoleYAML.ts
        useGetRoles.ts
        useGetSecretDetail.ts
        useGetSecretYAML.ts
        useGetSecrets.ts
        useGetServiceAccountDetail.ts
        useGetServiceAccountYAML.ts
        useGetServiceAccounts.ts
        useGetServiceDetail.ts
        useGetServiceYAML.ts
        useGetServices.ts
        useGetSettings.ts
        useGetStatefulSetDetail.ts
        useGetStatefulSetYAML.ts
        useGetStatefulSets.ts
        useGetStorageClassByName.ts
        useGetStorageClassYAML.ts
        useGetStorageClasses.ts
        useGetValidatingWebhookConfigDetail.ts
        useGetValidatingWebhookConfigYAML.ts
        useGetValidatingWebhookConfigs.ts
      /data-mutation/     # all useMutation hooks: create, update, delete (single & bulk), restart, scale, settings
        useCordonNode.ts  # Node cordon (Spec.Unschedulable=true)
        useCreateLimitRange.ts
        useCreateNamespace.ts
        useCreateResourceQuota.ts
        useDeleteClusterRole.ts
        useDeleteClusterRoleBinding.ts
        useDeleteClusterRoleBindings.ts  # bulk delete
        useDeleteClusterRoles.ts  # bulk delete
        useDeleteConfigMap.ts
        useDeleteConfigMaps.ts  # bulk delete
        useDeleteCronJob.ts
        useDeleteCronJobs.ts  # bulk delete
        useDeleteDaemonSet.ts
        useDeleteDaemonSets.ts  # bulk delete
        useDeleteDeployment.ts
        useDeleteDeployments.ts  # bulk delete
        useDeleteEndpoint.ts
        useDeleteEndpointSlice.ts
        useDeleteEndpointSlices.ts  # bulk delete
        useDeleteEndpoints.ts  # bulk delete
        useDeleteHPA.ts
        useDeleteHPAs.ts  # bulk delete
        useDeleteIngress.ts
        useDeleteIngressClass.ts
        useDeleteIngressClasses.ts  # bulk delete
        useDeleteIngresses.ts  # bulk delete
        useDeleteJob.ts
        useDeleteJobs.ts  # bulk delete
        useDeleteLease.ts
        useDeleteLeases.ts  # bulk delete
        useDeleteLimitRange.ts
        useDeleteLimitRanges.ts  # bulk delete
        useDeleteNamespace.ts
        useDeleteNamespaces.ts  # bulk delete (cluster-scoped)
        useDeleteNetworkPolicies.ts  # bulk delete
        useDeleteNetworkPolicy.ts
        useDeleteNode.ts
        useDeleteNodes.ts  # bulk delete (cluster-scoped)
        useDeletePersistentVolume.ts
        useDeletePersistentVolumeClaim.ts
        useDeletePersistentVolumeClaims.ts  # bulk delete
        useDeletePersistentVolumes.ts  # bulk delete
        useDeletePod.ts
        useDeletePodDisruptionBudget.ts
        useDeletePodDisruptionBudgets.ts  # bulk delete
        useDeletePods.ts  # bulk delete
        useDeletePriorityClass.ts
        useDeletePriorityClasses.ts  # bulk delete
        useDeleteReplicaSet.ts
        useDeleteReplicaSets.ts  # bulk delete
        useDeleteResourceQuota.ts
        useDeleteResourceQuotas.ts  # bulk delete
        useDeleteRole.ts
        useDeleteRoleBinding.ts
        useDeleteRoleBindings.ts  # bulk delete
        useDeleteRoles.ts  # bulk delete
        useDeleteSecret.ts
        useDeleteSecrets.ts  # bulk delete
        useDeleteService.ts
        useDeleteServices.ts  # bulk delete
        useDeleteStatefulSet.ts
        useDeleteStatefulSets.ts  # bulk delete
        useDeleteStorageClass.ts
        useDeleteStorageClasses.ts  # bulk delete
        useDeleteValidatingWebhookConfig.ts
        useDeleteValidatingWebhookConfigs.ts  # bulk delete
        useDrainNode.ts  # cordon + best-effort pod eviction (policy/v1 Eviction API, skips DaemonSet/mirror/terminal pods)
        usePickKubeconfigPath.tsx  # native file-picker dialog for kubeconfig path; extracted from K8sContent imperative call
        useRestartDaemonSet.ts
        useRestartDeployment.ts
        useSaveClusterProxy.tsx  # save per-context ClusterProxy; extracted from ClusterSettingsModal imperative call
        useSaveKubeconfigPaths.ts
        useSaveLocaleTimezone.ts
        useSaveSettings.tsx  # save general app Settings (config.Settings) to ~/.galacius/settings.json (CHANGED 2026-08-11 from ~/.config/galacius/settings.json, see [[gotcha_app_data_dir_migration_to_galacius]]), invalidates QUERY_KEY_SETTINGS
        useScaleDeployment.ts
        useScaleReplicaSet.ts
        useSetIngressClassAsDefault.ts
        useUncordonNode.ts  # Node uncordon (Spec.Unschedulable=false)
        useUnsetIngressClassAsDefault.ts
        useUpdateClusterRoleBindingYAML.ts
        useUpdateClusterRoleYAML.ts
        useUpdateConfigMap.ts
        useUpdateConfigMapYAML.ts
        useUpdateCronJobYAML.ts
        useUpdateDaemonSetYAML.ts
        useUpdateDeploymentYAML.ts
        useUpdateEndpointSliceYAML.ts
        useUpdateEndpointYAML.ts
        useUpdateHPAYAML.ts
        useUpdateIngressClassYAML.ts
        useUpdateIngressYAML.ts
        useUpdateJobYAML.ts
        useUpdateLeaseYAML.ts
        useUpdateLimitRangeYAML.ts
        useUpdateNamespaceYAML.ts
        useUpdateNetworkPolicyYAML.ts
        useUpdateNodeYAML.ts
        useUpdatePDBYAML.ts
        useUpdatePersistentVolumeClaimYAML.ts
        useUpdatePersistentVolumeYAML.ts
        useUpdatePodYAML.ts
        useUpdatePriorityClassYAML.ts
        useUpdateReplicaSetYAML.ts
        useUpdateResourceQuotaYAML.ts
        useUpdateRoleBindingYAML.ts
        useUpdateRoleYAML.ts
        useUpdateSecret.ts
        useUpdateSecretYAML.ts
        useUpdateServiceAccountYAML.ts
        useUpdateServiceYAML.ts
        useUpdateStatefulSetYAML.ts
        useUpdateStorageClassYAML.ts
        useUpdateValidatingWebhookConfigYAML.ts
    /design-system/         # CORRECTION (2026-07-25 review): despite the indentation here (inherited from this doc's history), this is NOT frontend/src/design-system/ — it's the repo-root workspace package /design-system/src/ (published as @galacius/design-system, pnpm workspace:* dependency of frontend; see /design-system/package.json, /pnpm-workspace.yaml). Mentally read every path below as /design-system/src/<path>, not frontend/src/design-system/<path>. UI foundation: atoms (shadcn), components (composite/business-logic), utilities, types
      README.md           # npm package documentation (external-use focused): Version Compatible table (react/tailwindcss/module/TS support), npm/pnpm installation, Tailwind v4 setup, usage examples per export subpath, publishing workflow (2026-07-14)
      index.ts            # root barrel: export * from "./atoms" (only atoms re-exported at package root "." export)
      styles.ts            # side-effect-only import "./style.css"; backs the "./styles" export subpath
      style.css             # Tailwind v4 base styles (radius scale, @layer base, focus-ring/shadow/z-index utilities); @imports styles.typography.css/styles.animation.css/styles.palette.css near top; also served via "./styles.css" export (2026-07-16 split: font/color/typography/animation tokens moved out into the sibling partials below)
      styles.typography.css  # NEW 2026-07-16: @fontsource-variable/geist import + @theme inline font vars (--font-heading/--font-sans) + typography-scale utility classes (.text-h1/-h2/-h3/-body/-caption/-label + semantic aliases); imported by style.css
      styles.animation.css   # NEW 2026-07-16: transition utility classes (.transition-interactive/-theme/-fade/-focus/-height, all duration-150); imported by style.css
      styles.palette.css     # NEW 2026-07-16: color @theme inline --color-* mappings + full :root/.dark color-token value blocks (background/foreground/primary/destructive/success/warning/info/danger/chart-*/sidebar-* etc); imported by style.css
      test-setup.ts         # vitest setup file (jest-dom matchers) referenced by vitest.config.ts
      /atoms/             # shadcn-ui primitives + styling variants (auto-generated via shadcn CLI)
        badge.tsx, button.tsx, button.variants.ts, checkbox.tsx, collapsible.tsx, context-menu.tsx, dialog.tsx, dropdown-menu.tsx, input.tsx, scroll-area.tsx, select.tsx, separator.tsx, sheet.tsx, slider.tsx, sonner.tsx, switch.tsx, table.tsx, tabs.tsx, textarea.tsx, textarea.variants.ts, toast.ts, tooltip.tsx
        toast.ts             # NEW 2026-07-19: `export { toast } from "sonner"` only — split out of sonner.tsx so that file exports only the Toaster component (react-doctor only-export-components fix); consumers import toast from here, not sonner.tsx
        collapsible.tsx     # NEW 2026-07-16: Collapsible/CollapsibleTrigger/CollapsiblePanel wrapping @base-ui/react/collapsible; Panel animates real content height via --collapsible-panel-height CSS var (no max-height guess), data-starting-style/data-ending-style→h-0; used by NavSidebar for resource-group expand/collapse
      /components/        # composite components (non-reusable atoms, business logic, resource-specific CTAs + modals + drawers + trays)
        ErrorBoundary.tsx   # class component; wraps App.tsx and Suspense content; renders error message + stack
        AnnotationBadge.tsx   # reusable badge for labels/annotations (k=v text, truncate+tooltip option)
        ManagedFieldBlock.tsx # collapsible block for single ManagedField (manager:operation + YAML code block)
        Donut.tsx             # SVG donut ring chart (label, total, running)
        ResourceCell.tsx    # progress-bar + label cell for CPU/Memory/Disk usage
        ResourceLink.tsx    # link-styled component; onClick→clickable span, else plain span; cross-resource navigation
        Divider.tsx  # horizontal divider
        LoadingSpinner.tsx  # animated loading spinner with optional label
        /toasts/            # sonner-backed toast components; has index.ts barrel
          index.ts  # re-exports SuccessToast/ErrorToast (components) + renderSuccessToast/renderErrorToast (functions) + TOAST_STYLE from separate sibling files
          SuccessToast.tsx / ErrorToast.tsx  # component-only files (title/description/action JSX)
          renderSuccessToast.tsx / renderErrorToast.tsx  # NEW 2026-07-19: split out of SuccessToast.tsx/ErrorToast.tsx — each holds the `render*Toast()` function that calls `toast.custom(...)`; kept as sibling files, not inline in the component file, so react-doctor's only-export-components rule doesn't fire (component file must export only components)
          const.ts  # TOAST_STYLE constant
        /buttons/         # CTA buttons (resource-specific, reusable across list/detail); has index.ts barrel
          index.ts  # re-exports all files in this folder; imported by components/index.ts as "./buttons"
          ButtonGroup.tsx  # visual grouping wrapper for adjacent buttons (rounded end-caps, negative-margin border collapse); moved from components/ root
          ResourceModificationButton.tsx  # dual-mode edit CTA (menu-item|icon-button); Pencil icon
          ResourceDeletionButton.tsx      # dual-mode delete CTA; Trash2 icon
          ResourceRestartButton.tsx       # dual-mode restart CTA; RefreshCw icon
          ResourceScaleButton.tsx         # dual-mode scale CTA; Scaling icon; isNotAllowed+notAllowedReason props for ownership tooltip
          ResourceBulkDeletionButton.tsx  # circular destructive button with count badge
          ResourceCreationButton.tsx      # circular + plus button; list-view create toolbars
        /inputs/          # input-related composite components; has index.ts barrel
          index.ts  # re-exports SearchInput + TimezoneSelect
          SearchInput.tsx   # reusable search input with icon and customizable wrapper class (used in list-view search bars)
          TimezoneSelect.tsx  # timezone selector with search (moved from components/ root)
        /drawers/         # drawer wrapper (generic detail drawer shell); has index.ts barrel
          index.ts  # re-exports ResourceDetailDrawer
          ResourceDetailDrawer.tsx  # generic drawer layout (header + tabs/content)
        /modals/          # modal utilities; has index.ts barrel
          index.ts  # re-exports ConfirmationModal + FormModal
          ConfirmationModal.tsx  # reusable confirmation dialog (title, description, confirmText, onConfirm, isLoading)
          FormModal.tsx     # form-oriented modal variant (title, children as form fields, onSubmit callback, size prop for width); 5 modals migrated (DeploymentScale, ReplicaSetScale, NamespaceCreation, ResourceQuotaCreation, LimitRangeCreation)
        /tables/          # table-related composite components; has index.ts barrel
          index.ts  # re-exports TableSkeletonLoader + TableSkeletonRow
          TableSkeletonLoader.tsx
          TableSkeletonRow.tsx
        /texts/           # text-rendering composite components; has index.ts barrel
          index.ts  # re-exports Markdown + TruncatedText
          Markdown.tsx  # markdown renderer; moved from components/ root
          TruncatedText.tsx   # truncated text with overflow-only tooltip (detectsscrollWidth > clientWidth); moved from components/ root
        /icons/           # has index.ts barrel
          index.ts  # re-exports LineIcon
          LineIcon.tsx        # status icon: error=XCircle, spinning=Loader2, done=CheckCircle2
      /hooks/
        useCopyToClipboard.ts
      /libs/              # sub-libraries and utilities
        /full-text-search/
          FullTextSearchInput.tsx
          SplitAndHighlightText.tsx
          useFullTextSearch.ts
      /utils/             # barrel-exported via index.ts; import from "@/design-system/utils" (components.json "utils" alias also points here)
        index.ts            # export * from "./common"; export * from "./datetime" (api.ts REMOVED 2026-07-20 — DEFAULT_QUERY_OPTIONS moved back to frontend/src/api/api.ts, see /api/ section)
        common.ts            # cn(...inputs) — clsx+twMerge; clamp(v,min,max)
        datetime.ts           # formatRelativeTime(isoString): combines relative + full ISO timestamp; formatTs(unix): locale timestamp string
      # /types/ REMOVED 2026-08-20 — merged into packages/core/frontend/src/types/ (@galacius/core's src/types/, not documented elsewhere in this file): index.ts barrel (export * from "./api"/"./nav"/"./resources/namespace"/"./tray"), api.ts (UseQueryCallback<T>), tray.ts (SharedUnifiedTrayContext/SharedUnifiedTrayContentProps/UnifiedTrayCoreFamily/UnifiedTrayAllFamily), nav.ts (NavItem/NavGroup/NavEntry, pre-existing), resources/namespace.ts (SharedNamespaceContext, pre-existing). design-system's package.json "./types" export subpath, tsup entry, and index.ts re-export all dropped. All ~44 consumers (UseQueryCallback, SharedUnifiedTray* etc.) now import from "@galacius/core" instead of "@galacius/design-system".
    /app/                 # all top-level and cluster-connected modules (renamed from /modules/ 2026-07-12; 248 files, imports updated @/modules/* -> @/app/*)
      ClusterRail.tsx     # cluster switcher rail (avatar buttons per context); top-level module file; UPDATED 2026-07-31: added "Marketplace" rail button (onMarketplaceToggle prop) below the cluster avatars, opens MarketplaceView as its own top-level view
      App.tsx             # root app component wrapper; UPDATED 2026-07-31: AppContent gained `marketplaceOpen: boolean` + `onOpenMarketplace: () => void` props; when marketplaceOpen it renders <MarketplaceView /> (checked before settingsOpen/connectingContext), imported from ./marketplace/MarketplaceView — replaces the old Settings-tab-based marketplace access; UPDATED 2026-09-21: now also mounts <PluginEventListener /> beside <PluginRegistryReconciler /> (see /plugins/ below) so app-root plugin event dispatch is live pre-cluster-connection
      /footer/            # app-wide status bar
        AppFooter.tsx     # renders Updater.tsx + ProxyServer.tsx plus any plugin-registered footer widgets via usePluginFooterWidgets() (added by commit dc00017, see /plugins/hooks/registry/footer/ below and [[plugin_footer_widget_registry]]) — live even before a cluster is connected
        Updater.tsx       # update-available notice, split out of the old monolithic AppFooter.tsx
        ProxyServer.tsx   # proxy-server status indicator, split out of the old monolithic AppFooter.tsx
        __tests__/
          AppFooter.test.tsx
      /plugins/           # app-root plugin infrastructure — reconciliation, event dispatch, and registries live even before a cluster connects; distinct from app/clusters/plugins/ (cluster-shell plugin-view wiring) and app/marketplace/ (browse/install UI). Full design writeup: [[plugin_footer_widget_registry]]
        PluginRegistryReconciler.tsx  # reconciles installed/enabled plugin state into the various registries (event/footer/settings/stylesheet) on mount and on plugin install/remove/enable/disable; restores each registry from pluginAppWideAssetSnapshot.ts on re-enable (re-importing the cached ES module doesn't re-run its top-level register* calls)
        PluginEventListener.tsx  # app-root counterpart to app/clusters/plugins/PluginDisabledSubscriber.tsx (renamed from PluginEventsSubscriber.tsx) — subscribes to plugin gRPC pub/sub events pre-cluster-connection via usePluginEventListener; a dispatch-time liveness guard (getHandlerFor) in ../clusters/plugins/hooks/registry/event/pluginEventRegistry.ts prevents a disabled/crashed plugin's stale handler from firing
        pluginAppWideAssetSnapshot.ts  # snapshots each plugin's app-wide registrations (footer widget, settings tab, stylesheet) so PluginRegistryReconciler can restore them on re-enable without re-running the plugin bundle's top-level side effects; FIX 2026-09-22 (commit 1cc492a): dropped an unused "self-unregister" notify path that unregisterFooterWidget used to trigger — it wiped the snapshot on every disable, permanently losing the footer widget until a full reload
        /hooks/registry/
          /event/
            usePluginEventListener.ts  # app-root hook wiring a READY plugin's PluginEventBridge-style handlers into pluginEventRegistry pre-cluster-connection
          /footer/
            pluginFooterRegistry.ts    # id-keyed registry backing appWideAPI.registerFooterWidget/unregisterFooterWidget
            usePluginFooterWidgets.tsx # subscribes AppFooter.tsx to the registry's current widget list
          /settings/
            pluginSettingsRegistry.ts / usePluginSettingsTabs.tsx  # same registry pattern, for plugin-contributed Settings tabs (registerSettingsTab)
          /stylesheet/
            pluginStylesheetRegistry.ts  # same registry pattern, for plugin CSS injection dedup
        /utils/
          ensurePluginStylesheet.ts  # injects a plugin's CSS (PLUGIN_STYLES export) into the document once per pluginId, dedup'd across re-renders/polls
          loadPluginModule.ts        # shared dynamic-import-plugin-bundle helper
      /about/
        AboutModal.tsx    # about dialog (version/tech/author); moved from app/AboutModal.tsx 2026-07-22
        /hooks/
          useMenuOpenAboutEvents.ts  # subscribes to "menu:open-about" Wails event once (ref-callback pattern), exports MenuOpenAboutPayload, defaults undefined payload to empty version/go/wails; moved from src/hooks/async-events/ 2026-07-22
      /updater/
        UpdateModal.tsx   # update-available dialog (current/latest version, download size, release notes link, PerformUpdate)
        /hooks/
          /data-access/
            useGetVersion.ts  # fetch current app version from Go; moved from src/hooks/data-access/ 2026-07-22
          /data-mutation/
            useUpdateAvailableEvents.ts  # subscribes to "update:available" Wails event; owns updateInfo/updateModalOpen state + DISMISSED_UPDATE_KEY localStorage dismiss logic; extracted from App.tsx 2026-07-20, moved from src/hooks/async-events/ 2026-07-22
      /marketplace/         # RENAMED/REFACTORED 2026-07-31 (commits 6b02334 "refactor marketplace" + c97f4f6 "update UI for plugin card"), was app/plugins/ — main-app-side plugin marketplace UI, now a standalone top-level view (see App.tsx below) instead of a tab nested inside Settings; distinct from the top-level /plugins/ dir at repo root, which holds the actual out-of-process plugin implementations (e.g. plugins/helm/)
        MarketplaceView.tsx   # NEW 2026-07-31: top-level marketplace page (was settings/components/MarketplaceContent.tsx, now deleted); joins useGetPluginsFromMarketplace() manifest list with useGetInstalledPlugins() per-plugin status, renders a PluginCard grid inline (no more PluginGrid.tsx wrapper); owns per-plugin "attempted install this mount" as a Set in state (replaces useInstallPlugin's old single hasAttemptedThisMount boolean, since this view now lists every plugin, not just "helm"); wires useMutateInstallPlugin/useMutateRemovePlugin (call-time pluginId, one hook instance for the whole list) + toastPluginInstall*/toastPluginRemoval* from ./components/PluginToasts; PLACEHOLDER_BUNDLE_CHECKSUM sentinel (all-zeros) marks a plugin installed before checksum-tracking existed, treated as "not matching the marketplace version" rather than a real checksum
        /hooks/
          useGetPluginsFromMarketplace.ts  # useQuery calling Wails-bound GetPluginsFromMarketplace(), which fetches the manifest list from GitHub Releases (PluginManifest: id/name/description/version/repository/minimumHostVersion/maximumHostVersion/os variants/bundle+binary sha256+size/capabilities)
          useGetInstalledPlugins.ts  # NEW 2026-07-31 (plural — distinct from clusters/plugins/hooks/useGetInstalledPlugin.ts, singular): useQuery calling Wails-bound GetInstalledPlugins() (new batch method on *App, internal/app/plugin.go) once for every installed plugin's dto.InstalledPlugin, 5s refetchInterval; exposes `pluginStatuses` (all) and `readyPlugins` (filtered to status === "READY", consumed by clusters/plugins' useGetInstalledPluginNav.ts + usePluginTrayRegistry.ts + PluginEventBridges.tsx for runtime plugin discovery)
          useMutateInstallPlugin.ts  # NEW 2026-07-31, replaces useInstallPlugin.ts: useMutation wrapping Wails-bound InstallPlugin(pluginId, targetTag), pluginId/targetTag as **call-time** mutate() args (not hook-time) so one hook instance serves every row in MarketplaceView's list; onSuccess invalidates clusters/plugins/hooks/useGetInstalledPlugin.ts's QUERY_KEY_PLUGIN_STATUS, the "plugin-statuses" batch query, and this dir's own "installed-plugins" query
          useMutateRemovePlugin.ts   # NEW 2026-07-31: mirrors useMutateInstallPlugin.ts but wraps the new Wails-bound RemovePlugin(pluginId) (internal/app/plugin.go); same call-time-args + same three query invalidations on success
        /components/
          PluginCard.tsx      # marketplace card: name/description/version badge, install/open/retry/remove CTAs, download progress, disables install when host version falls outside manifest's min/max range; UPDATED 2026-07-31 (commit c97f4f6): added onRemove/isRemoving props + Trash2Icon remove button behind a ConfirmationModal (isRemoveDialogOpen state), installedSize prop rendered via ../utils/formatBytes; imports PluginManifest type from ../hooks/useGetPluginsFromMarketplace, compareVersions from ../utils/semver
          PluginNotInstalledEmptyState.tsx  # empty state when plugin not installed; consumed by clusters/plugins/PluginResourceView.tsx (imported cross-dir from ../../marketplace/components/)
          PluginToasts.tsx     # NEW 2026-07-31: toastPluginInstallSucceeded/Failed + toastPluginRemovalSucceeded/Failed, thin wrappers around design-system's renderSuccessToast/renderErrorToast; called from MarketplaceView.tsx's mutation callbacks (moved out of the old settings MarketplaceContent.tsx)
          DownloadProgressIndicator.tsx  # progress bar shown while a plugin bundle is downloading
          __tests__/
            PluginCard.test.tsx
        /utils/
          formatBytes.ts  # NEW 2026-07-31: bytes -> "12.3 MB"-style string (B/KB/MB/GB units, 1 decimal place except B), used by PluginCard.tsx for installedSize
          semver.ts       # moved from app/plugins/utils/semver.ts (git mv, no content change); compareVersions helper
        __tests__/
          MarketplaceView.test.tsx
      # app/clusters/plugins/ (below, under /clusters/) still holds the cluster-shell-side wiring that hosts an installed plugin's dynamically-imported bundle inside the main app — that part did NOT move to app/marketplace/, only the marketplace browse/install/remove UI did
      /settings/
        SettingsView.tsx      # top-level; imports from ./components/; props: `initialSection: Section`; REVERTED 2026-07-31: `onOpenPlugin`/Marketplace section removed along with settings/components/MarketplaceContent.tsx (deleted) and the "Marketplace" SettingsSidebar.tsx nav entry — App.tsx now opens MarketplaceView.tsx directly as its own top-level view (marketplaceOpen state, ClusterRail's "Marketplace" rail button) instead of routing through Settings; App.tsx still drives which Settings section opens via AppAction "SET_SETTINGS_OPEN" carrying an optional `section`
        /api/               # NEW (undated, found in 2026-07-25 review — not previously documented)
          api.const.ts      # QUERY_KEY_SETTINGS, QUERY_KEY_ACTIVE_KUBECONFIG_PATHS, QUERY_KEY_DEFAULT_SHELL
        /hooks/             # NEW (undated, found in 2026-07-25 review — not previously documented); mirrors the data-access/data-mutation/async-events convention used elsewhere
          /data-access/
            useGetActiveKubeconfigPaths.ts
            useGetDefaultShell.ts
            useGetSettings.ts
            useIsPrivateRepoAccess.ts  # NEW: helper to check if marketplace access token is configured
          /data-mutation/
            usePickKubeconfigPath.tsx
            useSaveKubeconfigPaths.ts
            useSaveLocaleTimezone.ts
            useSaveSettings.tsx
            usePickPluginsDir.tsx  # NEW 2026-08-01: open folder dialog to pick plugins directory
            useSavePluginsDir.ts  # save plugins directory setting
            useSaveMarketplaceRepositories.ts  # save marketplace repository list
          /async-events/
            useMenuOpenSettingsEvents.ts
          useMergeSettingsOnSave.ts  # helper hook for merging settings
          useSectionSaveState.ts  # hook for managing section save state
          /__tests__/
            useGetSettingsHooks.test.ts / useGetSettingsHooks.edge.test.ts / useMergeSettingsOnSave.test.ts / useSettingsMutationHooks.test.ts / MarketplaceRemountRealQuery.test.ts / SettingsSectionIndependence.test.ts
        /components/          # moved 2026-07-21 (all settings files except SettingsView.tsx)
          AppContent.tsx  # app-level settings tab (locale timezone, terminal shell path, about, updates); UPDATED 2026-08-06: absorbed shellPath setting from deleted TerminalContent.tsx (Terminal section removed — see [[gotcha_terminal_section_removed]])
          K8sContent.tsx  # Kubernetes-related settings
          MarketplaceContent.tsx  # NEW 2026-08-01: plugins directory override settings (text input + browse button + default path helper text); UPDATED 2026-08-03: added Private toggle + Key button + TokenModal for marketplace access token
          SandboxContent.tsx  # NEW 2026-07-19 (replaces SecretsContent.tsx + VariablesContent.tsx, commit 1b9b8f44): consolidated secret/variable sandbox settings tab
          TokenModal.tsx  # NEW 2026-08-03: FormModal-based component for adding/updating marketplace access tokens
          SectionHeader.tsx  # reusable settings section header
          SettingsSidebar.tsx  # sidebar nav for settings tabs; UPDATED 2026-08-06: removed "Terminal" nav entry (shellPath setting moved into App tab)
          WelcomeView.tsx       # entry-point screen (no cluster selected); default SettingsView section ("welcome")
          types.ts  # Section union type — UPDATED 2026-08-06 to "welcome" | "sandbox" | "kubernetes" | "app" | "marketplace" (removed "terminal"), SaveStatus, SECTION_HEADER label map
          /__tests__/
            AppContent.test.tsx / K8sContent.test.tsx / SectionHeader.test.tsx / SettingsSidebar.test.tsx / TokenModal.test.tsx / MarketplaceRemountRealQuery.test.tsx / SettingsSectionIndependence.test.tsx
        /__tests__/
          SettingsView.test.tsx
      /clusters/             # everything cluster-connected: resource views + MainLayout/DetailBlock/NavSidebar/navConfig
        ClusterSettingsModal.tsx  # modal for cluster-level settings (kubeconfig path display, HTTP/HTTPS proxy); imports useGetClusterProxy/useGetContextKubeconfigPath/useSaveClusterProxy from ./shared/hooks/... (moved there 2026-07-22, see [[gotcha_clusters_shared_hooks_move]])
        ConnectingView.tsx  # connection status log shown while connecting/failed (subscribes to connect:status events); imports useConnectStatusEvents from ./shared/hooks/async-events/useConnectStatusEvents (moved there 2026-07-22)
        MainLayoutContext.tsx  # global context (MainLayoutProvider + useMainLayoutContext); moved here from context/ (2026-07-10, imported via @/views/clusters/MainLayoutContext everywhere); trimmed (2026-07-10) to ONLY activeContext/namespace/onNamespaceChange; provider (2026-07-10) internally composes DetailDrawerProvider > UnifiedTrayProvider around children; wraps MainLayout's root div. NOTE: an onNavigateToHelmReleases prop threaded through here for the (now-removed, 2026-08-10) Helm plugin's cross-resource nav no longer exists
        MainLayout.tsx         # root layout: renders <MainLayoutProvider> (which internally nests DetailDrawerProvider + UnifiedTrayProvider — see MainLayoutContext.tsx); renders NavSidebar + header + content area + DetailBlock; lazy-loads all resource views; uses useCatchForbiddenResources + toast on forbidden navigation; no longer calls useListenAllResourceEvents (removed 2026-07-20, see /hooks/async-events/)
        NavSidebar.tsx         # NavSidebar FC only (<aside> with nav items and collapsible groups); imports NAV from navConfig.ts; re-exports ViewType, NavItem, NavGroup, NavEntry types (type-only, fine for Fast Refresh); props: activeResource, openGroups, onToggleGroup, onSelectItem
        navConfig.ts           # non-component exports: ViewType, NavItem, NavGroup, NavEntry types + NAV array + RESOURCE_LABEL derived map; MainLayout.tsx imports RESOURCE_LABEL from here
        /plugins/               # cluster-shell-side wiring that hosts an already-installed plugin's dynamically-imported bundle inside MainLayout — distinct from app/marketplace/ (browse/install/remove UI); previously undocumented, first captured 2026-07-31
          PluginResourceView.tsx  # main plugin view orchestrator rendered by MainLayout for a plugin's nav entry; reads status via ./hooks/useGetInstalledPlugin(pluginId, { hasAttemptedInstall: true }) (always shows the real CRASHED/INCOMPATIBLE status, unlike a fresh marketplace visitor's masked one); routes INSTALLING -> PluginLoadingFallback, NOT_INSTALLED -> ../../marketplace/components/PluginNotInstalledEmptyState, CRASHED/INCOMPATIBLE -> ./components/PluginCrashedError, READY -> lazy-imports `/api/plugins/{pluginId}/dist/index.js?v={bundleChecksum.substring(0,8)}` (memoized on the cache-busted URL) wrapped in PluginErrorBoundary + Suspense, forwarding namespaces/unifiedTray/getResourceLinks per the design-system SharedNamespaceContext/SharedUnifiedTrayContext boundary contract
          PluginEventBridges.tsx  # mounts each READY plugin's optional PluginEventBridge export (toasts/cache-invalidation for backend ops the plugin itself triggers) via lazy-import of the same bundle URL scheme as PluginResourceView, one per readyPlugins entry from ../../marketplace/hooks/useGetInstalledPlugins; wrapped in a local SilentErrorBoundary class component so a broken bridge doesn't crash the host
          /components/
            PluginCrashedError.tsx  # error UI shown when a plugin's status is CRASHED or INCOMPATIBLE
            PluginErrorBoundary.tsx  # error boundary around the dynamically-imported plugin view
            PluginLoadingFallback.tsx  # Suspense fallback during plugin install/import; wraps TableSkeletonLoader in <Table><TableBody> to fix HTML nesting error (FIX 2026-07-29)
            __tests__/
              PluginLoadingFallback.test.tsx
          /hooks/
            useGetInstalledPlugin.ts  # singular — per-pluginId hook, distinct from ../../marketplace/hooks/useGetInstalledPlugins.ts (plural, batch). Polls Wails-bound GetInstalledPlugin(pluginId) every 5s via refetchInterval while status is INSTALLING, stops once READY/CRASHED/INCOMPATIBLE; exports QUERY_KEY_PLUGIN_STATUS ("plugin-status"), invalidated by marketplace's useMutateInstallPlugin/useMutateRemovePlugin on success; accepts optional `hasAttemptedInstall` to mask a stale CRASHED/INCOMPATIBLE status as NOT_INSTALLED until an install is attempted this mount (via maskTerminalStatus util)
            useGetInstalledPluginNav.ts  # discovers installed (READY) plugins at runtime via ../../marketplace/hooks/useGetInstalledPlugins, dynamically imports each plugin bundle's nav entries, builds merged viewType->pluginId / pluginName / resourceLabels maps consumed by NavSidebar; plugin discovery is independent of marketplace availability — already-installed plugins still populate nav even if the marketplace fetch fails
            usePluginTrayRegistry.ts  # discovers each READY plugin's PLUGIN_TRAY_FAMILIES export at runtime, registering them with UnifiedTrayTypes so the host never has static knowledge of plugin-owned tray family names or param shapes
            __tests__/
              useGetInstalledPlugin.test.ts / useGetInstalledPluginNav.test.ts / useInstallPlugin.useGetInstalledPluginNav.integration.test.ts
          /utils/
            ensurePluginStylesheet.ts  # injects a plugin's CSS (PLUGIN_STYLES export) into the document once per pluginId, dedup'd across re-renders/polls
        /shared/hooks/  # NEW 2026-07-22: cluster-shell-exclusive hooks moved out of shared src/hooks/ (mirrors the modules/<resource>/hooks/ convention, but scoped to clusters/* excluding modules/); depth 5 from src/, so relative imports to src/api/{api,api.const}.ts need 5 `../` (6 for the __tests__/ subfolder); see [[gotcha_clusters_shared_hooks_move]]
          /data-access/
            useGetClusterProxy.ts             # moved from src/hooks/data-access/; used only by ClusterSettingsModal.tsx
            useGetContextKubeconfigPath.ts     # moved from src/hooks/data-access/; used only by ClusterSettingsModal.tsx
            /__tests__/
              useGetContextKubeconfigPath.test.ts
              useGetContextKubeconfigPath.edge.test.ts
          /data-mutation/
            useSaveClusterProxy.tsx    # moved from src/hooks/data-mutation/; used only by ClusterSettingsModal.tsx
          /async-events/
            useConnectStatusEvents.ts  # moved from src/hooks/async-events/; used only by ConnectingView.tsx
        /shared/components/details/  # DetailBlock.tsx + DetailDrawerContext.tsx moved here 2026-07-12 (from clusters/ directly); moved again 2026-07-21 from /shared/details/ into /shared/components/details/ (whole shared/ tree brought under a components/ subfolder, mirroring the per-submodule split pattern); imports now @/app/clusters/shared/components/details/...; see [[gotcha_clusters_shared_components_move]]
          DetailDrawerContext.tsx  # global context (DetailDrawerProvider + useDetailDrawerContext); split out of MainLayoutContext (2026-07-10); holds every selectedXxxName/selectedXxxNamespace/onToggleXxxDetail pair for all ~30 K8s resource types; useReducer (detailDrawerReducer) atomically manages all fields; composed inside MainLayoutProvider itself (2026-07-10), not in MainLayout.tsx
          DetailBlock.tsx        # always-mounted drawer host inside MainLayoutProvider; composes 5 domain-split sub-hosts below (react-doctor no-giant-component fix, 2026-07-13); must stay mounted here (not in lazy views) so drawers open from any active view
          RbacDetailDrawers.tsx        # ClusterRole/ClusterRoleBinding/Role/RoleBinding/ServiceAccount drawers; each domain file calls useDetailDrawerContext() itself
          NetworkDetailDrawers.tsx     # Ingress/IngressClass/ValidatingWebhookConfig/NetworkPolicy/Service/Endpoint/EndpointSlice drawers; takes onNavigateToPortForwarding (Service drawer)
          WorkloadDetailDrawers.tsx    # Pod/Job/CronJob/Deployment/ReplicaSet/DaemonSet/StatefulSet/HPA/PDB drawers; takes onNavigateToPortForwarding (Pod drawer)
          ConfigStorageDetailDrawers.tsx  # ConfigMap/Secret/ResourceQuota/LimitRange/PVC/PV/StorageClass drawers
          ClusterDetailDrawers.tsx     # Namespace/Node/Event/Lease/PriorityClass drawers
          SectionDivider.tsx     # 2026-07-12, extracted from IngressDetailDrawer; FC<{label; className?}> using cn() from @/design-system/utils/common; base classes `bg-muted/40 text-muted-foreground border-y px-4 py-2 text-xs font-semibold`; className prop lets callers override bg opacity/border/uppercase via tailwind-merge; consolidated 11 duplicate inline dividers across Ingress/ValidatingWebhookConfig/Event/Service/Secret/ConfigMap/PVC/Endpoint/Node(KVSection)/HPA/NetworkPolicy/Pod(x2)/EndpointSlice(x2)/Deployment drawers
        ManagedFieldBlock.tsx    # 2026-07-13, moved to /shared (top level, not /details) from app/components/ManagedFieldBlock.tsx; moved again 2026-07-21 to /shared/components/ManagedFieldBlock.tsx; FC<{mf: ManagedField}> show/hide toggle rendering FieldsYAML in a read-only code Textarea; imported via @/app/clusters/shared/components/ManagedFieldBlock by ~20 detail drawers (Node, Pod, ConfigMap, Namespace, Lease, Role/RoleBinding/ClusterRole/ClusterRoleBinding, CronJob, PriorityClass, Endpoint(Slice), ReplicaSet, DaemonSet, Job, Event, StorageClass, Service, Deployment); relative import to ../../../../api/resources (one level deeper than 2026-07-13 version since the whole shared/ tree moved under components/ 2026-07-21)
        /shared/components/trays/modification/  # moved here 2026-07-13 from design-system/components/tray/modification/ (out of design-system since modificationTrayRegistry.tsx imports every resource's own ModificationTray from app/clusters/modules/**, an app-layer dep design-system shouldn't own); see modification_tray_architecture memory; nested one level deeper under components/ 2026-07-21, see [[gotcha_clusters_shared_components_move]]
          ModificationTrayTypes.ts     # ModificationResourceKind union + ModificationTrayTab/ModificationTrayContentProps types
          ModificationTrayToolbar.tsx  # shared toolbar row (Kind/Name/Namespace chips + Cancel/Save/Save & Close); imports Button/cn via @/design-system/... alias (cross-top-level, correct)
          modificationTrayRegistry.tsx # Record<ModificationResourceKind, ModificationTrayContentComponent>; imports each resource's ModificationTray via relative path ../../../../modules/<resource>/... (workloads resources now ../../../../modules/workloads/<resource>/...; self-alias rule; gained one more `../` 2026-07-21 with the components/ move)
        /shared/components/trays/  # tray system (bottom sheet for logs, exec, YAML edit, plugin-owned families, etc.) moved here 2026-07-13 from design-system/components/tray/; nested one level deeper under components/ 2026-07-21
          TrayTabBar.tsx       # tab bar for unified tray; moved here 2026-07-13 from design-system/components/tray/
        /shared/components/trays/unified/  # moved here 2026-07-13 from design-system/components/tray/unified/ (same rationale as modification/ above); nested one level deeper under components/ 2026-07-21
          UnifiedTrayContext.tsx  # UnifiedTrayProvider + useUnifiedTray only; UnifiedTrayOutlet split out 2026-07-21 into its own file (no longer imports UnifiedTrayShell)
          UnifiedTrayOutlet.tsx   # NEW 2026-07-21, split from UnifiedTrayContext.tsx; exports UnifiedTrayOutlet: FC<UnifiedTrayShellProps>, forwards registry prop to UnifiedTrayShell; imported by MainLayout.tsx
          UnifiedTrayShell.tsx    # takes registry: Record<TrayContentFamily, UnifiedTrayContentComponent> as a prop; imports TrayTabBar from ../TrayTabBar (sibling in shared/trays/)
          UnifiedTrayTypes.ts     # TrayContentFamily + UnifiedTrayTab + UnifiedTrayContentProps + UnifiedTrayContentComponent types
          unifiedTrayRegistry.tsx  # Record<TrayContentFamily, UnifiedTrayContentComponent>; imports families/* via relative ./families/...
          /families/
            ModificationTrayFamily.tsx     # dispatches to MODIFICATION_TRAY_CONTENT_REGISTRY[tab.kind]; imports it via relative ../../modification/modificationTrayRegistry (sibling-relative, unchanged by 2026-07-21 components/ move)
            PodTrayFamily.tsx              # imports PodTray via relative ../../../../../modules/workloads/pods/components/PodTray (gained one more `../` 2026-07-21 with the components/ move)
            # A HelmChartVersionTrayFamily.tsx once lived here, registering the Helm plugin's own tray family; REMOVED 2026-08-10 along with the rest of the Helm plugin. Plugin-owned tray families are now discovered purely at runtime via usePluginTrayRegistry.ts, no static per-plugin family files in this dir
        /modules/           # all resource-view subdirs below moved here 2026-07-12; imports updated to ./modules/... or @/app/clusters/modules/...
          /overview/        # moved here 2026-07-21 from clusters/overview/ (now a sibling of workloads/base/etc under modules/); MainLayout.tsx import path updated to ./modules/overview/OverviewView; internal relative imports gained one `../` level (../../MainLayoutContext, ../../navConfig; workloads/base refs unchanged since overview is now a sibling of those too)
            OverviewView.tsx
          /workloads/       # NEW 2026-07-20: submodule grouping the 7 resources under NAV_CORE's "Workloads" nav group (pods/deployments/daemonsets/statefulsets/replicasets/jobs/cronjobs); moved via git mv from modules/<resource>/ to modules/workloads/<resource>/, one extra relative-import level (../) added throughout for MainLayoutContext/shared/hooks/api refs; external refs updated in MainLayout.tsx, WorkloadDetailDrawers.tsx, modificationTrayRegistry.tsx, PodTrayFamily.tsx. UPDATED 2026-07-20 (same day, follow-up): within each <resource>/, everything except <Resource>View.tsx (the lazy-loaded entry point MainLayout.tsx imports) moved one level deeper into a new <resource>/components/ subdir — done via 4 parallel developer agents grouped as pods / deployments+daemonsets / statefulsets+replicasets / jobs+cronjobs, with the 3 shared registry files (WorkloadDetailDrawers.tsx, modificationTrayRegistry.tsx, PodTrayFamily.tsx) fixed centrally afterward to avoid concurrent-edit conflicts. Cross-resource refs (e.g. any DetailDrawer importing PodStatusBadge) now point at ../../pods/components/PodStatusBadge. UPDATED 2026-07-21 (follow-up): each <resource>/ also now has a <resource>/hooks/{data-access,data-mutation,async-events}/ subtree, mirroring src/hooks/'s own convention — all resource-specific hooks moved out of the shared src/hooks/ folders (pods additionally keeps 2 loose top-level hooks, usePodExec.ts/usePodLogs.ts, directly under pods/hooks/ with no subfolder). Done via the same 4-agent grouping; see [[gotcha_workloads_submodule_move]] for the depth-delta rule and 3 pods-agent bugs found/fixed (wrong `../` depth, an orphaned test file, a stale vi.mock() path). UPDATED 2026-07-21 (follow-up): each `<resource>/` also now has a `<resource>/api/{resources.ts,api.const.ts}` — types + Go-binding re-exports + matching `QUERY_KEY_*` constants moved out of shared `src/api/{resources.ts,api.const.ts}` (a 992-line monolith, unlike `src/hooks/` this one was NOT pre-split). Same 4-agent grouping for the ~71 in-workloads consumer rewires; shared-file cleanup + a handful of external-consumer fixes (6 `src/hooks/__tests__/*.test.ts` files with stale `vi.mock()` paths, `UnifiedTrayTypes.ts`'s `@/api/resources` alias import) done centrally. See [[gotcha_workloads_submodule_move]] for depth rule (6 `../` to shared api, 7 to wailsjs), `TolerationDetail` cross-resource sharing (owned by pods, imported by deployments), and the `StatefulSet.ManagedFields: string[]` anomaly.
          /pods/
            PodsView.tsx           # stays at top level; click row → opens PodDetailDrawer; Name column uses TruncatedText (300px max, overflow tooltip); renders PodContainerDots (init containers amber + regular containers green, if any init containers exist)
            /components/
              PodContainerDots.tsx    # NEW 2026-08-05: split out of PodsView.tsx (was local `ContainerDots` component), renamed export `PodContainerDots`; owns containerTooltipTitle + EMPTY_CONTAINER_DETAILS too
              PodDetailDrawer.tsx    # right-side Sheet; tabs: Overview (metadata, conditions, init containers, containers, volumes), Events, Logs, Exec; defines InitContainerBlock (init-container detail cards) and ContainerBlock (container detail cards with port forwarding)
              PodStatusBadge.tsx     # status badge component only: Running=green, Succeeded=green, Pending=yellow, Failed=red, Terminating=orange, default=muted (containerDotColorClass moved out to podStatusUtils.ts 2026-07-13, react-doctor only-export-components fix)
              PodQoSBadge.tsx        # QoS badge: Guaranteed=green, Burstable=amber, BestEffort=red; returns "—" when empty
              PodConditionBadge.tsx  # condition badge for pod conditions (Ready, PodScheduled, etc.)
              PodDeleteConfirmationModal.tsx  # confirmation for pod deletion
              PodTray.tsx  # 2026-07-13 rewritten (react-doctor no-multi-comp fix): now just a thin FC<{tab: TrayTab; collapsed}> that dispatches to PodLogTrayContent or PodExecTrayContent based on tab.mode; also owns/exports the TrayTab interface
              PodMetaStrip.tsx        # NEW 2026-07-13: ns/owner/pod-name badge strip shared by both toolbars
              PodLogTrayToolbar.tsx   # NEW 2026-07-13: container select + search input + clear button + status dot for logs mode
              PodExecTrayToolbar.tsx  # NEW 2026-07-13: container select + reconnect button + status dot for exec mode
              TrayBottomBar.tsx       # NEW 2026-07-13: timestamps/wrap/prev-terminated checkboxes + download button (logs mode)
              PodLogTrayContent.tsx   # NEW 2026-07-13: extracted from old PodTray.tsx; LogTabOptions/LogState/LogAction/logReducer/initialLogState + usePodLogs; renders PodLogTrayToolbar+LogsPanel+TrayBottomBar
              PodExecTrayContent.tsx  # NEW 2026-07-13: extracted from old PodTray.tsx; ExecState/ExecAction/execReducer/initialExecState + usePodExec; renders PodExecTrayToolbar+ExecPanel
              PodModificationTray.tsx  # YAML edit tray for Pod
              LogsPanel.tsx  # log streaming panel using xterm.js
              ExecPanel.tsx  # exec session panel using xterm.js
              podStatusUtils.ts  # pod status helper functions (statusDotClass, execStatusDotClass, containerDotColorClass)
              /__tests__/       # PodDrawerBody.tray.test.tsx, PodTray.test.tsx (moved with the files they test); watch vi.mock() path strings when moving test files — they must match the resolved depth of the real import exactly or the mock silently fails to intercept, see [[gotcha_workloads_submodule_move]]
          /deployments/
            DeploymentsView.tsx              # stays at top level; click row → opens DeploymentDetailDrawer; CTAs: Restart, Scale, Edit, Delete
            /components/
              DeploymentDetailDrawer.tsx       # tabs: Overview (metadata, conditions, deploy revisions table), Pods (via RS→pod chain), Events
              DeploymentConditionBadge.tsx     # condition badge for deployment conditions
              DeploymentDeleteConfirmationModal.tsx  # confirmation for deployment deletion
              DeploymentRestartConfirmationModal.tsx  # confirmation modal for restart action
              DeploymentScaleModal.tsx  # modal to set replica count
              DeploymentModificationTray.tsx  # YAML edit tray for Deployment
          /daemonsets/
            DaemonSetsView.tsx              # stays at top level; click row → opens DaemonSetDetailDrawer; CTAs: Restart, Edit, Delete
            /components/
              DaemonSetDetailDrawer.tsx       # tabs: Overview (metadata, selector, images, strategy, tolerations, pod status), Pods (filtered by ControlledBy=DaemonSet), Events
              DaemonSetDeleteConfirmationModal.tsx  # confirmation for daemonset deletion
              DaemonSetRestartConfirmationModal.tsx  # confirmation modal for restart action
              DaemonSetModificationTray.tsx  # YAML edit tray for DaemonSet
          /statefulsets/
            StatefulSetsView.tsx  # stays at top level; click row → opens StatefulSetDetailDrawer; includes "Item list is empty" empty state
            /components/
              StatefulSetDetailDrawer.tsx  # tabs: Overview (metadata, selector, service, pod management policy, affinity, tolerations), Pods, Events
              StatefulSetDeleteConfirmationModal.tsx  # confirmation for statefulset deletion
              StatefulSetModificationTray.tsx  # YAML edit tray for StatefulSet
          /replicasets/
            ReplicaSetsView.tsx             # stays at top level; click row → opens ReplicaSetDetailDrawer; CTAs: Scale (isNotAllowed+tooltip if owned by Deployment), Edit, Delete; resets on namespace change
            /components/
              ReplicaSetDetailDrawer.tsx      # tabs: Overview (metadata, controlled by, selector, images, replicas, tolerations, affinities, pod status), Pods, Events
              ReplicaSetDeleteConfirmationModal.tsx  # confirmation for replicaset deletion
              ReplicaSetScaleModal.tsx  # modal to set replica count; disabled when owned by Deployment
              ReplicaSetModificationTray.tsx  # YAML edit tray for ReplicaSet
          /jobs/
            JobsView.tsx  # stays at top level
            /components/
              JobDetailDrawer.tsx      # right-side Sheet for job details; tabs: Overview, Pods, Events
              JobConditionBadge.tsx    # condition badge: Complete=green, Failed=red, Suspended=amber, default=muted
              JobDeleteConfirmationModal.tsx  # confirmation for job deletion
              JobModificationTray.tsx  # YAML edit tray for Job
          /cronjobs/
            CronJobsView.tsx              # stays at top level; click row → opens CronJobDetailDrawer; resets on namespace change
            /components/
              CronJobDetailDrawer.tsx       # tabs: Overview (metadata, schedule, concurrency, history limits, last run times, template fields), Jobs (child jobs filtered by numeric suffix), Events
              CronJobDeleteConfirmationModal.tsx  # confirmation for cronjob deletion
              CronJobModificationTray.tsx  # YAML edit tray for CronJob
          /configs/         # NEW 2026-07-21: submodule grouping the 9 resources under NAV_CORE's "Config" nav group (configmaps/secrets/resourcequotas/limitranges/hpas/pdbs/priorityclasses/leases/validatingwebhookconfigs); moved via git mv straight to final layout in a single pass (unlike workloads/, which did the hooks/api split as separate follow-ups) — hooks/api stayed in shared src/hooks|api, NOT moved (none of these 9 had per-resource hooks/api subfolders pre-move); external refs updated in MainLayout.tsx, ConfigStorageDetailDrawers.tsx, ClusterDetailDrawers.tsx, NetworkDetailDrawers.tsx, WorkloadDetailDrawers.tsx, modificationTrayRegistry.tsx; see [[gotcha_configs_submodule_move]] for depth-delta rule and the vi.mock() hooks-path bug (6 test files needed 5→7 ups)
            /configmaps/
              ConfigMapsView.tsx           # stays at top level; click row → opens ConfigMapDetailDrawer
              /components/
                ConfigMapDetailDrawer.tsx    # tabs: Overview (metadata, labels, annotations, managed fields), Data (line-numbered code blocks per key; binary keys show placeholder), Events
                ConfigMapDeleteConfirmationModal.tsx  # confirmation for configmap deletion
                ConfigMapModificationConfirmationModal.tsx  # confirmation modal when editing ConfigMap data
                ConfigMapModificationTray.tsx  # YAML edit tray for ConfigMap
            /secrets/
              SecretsView.tsx
              /components/
                SecretDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, managed fields), Data (base64 decode toggle), Events
                SecretDeleteConfirmationModal.tsx  # confirmation for secret deletion
                SecretModificationConfirmationModal.tsx  # confirmation modal when editing Secret data
                SecretModificationTray.tsx  # YAML edit tray for Secret
                /__tests__/       # SecretsView.test.tsx, SecretsView.edge.test.tsx
            /resourcequotas/
              ResourceQuotasView.tsx
              /components/
                ResourceQuotaDetailDrawer.tsx  # tabs: Overview (metadata, usage bars with Hard/Used display), Events
                ResourceQuotaCreationModal.tsx  # modal to create ResourceQuota with limits
                ResourceQuotaDeleteConfirmationModal.tsx  # confirmation for deletion
                ResourceQuotaModificationTray.tsx  # YAML edit tray for ResourceQuota
                /__tests__/       # ResourceQuotasView.test.tsx, ResourceQuotasView.edge.test.tsx
            /limitranges/
              LimitRangesView.tsx
              /components/
                LimitRangeDetailDrawer.tsx  # tabs: Overview (metadata, Limits grouped by type: Container/Pod/PVC with min/max/default badges), Events
                LimitRangeCreationModal.tsx  # modal to create LimitRange with limits map
                LimitRangeDeleteConfirmationModal.tsx  # confirmation for deletion
                LimitRangeModificationTray.tsx  # YAML edit tray for LimitRange
                /__tests__/       # LimitRangesView.test.tsx, LimitRangesView.edge.test.tsx
            /hpas/
              HPAView.tsx
              /components/
                HPADetailDrawer.tsx  # tabs: Overview (metadata, target ref, metric specs, scaling policies), Events
                HPAStatusBadge.tsx     # status badge: Active=green, Inactive=orange, default=muted
                HPADeleteConfirmationModal.tsx  # confirmation for HPA deletion
                HPAModificationTray.tsx  # YAML edit tray for HPA
            /pdbs/
              PodDisruptionBudgetsView.tsx
              /components/
                PodDisruptionBudgetDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, selector, disruption budget fields), Events
                PodDisruptionBudgetDeleteConfirmationModal.tsx  # confirmation for PDB deletion
                PodDisruptionBudgetModificationTray.tsx  # YAML edit tray for PodDisruptionBudget
            /priorityclasses/
              PriorityClassesView.tsx
              /components/
                PriorityClassDetailDrawer.tsx   # tabs: Overview (metadata, managed fields, description, value, global default, preemption policy), Events
                PriorityClassDeleteConfirmationModal.tsx  # confirmation for priorityclass deletion
                PriorityClassModificationTray.tsx  # YAML edit tray for PriorityClass
            /leases/
              LeasesView.tsx           # click row → opens LeaseDetailDrawer
              /components/
                LeaseDetailDrawer.tsx    # tabs: Overview (metadata, labels, managed fields, holder identity, lease duration, renew time), Events
                LeaseDeleteConfirmationModal.tsx  # confirmation for lease deletion
                LeaseModificationTray.tsx  # YAML edit tray for Lease
            /validatingwebhookconfigs/
              ValidatingWebhookConfigsView.tsx
              /components/
                ValidatingWebhookConfigDetailDrawer.tsx  # tabs: Overview (metadata, webhook rules table with name/rules/failure policy/client config), Events
                ValidatingWebhookConfigDeleteConfirmationModal.tsx  # confirmation for validatingwebhookconfig deletion
                ValidatingWebhookConfigModificationTray.tsx  # YAML edit tray for ValidatingWebhookConfig
          /networks/       # NEW 2026-07-21: submodule grouping the 7 resources under NAV_CORE's "network" nav group id (services/endpointslices/endpoints/ingresses/ingressclasses/networkpolicies/portforwarding); git mv'd from modules/<resource>/ to modules/networks/<resource>/, then components/ subfolder split (mirrors workloads/configs playbook) — but hooks/ move and src/api/ split explicitly DEFERRED this time (still using shared src/hooks/, src/api/). See [[gotcha_networks_submodule_move]] for depth-delta rule and the View/test-file Step-1-delta bug both parallel agents missed. External refs updated in MainLayout.tsx, NetworkDetailDrawers.tsx (was ValidatingWebhookConfig+Network drawers combined; ValidatingWebhookConfig stays in configs/), modificationTrayRegistry.tsx; cross-resource refs from services/portforwarding and workloads/pods/portforwarding also fixed.
            /ingresses/
              IngressesView.tsx        # stays at root; entry point
              /components/
                IngressDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, Rules table with host/path/backend/link, LoadBalancer IPs, Ports), Events
                IngressDeleteConfirmationModal.tsx  # confirmation for ingress deletion
                IngressModificationTray.tsx  # YAML edit tray for Ingress
              /__tests__/             # IngressesView.test.tsx — stays at resource root (tests the unmoved View), not nested into components/__tests__/
            /ingressclasses/
              IngressClassesView.tsx   # stays at root; entry point
              /components/
                IngressClassDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, controller field, Specification), Events
                IngressClassDeleteConfirmationModal.tsx  # confirmation for ingressclass deletion
                IngressClassModificationTray.tsx  # YAML edit tray for IngressClass
            /networkpolicies/
              NetworkPoliciesView.tsx  # stays at root; entry point
              /components/
                NetworkPolicyDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, pod selector, ingress/egress rules), Events
                NetworkPolicyDeleteConfirmationModal.tsx  # confirmation for networkpolicy deletion
                NetworkPolicyModificationTray.tsx  # YAML edit tray for NetworkPolicy
              /__tests__/             # NetworkPoliciesView.test.tsx + .edge.test.tsx — stays at resource root, same reasoning as ingresses
            /portforwarding/
              PortForwardingView.tsx        # stays at root; entry point; search + table of active sessions; click row → opens PortForwardDetailDrawer
              /components/
                PortForwardDetailDrawer.tsx  # right-side Sheet; header row (flex justify-between border-b px-4 py-3): title "Port Forward: {Name}" + action buttons (ExternalLink when Active, Pencil placeholder, Stop/StopPortForward disabled when Stopped, Delete/RemovePortForward+close); flat grid (no tabs): Resource Name, Namespace, Kind, Pod Port, Local Port, Protocol, Address, Status (PortForwardStatusBadge)
                PortForwardCtaButton.tsx     # reusable 3-state CTA button: no activePf→green-500 "Forward...", Status=Active→amber "Stop" (StopPortForward+toast), Status=Stopped→red "Remove" (RemovePortForward+toast); imported cross-resource by services/components/ServiceDetailDrawer.tsx and workloads/pods/components/PodDetailDrawer.tsx
                PortForwardConfirmationToast.tsx # toast utility (no React component export — uses internal renderSuccessToast lowercase function to avoid Fast Refresh issues); toastPortForwardStarted/Stopped/Removed each call toast.custom((t) => renderSuccessToast({...})); toastPortForwardStopFailed(err)
                PortForwardOperationDialog.tsx # Dialog for starting a port-forward session; props: open, resourceName, namespace, kind, podPort, protocol, onClose, onNavigateToPortForwarding; defaults: address=127.0.0.1, localPort blank (random), https unchecked, openInBrowser checked; calls StartPortForward → receives dto.StartResult{ID, LocalPort} (actual port even for random "0"); if openInBrowser, opens BrowserOpenURL before onClose; shows Sonner success toast; imported cross-resource same as PortForwardCtaButton
                PortForwardStatusBadge.tsx   # reusable status badge for port-forward sessions; Active/Running=green, Starting=yellow, Error=red, default=muted; used by PortForwardingView (list) and PortForwardDetailDrawer (detail)
            /endpointslices/
              EndpointSlicesView.tsx   # stays at root; entry point; click row → opens EndpointSliceDetailDrawer; resets on namespace change
              /components/
                EndpointSliceDetailDrawer.tsx # tabs: Overview (metadata, labels, annotations, controlled by, managed fields, Endpoints section with Addresses+Ports tables), Events
                EndpointSliceDeleteConfirmationModal.tsx  # confirmation for endpointslice deletion
                EndpointSliceModificationTray.tsx  # YAML edit tray for EndpointSlice
            /endpoints/
              EndpointsView.tsx        # stays at root; entry point; click row → opens EndpointDetailDrawer; resets on namespace change
              /components/
                EndpointDetailDrawer.tsx      # tabs: Overview (metadata, labels, annotations, managed fields, Subsets section with Addresses+Ports tables), Events
                EndpointDeleteConfirmationModal.tsx  # confirmation for endpoint deletion
                EndpointModificationTray.tsx  # YAML edit tray for Endpoint
            /services/
              ServicesView.tsx         # stays at root; entry point; click row → opens ServiceDetailDrawer; resets on namespace change; accepts onNavigateToPortForwarding prop threaded from MainLayout
              /components/
                ServiceDetailDrawer.tsx       # tabs: Overview (metadata, Connection section with active "Forward..." buttons per port via PortForwardCtaButton, Endpoint Slices placeholder), Events; "Forward..." sets pendingPort → renders PortForwardOperationDialog; uses resolvePodPort() to pass TargetPort (not Port) as podPort — pod's actual container port (falls back to Port for named TargetPorts)
                ServiceStatusBadge.tsx        # status badge: Terminating=orange, default=green
                ServiceDeleteConfirmationModal.tsx  # confirmation for service deletion
                ServiceModificationTray.tsx  # YAML edit tray for Service
          /storages/       # submodule grouping the 3 resources under NAV_CORE's "storage" nav group (pvcs/pvs/storageclasses); git mv'd from modules/<resource>/ to modules/storages/<resource>/, then components/ subfolder split, then (2026-07-21 follow-up) hooks/ subfolder split — src/api/ split still DEFERRED (still using shared src/api/). External refs updated in MainLayout.tsx (3 lazy imports), ConfigStorageDetailDrawers.tsx, modificationTrayRegistry.tsx. No cross-resource refs between pvcs/pvs/storageclasses (unlike networks' PortForwardCtaButton case). See [[gotcha_workloads_submodule_move]] for the depth-delta rule this reused; see [[gotcha_storages_submodule_move]] for this submodule's own history.
            /pvcs/
              PersistentVolumeClaimsView.tsx  # stays at root; entry point
              /components/
                PersistentVolumeClaimDetailDrawer.tsx  # tabs: Overview (metadata, access modes, storage class, volume, capacity, conditions), Events
                PersistentVolumeClaimDeleteConfirmationModal.tsx  # confirmation for PVC deletion
                PersistentVolumeClaimStatusBadge.tsx  # status badge: Bound=green, Pending=yellow, Lost=red, Terminating=orange, default=muted
                PersistentVolumeClaimModificationTray.tsx  # YAML edit tray for PersistentVolumeClaim
              /hooks/        # NEW 2026-07-21: moved out of shared src/hooks/
                /data-access/    # useGetPersistentVolumeClaimDetail.ts, useGetPersistentVolumeClaimYAML.ts, useGetPersistentVolumeClaims.ts
                /data-mutation/  # useDeletePersistentVolumeClaim.tsx, useDeletePersistentVolumeClaims.tsx, useUpdatePersistentVolumeClaimYAML.tsx
                /async-events/   # usePersistentVolumeClaimsUpdateEvents.ts (+ __tests__/)
            /pvs/
              PersistentVolumesView.tsx  # stays at root; entry point
              /components/
                PersistentVolumeDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, managed fields, capacity, storage class, access modes, reclaim policy, status), Events
                PersistentVolumeStatusBadge.tsx       # status badge: Bound=green, Available=blue, Released=yellow, Failed=red, Terminating=orange, default=muted
                PersistentVolumeDeleteConfirmationModal.tsx  # confirmation for PV deletion
                PersistentVolumeModificationTray.tsx  # YAML edit tray for PersistentVolume
              /hooks/        # NEW 2026-07-21: moved out of shared src/hooks/
                /data-access/    # useGetPersistentVolumeByName.ts, useGetPersistentVolumeYAML.ts, useGetPersistentVolumes.ts
                /data-mutation/  # useDeletePersistentVolume.tsx, useDeletePersistentVolumes.tsx, useUpdatePersistentVolumeYAML.tsx
                /async-events/   # usePersistentVolumesUpdateEvents.ts (+ __tests__/)
            /storageclasses/
              StorageClassesView.tsx  # stays at root; entry point; click row → opens StorageClassDetailDrawer
              /components/
                StorageClassDetailDrawer.tsx   # tabs: Overview (metadata, labels, annotations, managed fields, Storage section with provisioner/binding mode/reclaim policy/default/mount options, Parameters section), Events
                StorageClassDeleteConfirmationModal.tsx  # confirmation for storageclass deletion
                StorageClassModificationTray.tsx  # YAML edit tray for StorageClass
              /hooks/        # NEW 2026-07-21: moved out of shared src/hooks/
                /data-access/    # useGetStorageClassByName.ts, useGetStorageClassYAML.ts, useGetStorageClasses.ts
                /data-mutation/  # useDeleteStorageClass.tsx, useDeleteStorageClasses.tsx, useUpdateStorageClassYAML.tsx
                /async-events/   # useStorageClassesUpdateEvents.ts (+ __tests__/)
          /base/            # 2026-07-21: submodule grouping events/namespaces/nodes; git mv'd from modules/<resource>/ to modules/base/<resource>/ (stage A), then split into components/ (stage B), hooks/ (stage C), api/ (stage D — final, completes the pattern for ALL 6 submodules), mirroring [[gotcha_workloads_submodule_move]]. Each resource dir now has components/, hooks/{data-access,data-mutation,async-events}/, api/{resources.ts,api.const.ts}. See [[gotcha_base_submodule_move]], [[gotcha_events_components_split]], [[gotcha_namespaces_components_move]], [[gotcha_nodes_components_split]], [[gotcha_base_submodule_hooks_move]], [[gotcha_base_submodule_api_split]].
            /nodes/
              NodesView.tsx           # stays at top level; click row → onToggleNodeDetail(node.Name) via MainLayoutContext; no local drawer state; tri-state header Checkbox + per-row Checkbox for bulk selection; toolbar ResourceBulkDeletionButton; NodeTableCtaButtons owns single-delete (useDeleteNode + NodeDeleteConfirmationModal mode="single") + edit (openTab("modification", { kind: "Node", name })) + Cordon/Uncordon toggle + Drain internally
              /components/
                NodeDetailDrawer.tsx    # global drawer (rendered in DetailBlock); accepts nodeName: string | null; fetches internally via useGetNodeDetail; tabs: Info (metadata, capacity, allocatable, Schedulable + Conditions rows), Pods (pods filtered by NodeName), Events; 403 via useCatchForbiddenResources("nodes"); NodeDrawerCtaButtons wires Delete via useDeleteNode + NodeDeleteConfirmationModal, Edit via useUnifiedTray().openTab("modification", { kind: "Node", name }), Cordon/Uncordon (mode="icon-button") + Drain (mode="icon-button"), closes drawer on delete success
                NodeDeleteConfirmationModal.tsx  # mode: "single" | "bulk"; cluster-scoped (no namespace); warns pods on the node will be evicted
                NodeCordonButton.tsx / NodeUncordonButton.tsx  # dual-mode (menu-item | icon-button) toggle CTA; Pause / Play icons; renamed from ResourceCordon/UncordonButton, node-specific (not a design-system atom)
                NodeCordonConfirmationModal.tsx / NodeUncordonConfirmationModal.tsx  # single-target only, no bulk mode; Cordon uses confirmVariant="destructive", Uncordon uses "default"
                NodeDrainButton.tsx     # dual-mode (menu-item | icon-button) CTA; Droplet icon; opens NodeDrainConfirmationModal via useDrainNode
                NodeDrainConfirmationModal.tsx  # single-target only; confirmVariant="destructive"; explains cordon+evict, PDB blocking, DaemonSet/mirror pod exclusion
                NodeConditionBadge.tsx  # status badge for node conditions (Ready, MemoryPressure, etc.); bg-tint palette shared with PodConditionBadge; tooltip shows 6-field grid (LastHeartbeatTime, LastTransitionTime, Message, Reason, Status, Type)
                NodeSchedulableBadge.tsx  # { schedulable: boolean } badge, bg-tint palette; renders "True"/"False"
                NodeModificationTray.tsx  # YAML edit tray for Node (cluster-scoped, no namespace)
            /namespaces/
              NamespacesView.tsx           # stays at top level; click row → opens NamespaceDetailDrawer; lazy-loaded entry point (stays at top level, not moved to components/)
              /components/
                NamespaceDetailDrawer.tsx    # tabs: Overview (created, name, labels, managed fields, status, resource quotas, limit ranges), Events
                NamespaceDeleteConfirmationModal.tsx  # confirmation for namespace deletion
                NamespaceCreationModal.tsx  # modal to create namespace with name
                NamespaceStatusBadge.tsx     # status badge: Terminating=orange, default=green
                NamespaceModificationTray.tsx  # YAML edit tray for Namespace
            /events/
              EventsView.tsx  # stays at top level (lazy-loaded entry point)
              /components/
                EventDetailDrawer.tsx  # tabs: Overview (metadata, type, reason, message, involved object link, first/last timestamp, event count, source), Events
                EventTypeBadge.tsx  # status badge: Normal=blue, Warning=amber
                EventsTable.tsx     # reusable events table (used by EventsView + OverviewView)
                /__tests__/
                  EventTypeBadge.test.tsx
                  EventsView.test.tsx
                  EventsView.edge.test.tsx
          /serviceaccounts/
            ServiceAccountsView.tsx
            ServiceAccountDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, managed fields, image pull secrets, automount token), Events
            ServiceAccountDeleteConfirmationModal.tsx  # confirmation for serviceaccount deletion
            ServiceAccountModificationTray.tsx  # YAML edit tray for ServiceAccount
          /clusterroles/
            ClusterRolesView.tsx
            ClusterRoleDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, managed fields, Rules table with verb/apiGroup/resources/resourceNames), Events
            ClusterRoleDeleteConfirmationModal.tsx  # confirmation for clusterrole deletion
            ClusterRoleModificationTray.tsx  # YAML edit tray for ClusterRole
          /roles/
            RolesView.tsx
            RoleDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, managed fields, Rules table), Events
            RoleDeleteConfirmationModal.tsx  # confirmation for role deletion
            RoleModificationTray.tsx  # YAML edit tray for Role
          /clusterrolebindings/
            ClusterRoleBindingsView.tsx
            ClusterRoleBindingDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, role ref, subjects table), Events
            ClusterRoleBindingDeleteConfirmationModal.tsx  # confirmation for clusterrolebinding deletion
            ClusterRoleBindingModificationTray.tsx  # YAML edit tray for ClusterRoleBinding
          /rolebindings/
            RoleBindingsView.tsx
            RoleBindingDetailDrawer.tsx  # tabs: Overview (metadata, labels, annotations, role ref, subjects table), Events
            RoleBindingDeleteConfirmationModal.tsx  # confirmation for rolebinding deletion
            RoleBindingModificationTray.tsx  # YAML edit tray for RoleBinding
# frontend/plugins/ (formerly frontend/plugins/helm/, moved to /plugins/helm/frontend/src/ at repo root
# 2026-07-23) REMOVED entirely 2026-08-10 along with the rest of the Helm plugin — the whole
# Helm chart-browse/install/release-management surface, its dedicated hooks/api/context files,
# and its @plugins/* vite alias are gone. No plugin ships in-tree anymore; installed plugins are
# discovered purely at runtime (see app/clusters/plugins/ above).
/internal/
  /dto/                   # package dto — type definitions only, one file per entity (no DTO suffix; dto.Pod, dto.Service, etc.)
    pod.go                # Pod
    deployment.go         # Deployment
    daemonset.go          # DaemonSet
    statefulset.go        # StatefulSet
    replicaset.go         # ReplicaSet
    job.go                # Job
    cronjob.go            # CronJob
    configmap.go          # ConfigMap
    lease.go              # Lease
    priorityclass.go      # PriorityClass
    secret.go             # Secret
    resourcequota.go      # ResourceQuota
    limitrange.go         # LimitRange
    hpa.go                # HPA
    pdb.go                # PodDisruptionBudget
    ingress.go            # Ingress
    ingressclass.go       # IngressClass
    networkpolicy.go      # NetworkPolicy
    endpoint.go           # Endpoint, EndpointSubset, EndpointAddress, EndpointPort
    endpointslice.go      # EndpointSlice, EndpointSliceEndpoint, EndpointSlicePort
    service.go            # Service, ServicePort, ManagedField (shared struct used by Service and ConfigMap ManagedFields detail)
    node.go               # Node (includes detail fields: Labels, Annotations, ManagedFields, Addresses, OS info, Conditions, Capacity, Allocatable, CreatedAt), NodeUsage, NodeAddress, NodeCondition
    namespace.go          # Namespace (detail fields: Labels map[string]string, Annotations, CreatedAt, ManagedFields, ResourceQuotas []string, LimitRanges []string)
    portforward.go        # PortForward, StartResult (returned by StartPortForward — contains ID + actual LocalPort)
    pvc.go                # PersistentVolumeClaim
    pv.go                 # PersistentVolume
    storageclass.go       # StorageClass
    serviceaccount.go     # ServiceAccount
    clusterrole.go        # ClusterRole
    clusterrolebinding.go # ClusterRoleBinding
    rolebinding.go        # RoleBinding
    role.go               # Role
    event.go              # Event
    context.go            # Context
    validatingwebhookconfig.go  # ValidatingWebhookConfig
    plugin.go             # NEW 2026-07-31: InstalledPlugin{PluginID, Status, Error, Progress, BundleChecksum, InstalledVersion, Size}; replaces the ad-hoc map[string]interface{} previously returned inline by internal/app's GetInstalledPlugin; PluginID + Size fields are new (Size = dirSize() of the plugin's install dir, computed only when status is READY or CRASHED)
  /app/                   # package app — one file per entity (mirrors dto package) + lifecycle
    app.go                # App struct (includes restConfigs map[string]*rest.Config, pfCancels map[string]context.CancelFunc for port-forwarding, and pluginLoaders map[string]*plugin.PluginLoader — NEW 2026-07-25; UPDATED 2026-07-31: added `removingPluginIDs map[string]bool`, tracks plugins currently being removed to prevent a concurrent InstallPlugin racing a RemovePlugin), NewApp (now also inits removingPluginIDs), Startup (calls a.restoreInstalledPlugins() synchronously then `go a.checkForUpdate()`), Connect, GetVersion, GetVariables, IsResourceForbidden (core lifecycle); Connect stores restConfig per context; passes onForbidden to NewFactoryHandle — emits resource:forbidden event (deduplicated per resource per connection); import alias wailsruntime added to avoid conflict with Go stdlib runtime package (2026-07-27); REFACTORED 2026-07-30: all plugin-specific logic split out to the new plugin.go below; NewHelmClusterProvider moved to plugin_proxy_helm.go — app.go now holds only App-struct lifecycle + the cluster-informer wiring in Connect; UPDATED 2026-08-29 (commit 2608fe4 "clear-first + synchronous-acked push to close cluster-switch race"): Connect(contextName, seq) now calls a.clearPluginClusterState() (internal/app/plugin.go) as literally its first step, before emitConnectStatus/resolving the new context — see plugin.go note below for why; UPDATED 2026-09: 10 `watched<Kind> detailWatch` fields (Secret/ResourceQuota/PersistentVolumeClaim/HPA/LimitRange/NetworkPolicy/PodDisruptionBudget/Ingress/PersistentVolume/ValidatingWebhookConfig) track the resource currently shown in that kind's (single) open detail drawer for the scoped detail-push pattern (see detail_watch.go below, [[architecture_decisions#scoped-detail-push-pattern]]) — for cluster-scoped kinds (PersistentVolume, ValidatingWebhookConfig) the namespace half of the key is always ""; a dedicated `debouncer.Debouncer` per resource (deXxxDetail, registered via h.RegisterDebouncer) drives each emitXxxDetail, triggered alongside the existing list debouncer inside the same informer event-handler callback (SetXxxsEventHandler or the raw informer AddEventHandler block)
    plugin.go             # split out of app.go 2026-07-30 to separate plugin-management concerns from the App god-object. pluginMetadata struct (ReleaseTag/BundleSHA256/InstalledAt, .plugin-metadata.json); writeMetadataAtomically(destPath, data) temp-file+rename helper; validPluginID(pluginID) — path-traversal guard (alphanumeric/dash/underscore only) shared with plugin_proxy_helm.go; bundleChecksumHexRe; restoreInstalledPlugins() — scans storage.Dir("plugins")/<id>/ on Startup, reads new-format .plugin-metadata.json or migrates a legacy .bundle-sha256-only install (backfilling BundleSHA256 but leaving ReleaseTag/InstalledAt empty — never recorded for legacy installs, see [[qa_plugin_fix_verification]]), marks loader READY; prewarmRestoredPlugins(contextName) — launches restored-but-not-yet-launched loaders once a cluster context connects; getInstalledPluginInfo(pluginID) NEW 2026-07-31 — private helper building the dto.InstalledPlugin for one ID (now also computes Size via dirSize() when status is READY/CRASHED), shared by the two methods below; GetInstalledPlugin(pluginID) dto.InstalledPlugin Wails-bound method, thin wrapper around getInstalledPluginInfo after validPluginID; GetInstalledPlugins() []dto.InstalledPlugin NEW 2026-07-31 — Wails-bound batch method, returns getInstalledPluginInfo for every a.pluginLoaders key (PluginID set on each entry), sorted by ID for deterministic output, empty slice (not nil) so JSON serializes as [] not null; dirSize(root) NEW 2026-07-31 — filepath.WalkDir summing regular-file sizes, treats any error as 0 (display nicety, not load-bearing); InstallPlugin(pluginID, targetTag) Wails-bound method — full async installation flow (fetch release/manifest from GitHub, check compatibility, download + verify binary+bundle SHA256, chmod on Unix, persist preliminary then final metadata, launch plugin); UPDATED 2026-07-31: now rejects with an error if a.removingPluginIDs[pluginID] is set, so it can't race a concurrent RemovePlugin; RemovePlugin(pluginID) error NEW 2026-07-31 — Wails-bound method: validates pluginID, rejects if the plugin is currently INSTALLING, sets removingPluginIDs[pluginID]=true under the lock before releasing it (closes the InstallPlugin race window), gracefully Shutdown()s the loader if present (logs but doesn't fail on shutdown error), os.RemoveAll's the plugin's storage.Dir("plugins")/<id>/ dir (treats already-gone as success), then clears removingPluginIDs and deletes the loader entry; also removes orphaned on-disk installs that have no loader entry; GetPluginsFromMarketplace() — fetches the latest release once, derives plugin IDs via plugin.DiscoverPluginIDs(assets) (no more hardcoded knownPluginIDs, removed 2026-08-01), fetches manifests for the marketplace
    pod.go                # ListPods, emitPods
    deployment.go         # ListDeployments, emitDeployments, RestartDeployment, ScaleDeployment
    daemonset.go          # ListDaemonSets, emitDaemonSets, RestartDaemonSet
    statefulset.go        # ListStatefulSets, emitStatefulSets
    replicaset.go         # ListReplicaSets, emitReplicaSets, ScaleReplicaSet
    job.go                # ListJobs, emitJobs
    cronjob.go            # ListCronJobs, emitCronJobs
    configmap.go          # ListConfigMaps, emitConfigMaps, UpdateConfigMap
    lease.go              # ListLeases, emitLeases
    priorityclass.go      # ListPriorityClasses, emitPriorityClasses, GetPriorityClassByName
    secret.go             # ListSecrets, emitSecrets, UpdateSecret, GetSecretByName, WatchSecretDetail, UnwatchSecretDetail, emitSecretDetail (scoped detail-push, singular "secret:update" topic — see [[architecture_decisions#scoped-detail-push-pattern]])
    resourcequota.go      # ListResourceQuotas, emitResourceQuotas, CreateResourceQuota, DeleteResourceQuota, GetResourceQuotaByName, WatchResourceQuotaDetail, UnwatchResourceQuotaDetail, emitResourceQuotaDetail (scoped detail-push)
    limitrange.go         # ListLimitRanges, emitLimitRanges, CreateLimitRange, DeleteLimitRange, GetLimitRangeByName, WatchLimitRangeDetail, UnwatchLimitRangeDetail, emitLimitRangeDetail (scoped detail-push)
    hpa.go                # ListHPAs, emitHPAs, GetHPAByName, WatchHPADetail, UnwatchHPADetail, emitHPADetail (scoped detail-push)
    pdb.go                # ListPodDisruptionBudgets, emitPodDisruptionBudgets, GetPodDisruptionBudgetByName, WatchPodDisruptionBudgetDetail, UnwatchPodDisruptionBudgetDetail, emitPodDisruptionBudgetDetail (scoped detail-push)
    ingress.go            # ListIngresses, emitIngresses, GetIngressByName, WatchIngressDetail, UnwatchIngressDetail, emitIngressDetail (scoped detail-push)
    ingressclass.go       # ListIngressClasses, emitIngressClasses
    networkpolicy.go      # ListNetworkPolicies, emitNetworkPolicies, GetNetworkPolicyByName, WatchNetworkPolicyDetail, UnwatchNetworkPolicyDetail, emitNetworkPolicyDetail (scoped detail-push)
    endpoint.go           # ListEndpoints, emitEndpoints
    endpointslice.go      # ListEndpointSlices, emitEndpointSlices
    service.go            # ListServices, emitServices
    node.go               # ListNodes, emitNodes (includes metrics), GetNodeByName
    namespace.go          # ListNamespaces, emitNamespaces
    pvc.go                # ListPersistentVolumeClaims, emitPersistentVolumeClaims, GetPersistentVolumeClaimByName, WatchPersistentVolumeClaimDetail, UnwatchPersistentVolumeClaimDetail, emitPersistentVolumeClaimDetail (scoped detail-push)
    pv.go                 # ListPersistentVolumes, emitPersistentVolumes, GetPersistentVolumeByName, WatchPersistentVolumeDetail(name), UnwatchPersistentVolumeDetail(name), emitPersistentVolumeDetail (scoped detail-push, cluster-scoped so name-only signature)
    storageclass.go       # ListStorageClasses, emitStorageClasses, GetStorageClassByName
    serviceaccount.go     # ListServiceAccounts, emitServiceAccounts
    clusterrole.go        # ListClusterRoles, emitClusterRoles
    clusterrolebinding.go # ListClusterRoleBindings, emitClusterRoleBindings
    rolebinding.go        # ListRoleBindings, emitRoleBindings
    role.go               # ListRoles, emitRoles
    event.go              # ListEvents, emitEvents
    portforward.go        # ListPortForwards, StartPortForward (SPDY tunnel via client-go portforward; podPort validates 1-65535; localPort validates 0-65535 allowing "0" for OS-assigned random; cap 20 sessions; 30s ready timeout; calls pfw.GetPorts() after ready to store actual local port; returns dto.StartResult{ID, LocalPort}), StopPortForward (sets Status="Stopped", cancels goroutine, keeps entry in map), RemovePortForward (deletes entry from map entirely), emitPortForwards; helpers: validatePort, validateLocalPort, resolvePodName (pod direct / service selector→pod), monitorPortForward (skips deletion if Status=="Stopped")
    context.go            # GetContexts, GetCurrentContext
    settings.go           # OpenAbout, Quit, ExecJS, OpenSettings, ClipboardGetText, SaveSettings, GetSettings
    shell.go              # resolveLoginShellPATH — sources login shell at startup to fix exec credential plugins (aws, gcloud) on macOS
    updater.go            # checkForUpdate, PerformUpdate (uses INSTALL_SCRIPT_URL from .env)
    utils.go              # nsFromObj (informer event/tombstone → namespace), isActive(ctx) (debouncer moved out to internal/config/debouncer.go 2026-07-22)
    utils_test.go         # TestIsActive (debouncer tests moved to internal/config/debouncer_test.go 2026-07-22)
    logs.go               # PodLogsStream (websocket streaming via xterm.js), PodExecStream (interactive exec session)
    logs_exec_test.go     # unit tests
    exec.go               # pod exec logic
    fullscreen_darwin.go  # macOS fullscreen window API (.m file via cgo)
    fullscreen_other.go   # other OS fullscreen stubs
    validatingwebhookconfig.go  # ListValidatingWebhookConfigs, emitValidatingWebhookConfigs, GetValidatingWebhookConfigByName, WatchValidatingWebhookConfigDetail(name), UnwatchValidatingWebhookConfigDetail(name), emitValidatingWebhookConfigDetail (scoped detail-push, cluster-scoped so name-only signature; NOTE: uses waitForResourceSync not the ...IgnoringForbidden variant, matching its existing sibling functions)
    detail_watch.go       # NEW 2026-09 (renamed from detailwatch.go same month): package-level detailWatch type shared by every scoped-detail-push resource (Secret, ResourceQuota, PVC, HPA, LimitRange, NetworkPolicy, PodDisruptionBudget, Ingress, PersistentVolume, ValidatingWebhookConfig) — single mutex-guarded (namespace, name) key (not a refcounted map, since only one detail drawer per kind can be open at a time): watch(namespace, name), unwatch(namespace, name) (no-ops if the key no longer matches, guarding a stale unwatch), get() (namespace, name string, ok bool); detailWatchKey/splitDetailWatchKey package-level helpers; cluster-scoped kinds always key with namespace=""
    # plugin_invoke.go / plugin_invoke_test.go REMOVED (2026-08-27, commit 29629aa "native gRPC pub/sub for host-plugin comms"): the old App.InvokePlugin(pluginID, method, payloadJSON) unary RPC (and pb.SetClusterContext sync-on-call) is gone. All plugin.go code now lives in the single internal/app/plugin.go (37.8K, no more plugin_*.go split beyond tests) — the frontend-facing entry point for business-logic calls is App.GetPluginBackendAddr(pluginID) (string, error), which returns a 127.0.0.1:<httpPort> address (lazily relaunching the plugin and TCP-dial-health-checking before returning) that the frontend/plugin bundle then talks to directly over plain HTTP. Host->plugin push events (cluster context switch, active-namespace-filter change) go the other way, over the native gRPC pub/sub channel: a.emitActiveContextToPlugins/a.emitActiveNamespacesToPlugins call a.grpcServerCfg.PluginServer().PublishToHost(topic, payloadJSON) using packages/core/util.EventTopicClusterContext/EventTopicNamespacesActive as topic names. See internal/api/grpc/ below for the server side. UPDATED 2026-08-29 (commit 2608fe4, see [[gotcha_cluster_switch_ack_race]]): emitActiveContextToPlugins/emitActiveNamespacesToPlugins now call server.PublishAndAwaitAck (not PublishToHost) and block (bounded, fail-open, pluginAckTimeout = 2s) until every running plugin acks having applied the push, instead of firing-and-forgetting it — closing the window where a plugin's HTTP backend (reachable directly by its own frontend, bypassing the host) could serve a business call against the stale value. clearPluginClusterState(), called first by Connect() before any of the above, pushes `{"clearing": true}` on both topics the same acked way so plugins drop their cached value *before* the host has even resolved the new one — turning the race's failure mode from "silently the wrong cluster" into "no active context yet". runningPluginCount() (a.pluginsMu-guarded len(a.pluginLoaders)) supplies the "how many acks to expect" bound; a plugin starting/exiting mid-wait makes this best-effort by design, not a bug.
    plugin_status_test.go # NEW 2026-07-25: TestGetInstalledPluginNotInstalled (RENAMED 2026-07-30 from TestGetPluginStatusNotInstalled; split out of internal/plugin/loader_test.go during the plugin-package extraction since it exercises App.GetInstalledPlugin, not PluginLoader)
    plugin_restore_test.go # RENAMED 2026-07-30 from restore_plugins_test.go (git mv, no content change) — table-driven tests for restoreInstalledPlugins() (new-format metadata, legacy .bundle-sha256 migration, corrupted/incomplete legacy installs skipped via TestRestoreInstalledPluginsWithoutBundle); name now matches the plugin_*.go convention used by plugin.go/plugin_proxy_helm.go/plugin_status_test.go
    plugin_remove_test.go  # NEW 2026-07-31: RemovePlugin coverage — TestRemovePluginNotInstalled (neither in loader map nor on disk -> error), plus cases for removing a READY plugin (loader Shutdown + dir deletion), an orphaned on-disk-only install, rejecting removal while INSTALLING, and the removingPluginIDs flag blocking a concurrent InstallPlugin
  /plugin/                # NEW 2026-07-25: package plugin, extracted from internal/app (files were prefixed plugin_*.go there) to avoid coupling plugin lifecycle code to the App god-object; internal/app now imports this package and qualifies all references as plugin.PluginLoader/plugin.PluginStatus*/plugin.NewPluginLoader/plugin.NewPluginAssetHandler
    assets.go             # (moved from internal/app/plugin_assets.go) NewPluginAssetHandler — serves /api/plugins/{pluginID}/* from storage.Dir("plugins")/{pluginID}/* with path-traversal protection; wired into main.go's AssetServer.Handler; FIX 2026-07-28: pluginDistDir previously appended an extra "dist" segment even though callers' URLs already include "dist/index.js", producing a nonexistent .../dist/dist/index.js and 404ing every plugin bundle — see [[gotcha_plugin_asset_handler_double_dist]]
    assets_test.go        # NEW 2026-07-28: TestPluginAssetHandlerServesDistIndex, TestPluginAssetHandlerRejectsPathTraversal — regression coverage for the double-dist path bug
    loader.go             # (moved from internal/app/plugin_loader.go, package renamed app->plugin) PluginLoader (id/binaryPath/lockFilePath/status/health-loop cancel func + optional TokenManager). REWRITTEN 2026-08-27 (commit 29629aa): the plugin's own gRPC client/conn fields are gone from this struct — plugin business-logic calls no longer go through PluginLoader at all (see HTTPPort() below); Launch(ctx, kubeconfigPath) spawns the subprocess, parses the one-line JSON READY handshake (validateHandshake requires type=="READY" and an in-range httpPort field — NOT grpcPort), lock-file-dedups (writeLockFile(pid, httpPort)/readLockFile), and — if SetHostGRPCPort/SetTokenManager were called first — passes the host's gRPC pub/sub port + a per-launch auth token to the plugin subprocess so it can dial back and Subscribe/Publish; FIX 2026-09-22: every launch also sets `GALACIUS_ROOT_DIR=storage.Dir()` on the subprocess env (previously only `GALACIUS_HOST_GRPC_PORT` was forwarded), so plugins persist their per-plugin data alongside the host's resolved storage root (which already differs between `wails dev` and production) instead of always falling back to their own production-only `~/.galacius` default; HTTPPort() (int, error) reads the plugin's own HTTP listener port from the lock file, used by App.GetPluginBackendAddr for the frontend's business-logic HTTP calls; Status()/LastError()/BinaryPath()/Shutdown() unchanged. PluginStatus enum NOT_INSTALLED|INSTALLING|READY|CRASHED|INCOMPATIBLE. TokenManager (interface, new 2026-08-27) is implemented by internal/api/grpc's GRPCServerConfig — decouples internal/plugin from internal/api/grpc to avoid an import cycle.
    token_lifecycle_test.go  # NEW 2026-08-27: covers per-plugin-launch auth token issuance/rotation via TokenManager
    # /pb/ (packages/core/pb) REWRITTEN 2026-08-27 (commit 29629aa "native gRPC pub/sub for host-plugin comms"): the old per-purpose contract (GetCapabilities, SetClusterContext, Invoke(method,payloadJson), plus separate ClusterContextWatch/ActiveNamespacesWatch/EmitEvent streams) is GONE. The `Plugin` gRPC service now exposes exactly two generic RPCs: `Subscribe(SubscribeRequest{topic}) returns (stream PubSubMessage{topic,source,timestamp,payload_json})` and `Publish(PublishRequest{topic,payload_json}) returns (Empty)` — a topic-based pub/sub broker, not a method-dispatch RPC. Plugins may only Publish under their own `plugins.<pluginID>.*` topic prefix; the host publishes under host-owned topic names (packages/core/util.EventTopicClusterContext="cluster.context", EventTopicNamespacesActive="namespaces.active"). Plugin business-logic calls (the old Invoke) are no longer gRPC at all — see App.GetPluginBackendAddr note above. internal/ and internal/app must still never import a concrete plugin's own package, see [[gotcha_generic_plugin_grpc_boundary]]
    loader_test.go        # (moved from internal/app/plugin_loader_test.go) handshake validation, lock-file round-trip, concurrent Status(), handshake-goroutine-returns-promptly regression test; the GetInstalledPlugin-unknown-plugin case (renamed from GetPluginStatus 2026-07-30) moved to internal/app/plugin_status_test.go since it needs *App
    download.go           # NEW 2026-07-27 Phase D: Manifest struct + FetchLatestRelease(owner, repo) / FetchManifest(assets, pluginID) / ResolveAssetNames(pluginID, goos, goarch) / IsPlatformSupported(manifest, goos, goarch) / IsHostVersionCompatible(hostVersion, min, max) / DownloadToFile(url, destPath) / VerifySHA256(path, expectedHex); uses github.com/Masterminds/semver/v3 for version compatibility checking (now a direct dependency, promoted from indirect); FIX 2026-07-27: exact-match short-circuit at top of IsHostVersionCompatible — hostVersion == appversion.Dev (imported as "github.com/galacius/galacius/internal/version") returns (true, nil) instead of erroring, fixing "Failed to install Helm: version check: parsing host version \"dev\": invalid semantic version" crash on dev builds; scoped narrowly to the exact dev sentinel only (NOT any non-semver string) so production builds with a genuinely malformed version still error correctly; appversion.Dev is the SAME constant that version.go's `var Version = version.Dev` uses and that flows through main.go->app.NewApp(Version)->App.version->GetVersion()->frontend AboutModal's payload.version — see [[version_package]]; mirrors the frontend bypass already added to PluginCard.tsx in commit 4d16b3b, but that only gated the UI button — this fixes the actual backend install path in app.go's async install goroutine
    download_test.go      # NEW 2026-07-27 Phase D: 57 table-driven test cases covering all download.go functions; ResolveAssetNames tests (linux/darwin/windows, .exe suffix), IsPlatformSupported (valid/invalid arch/os), IsHostVersionCompatible (boundaries, out-of-range, invalid versions), VerifySHA256 (match/mismatch, case-insensitive), DownloadToFile (success/http-error/nested-dirs, temp-file cleanup), FetchLatestRelease/FetchManifest integration tests; all tests pass (go test -race ./internal/plugin...); UPDATED 2026-07-27: added "dev build sentinel always compatible" (hostVersion="dev" -> compatible=true) and "other non-semver build string still errors" (hostVersion="custom-build" -> error) cases; "invalid host version" case still expects an error, confirming the bypass is scoped to the exact "dev" string only
    isprocessalive_unix.go    # (moved from internal/app/) //go:build !windows; syscall.Kill(pid, 0) (ESRCH=dead, EPERM=alive-no-permission)
    isprocessalive_windows.go # (moved from internal/app/) //go:build windows; golang.org/x/sys/windows OpenProcess+GetExitCodeProcess (STILL_ACTIVE=259); split into build-tag files because syscall.Kill does not exist on windows and this app ships a windows-latest CI build target
  /plugins/               # (2026-07-23: helm subpackage moved OUT to /plugins/helm/go/ at repo root, then out of go/ entirely in Phase B — see below; this dir may now be empty/removed if helm was the only occupant)
  /api/grpc/              # NEW 2026-08-27 (commit 29629aa "native gRPC pub/sub for host-plugin comms"): package grpc — the host's side of the plugin pub/sub channel, separate from internal/plugin so internal/plugin's TokenManager interface (implemented here) doesn't create an import cycle
    config.go             # GRPCServerConfig — starts the host gRPC server on 127.0.0.1:0 (auto-assigned port, NewGRPCServerConfig(eventEmitFn)), wires auth + stream interceptors, registers pb.RegisterPluginServer; deliberately does NOT register gRPC reflection (security: don't expose schema to arbitrary same-host callers); Port()/PluginServer()/Stop() accessors; owns the AuthTokenManager instance
    server.go             # HostPluginServer implements pb.PluginServer's Subscribe/Publish via an internal PubSubBroker (topic->subscriber-channels map); Subscribe replays the last message to late joiners on host-owned topics only (plugin topics get no replay); enforces the plugins.<pluginID>.* publish-namespace rule (a plugin authenticated as pluginID may only Publish under its own prefix; the host, unauthenticated by pluginID, may publish any topic); PublishToHost(topic, payloadJSON) is the internal/app-facing entry point used by emitActiveContextToPlugins/emitActiveNamespacesToPlugins. NEW 2026-08-29 (commit 2608fe4 "clear-first + synchronous-acked push to close cluster-switch race", see [[gotcha_cluster_switch_ack_race]]): PublishAndAwaitAck(topic, payloadJSON, expected, timeout) merges a fresh UUID `requestId` into payloadJSON, publishes it, and blocks until `expected` distinct acks arrive on that requestId or timeout elapses (returns the count actually acked — callers must treat a partial count as fail-open, not an error); ackWaiters (map[requestID]chan struct{}, guarded by the existing s.mu) tracks in-flight waits; isAckTopic(topic) (suffix ".ack") routes a plugin's "plugins.<id>.ack" Publish to the matching waiter's channel instead of (also) bridging it to the frontend as a plugin event — an ack is host-internal bookkeeping the UI doesn't need to see
    interceptor.go        # AuthTokenManager (token->pluginID map, mutex-guarded; RegisterToken/RemoveToken/ResolveToken) + UnaryServerInterceptor/StreamServerInterceptor — extract a bearer token from gRPC metadata ("authorization" header), reject unary/stream calls with an unknown/missing token, stash the resolved pluginID on the request context for handlers to read
    config_test.go / security_test.go  # security_test.go covers interceptor auth (missing/malformed/unknown/valid token, unary+stream) and the pub/sub broker's topic-validation + publish-namespace + replay-on-late-join + ring-buffer-drops-oldest-when-full behavior
  /version/               # NEW 2026-07-27
    version.go            # package version; const Dev = "dev" — single source of truth for the dev-build sentinel, imported by root /version.go (as `var Version = version.Dev`) and internal/plugin/download.go (IsHostVersionCompatible's dev-build bypass check), so both trace back to the same value GetVersion() exposes to the frontend AboutModal
  /storage/                 # NEW 2026-08-11 (commit 30f62c4): package storage — resolves ~/.galacius directory, THE single source of truth for persistent app data location (settings, installed plugins)
    storage.go              # Dir(elem ...string) string — returns ~/.galacius, optionally joined with path elements; falls back to $HOME env var if os.UserHomeDir() fails; imported by internal/config/config.go (settings path resolution) and internal/app/plugin.go (plugins root dir, injected into internal/plugin/assets.go's NewPluginAssetHandler as the resolvePluginDir callback via a.PluginAssetDir — assets.go itself has no direct storage import); replaces scattered os.UserConfigDir() calls and hardcoded `~/.config/galacius` paths throughout the codebase
  /config/
    config.go             # Load/Save settings from ~/.galacius/settings.json (CHANGED 2026-08-11 from ~/.config/galacius/settings.json via commit 30f62c4 "move app dir into ~/.galacius", now uses storage.Dir("settings.json")); Settings{AccessToken, ClusterProxies, PluginsDir, MarketplaceRepositories, KubeconfigPaths, Locale, ShellPath} (updated 2026-07-19, commit 1b9b8f44: Variables/Secrets replaced by AccessToken/KubeconfigPaths/Locale; UPDATED 2026-08-01: PluginsDir + MarketplaceRepositories added; TerminalCopyPaste removed)
    utils.go              # getInstallScriptURL, getEnvOrDefault
    debouncer.go          # Debouncer/NewDebouncer/Trigger + DefaultDebounceInterval (300ms) const; moved from internal/app/utils.go 2026-07-22, exported for cross-package use; used by app.go's debLeases/debEvents/debEndpoints/debEndpointSlices/debPods
    debouncer_test.go     # 5 debouncer unit tests, moved from internal/app/utils_test.go 2026-07-22
  /updater/
    updater.go            # GitHub Releases update checker; Check(version, token) → *Release; UPDATED 2026-08-11 (commit 606bcfc): refactored to split authenticated (private repo + token) vs unauthenticated (public repo, no token) update paths
    manifest.go           # NEW 2026-08-11 (commit 606bcfc): Manifest/ManifestArtifact types — single source of truth for release artifacts (OS/Arch/Filename/SHA256/Size), generated once per release as manifest.json in GitHub releases, consumed by both install.sh and unauthenticated_updater.go to avoid per-consumer hardcoded filename mappings
    authenticated_updater.go  # NEW 2026-08-11: authenticated update path for private repos (uses GALACIUS_ACCESS_TOKEN); fetches GitHub releases API, validates version compatibility, downloads binary+bundle, verifies SHA256, executes installer script
    authenticated_updater_test.go  # NEW 2026-08-11: comprehensive tests for authenticated updater
    unauthenticated_updater.go  # NEW 2026-08-11: unauthenticated update path for public repos; fetches manifest.json from release, parses artifact list, downloads and verifies against manifest
    unauthenticated_updater_test.go  # NEW 2026-08-11: tests for unauthenticated updater (manifest parsing, download verification, platform detection)
    utils.go              # NEW 2026-08-11: helper functions shared between authenticated and unauthenticated paths
  /kube/
    config.go             # ListContexts(), CurrentContext()
    client.go             # NewClientset(contextName) — returns clientset + rest.Config
    metrics.go            # FetchNodeMetrics() → map[string]dto.NodeUsage; NewMetricsClientForContext()
    informers.go          # NewFactoryHandle(cs, onForbidden) — SharedInformerFactory, pre-registers all informers, sets WatchErrorHandler on each to detect 403s and call onForbidden(resourceKey)
    /resources/           # package resources — k8s→DTO conversion + list functions (types live in packages/core/kube/dto — moved from internal/dto, which was deleted 2026-08-18 once every importer migrated; dto itself moved from packages/core/dto to packages/core/kube/dto on 2026-08-27)
      common.go           # humanAge helper
      pod.go              # toPod, ListPods
      deployment.go       # toDeployment, ListDeployments
      daemonset.go        # toDaemonSet, ListDaemonSets
      statefulset.go      # toStatefulSet, ListStatefulSets
      replicaset.go       # toReplicaSet, ListReplicaSets
      service.go          # toService, ListServices
      endpoint.go         # toEndpoint, ListEndpoints
      endpointslice.go    # toEndpointSlice, ListEndpointSlices
      configmap.go        # toConfigMap, ListConfigMaps
      lease.go            # toLease, ListLeases, GetLeaseByName
      priorityclass.go    # toPriorityClass, ListPriorityClasses, GetPriorityClassByName
      node.go             # toNode (populates all detail fields; nil maps initialized to empty), ListNodes, ApplyNodeMetrics, GetNodeByName
      namespace.go        # ListNamespaces (populates all detail fields incl. ManagedFields via sigsyaml.JSONToYAML; ResourceQuotas/LimitRanges are stubbed []string{})
      secret.go           # toSecret, ListSecrets
      cronjob.go          # toCronJob, ListCronJobs
      job.go              # toJob, ListJobs
      resourcequota.go    # toResourceQuota, ListResourceQuotas
      limitrange.go       # toLimitRange, ListLimitRanges
      hpa.go              # toHPA, ListHPAs
      pdb.go              # toPodDisruptionBudget, ListPodDisruptionBudgets
      ingress.go          # toIngress, ListIngresses, GetIngressByName
      ingressclass.go     # toIngressClass, ListIngressClasses, GetIngressClassByName
      networkpolicy.go    # toNetworkPolicy, ListNetworkPolicies
      pvc.go              # toPersistentVolumeClaim, ListPersistentVolumeClaims (cross-refs pod lister for Pods column)
      pv.go               # toPersistentVolume, ListPersistentVolumes, GetPersistentVolumeByName
      storageclass.go     # toStorageClass, ListStorageClasses, GetStorageClassByName
      serviceaccount.go   # toServiceAccount, ListServiceAccounts
      clusterrole.go      # toClusterRole, ListClusterRoles
      clusterrolebinding.go # toClusterRoleBinding, ListClusterRoleBindings
      rolebinding.go      # toRoleBinding, ListRoleBindings
      role.go             # toRole, ListRoles
      event.go            # toEvent, ListEvents
      validatingwebhookconfig.go  # toValidatingWebhookConfig, ListValidatingWebhookConfigs, GetValidatingWebhookConfigByName
      ingress_test.go     # (+ tests)
      lease_test.go       # (+ tests)
      limitrange_test.go  # (+ tests)
      node_test.go        # (+ tests)
      node_edge_test.go   # (+ tests)
      pod_test.go         # (+ tests)
```
