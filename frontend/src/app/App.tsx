import { ErrorBoundary, Toaster, TooltipProvider } from "@galacius/design-system";
import { useQueryClient } from "@tanstack/react-query";
import { FC, useEffect, useReducer, useRef } from "react";
import { AboutModal } from "./about/AboutModal";
import { useMenuOpenAboutEvents } from "./about/hooks/async-events/useMenuOpenAboutEvents";
import { AppFooter } from "./footer/AppFooter";
import { ClusterRail } from "./ClusterRail";
import { ClusterSettingsModal } from "./clusters/ClusterSettingsModal";
import { ConnectingView } from "./clusters/ConnectingView";
import { MainLayout } from "./clusters/MainLayout";
import { MarketplaceView } from "./marketplace/MarketplaceView";
import { PluginRegistryReconciler } from "./plugins/PluginRegistryReconciler";
import type { Section } from "./settings/components/types";
import { useMenuOpenSettingsEvents } from "./settings/hooks/async-events/useMenuOpenSettingsEvents";
import { SettingsView } from "./settings/SettingsView";
import { useKubeconfigChangedEvents } from "./shared/hooks/async-events/useKubeconfigChangedEvents";
import { usePluginsChangedEvents } from "./shared/hooks/async-events/usePluginsChangedEvents";
import { useGetContextsGrouped } from "./shared/hooks/data-access/useGetContextsGrouped";
import { useConnect } from "./shared/hooks/useConnect";
import { useIsMarketplaceEnabled } from "./shared/hooks/useIsMarketplaceEnabled";
import { useGetVersion } from "./updater/hooks/data-access/useGetVersion";
import { useUpdateAvailableEvents } from "./updater/hooks/async-events/useUpdateAvailableEvents";
import { UpdateModal } from "./updater/UpdateModal";

type AboutPayload = {
  version: string;
  go: string;
  wails: string;
  k8sClient: string;
  appSizeBytes: string;
  installSource: string;
};

type AppState = {
  activeContext: string;
  connectedContexts: Set<string>;
  connectingContext: string | null;
  connectFailedCtx: string | null;
  connectAttempt: number;
  settingsOpen: boolean;
  settingsSection: Section;
  marketplaceOpen: boolean;
  aboutOpen: boolean;
  aboutPayload: AboutPayload | null;
  clusterSettingsCtx: string | null;
};

type AppAction =
  | { type: "CONNECT_START"; ctx: string; attempt: number }
  | { type: "CONNECT_SUCCESS"; ctx: string; attempt: number }
  | { type: "CONNECT_FAIL"; ctx: string; attempt: number }
  | { type: "CONNECT_DONE" }
  | { type: "CLEAR_CONNECT_FAIL" }
  | { type: "SET_SETTINGS_OPEN"; open: boolean; section?: Section }
  | { type: "SET_MARKETPLACE_OPEN"; open: boolean }
  | { type: "OPEN_ABOUT"; payload: AboutPayload }
  | { type: "CLOSE_ABOUT" }
  | { type: "OPEN_CLUSTER_SETTINGS"; ctx: string }
  | { type: "CLOSE_CLUSTER_SETTINGS" };

const initialState: AppState = {
  activeContext: "",
  connectedContexts: new Set(),
  connectingContext: null,
  connectFailedCtx: null,
  connectAttempt: 0,
  settingsOpen: false,
  settingsSection: "welcome",
  marketplaceOpen: false,
  aboutOpen: false,
  aboutPayload: null,
  clusterSettingsCtx: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "CONNECT_START":
      return {
        ...state,
        connectingContext: action.ctx,
        connectFailedCtx: null,
        connectAttempt: action.attempt,
      };
    case "CONNECT_SUCCESS": {
      if (action.attempt !== state.connectAttempt) return state;
      const next = new Set(state.connectedContexts);
      next.add(action.ctx);
      return {
        ...state,
        connectedContexts: next,
        activeContext: action.ctx,
        connectingContext: null,
        connectFailedCtx: null,
      };
    }
    case "CONNECT_FAIL":
      if (action.attempt !== state.connectAttempt) return state;
      return { ...state, connectingContext: null, connectFailedCtx: action.ctx };
    case "CONNECT_DONE":
      return { ...state, connectingContext: null };
    case "CLEAR_CONNECT_FAIL":
      return { ...state, connectFailedCtx: null };
    case "SET_SETTINGS_OPEN":
      return {
        ...state,
        settingsOpen: action.open,
        settingsSection: action.section ?? state.settingsSection,
        marketplaceOpen: action.open ? false : state.marketplaceOpen,
      };
    case "SET_MARKETPLACE_OPEN":
      return {
        ...state,
        marketplaceOpen: action.open,
        settingsOpen: action.open ? false : state.settingsOpen,
      };
    case "OPEN_ABOUT":
      return { ...state, aboutOpen: true, aboutPayload: action.payload };
    case "CLOSE_ABOUT":
      return { ...state, aboutOpen: false };
    case "OPEN_CLUSTER_SETTINGS":
      return { ...state, clusterSettingsCtx: action.ctx };
    case "CLOSE_CLUSTER_SETTINGS":
      return { ...state, clusterSettingsCtx: null };
  }
}

const AppContent: FC<{
  settingsOpen: boolean;
  settingsSection: Section;
  marketplaceOpen: boolean;
  activeContext: string;
  connectingContext: string | null;
  connectFailedCtx: string | null;
  connectAttempt: number;
  onOpenMarketplace: () => void;
  onGoToMarketplaceSettings: () => void;
  onReconnect: () => void;
  onOpenClusterSettings: () => void;
}> = ({
  settingsOpen,
  settingsSection,
  marketplaceOpen,
  activeContext,
  connectingContext,
  connectFailedCtx,
  connectAttempt,
  onOpenMarketplace,
  onGoToMarketplaceSettings,
  onReconnect,
  onOpenClusterSettings,
}) => {
  const isMarketplaceEnabled = useIsMarketplaceEnabled();
  if (marketplaceOpen && isMarketplaceEnabled) {
    return <MarketplaceView onGoToMarketplaceSettings={onGoToMarketplaceSettings} />;
  }
  if (settingsOpen) {
    return <SettingsView initialSection={settingsSection} />;
  }
  if (connectingContext) {
    return (
      <ConnectingView
        key={`${connectingContext}-${connectAttempt}`}
        contextName={connectingContext}
        failed={false}
      />
    );
  }
  if (connectFailedCtx) {
    return (
      <ConnectingView
        key={`${connectFailedCtx}-${connectAttempt}`}
        contextName={connectFailedCtx}
        failed={true}
        onReconnect={onReconnect}
        onOpenClusterSettings={onOpenClusterSettings}
      />
    );
  }
  if (activeContext) {
    return (
      <MainLayout
        key={activeContext}
        activeContext={activeContext}
        onOpenMarketplace={onOpenMarketplace}
      />
    );
  }
  return <SettingsView initialSection="welcome" />;
};

export const App: FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const {
    activeContext,
    connectedContexts,
    connectingContext,
    connectFailedCtx,
    connectAttempt,
    settingsOpen,
    settingsSection,
    marketplaceOpen,
    aboutOpen,
    aboutPayload,
    clusterSettingsCtx,
  } = state;

  const { data: currentVersion = "" } = useGetVersion();
  const { data: contextGroups, error } = useGetContextsGrouped();
  const groups = contextGroups ?? [];

  const { mutate: connect } = useConnect();

  useKubeconfigChangedEvents();
  usePluginsChangedEvents();
  useMenuOpenSettingsEvents(() =>
    dispatch({ type: "SET_SETTINGS_OPEN", open: true, section: "welcome" })
  );
  useMenuOpenAboutEvents((payload) => dispatch({ type: "OPEN_ABOUT", payload }));
  const { updateInfo, updateModalOpen, setUpdateModalOpen, dismissUpdate } =
    useUpdateAvailableEvents();

  const contexts = groups.flatMap((g) => g.contexts);

  const queryClient = useQueryClient();
  const prevContextRef = useRef("");
  const connectAttemptRef = useRef(0);

  // Evict every cluster-scoped query for a previously-visited context (any of
  // them, not just the one being left) when switching clusters, so a cluster
  // revisited later starts fresh instead of briefly showing data cached from
  // an earlier visit.
  //
  // Deliberately excludes activeContext itself: connectedContexts already
  // contains the context we're switching INTO by the time this effect runs
  // (CONNECT_SUCCESS adds it before this render), and React fires child
  // effects before parent effects in the same commit — so the freshly
  // mounted MainLayout for that context (key={activeContext}) has already
  // kicked off its own queries (e.g. useGetNamespaceNames) by the time this
  // runs. Without the exclusion, removeQueries would immediately discard
  // that brand-new in-flight fetch's result, and since DEFAULT_QUERY_OPTIONS
  // sets retry: false, nothing re-triggers it — leaving queries like
  // namespaceNames stuck empty for that mount. This was invisible in dev
  // because React.StrictMode (main.tsx) double-invokes effects there only,
  // and the extra, later re-fetch from the second invocation usually landed
  // after this effect's cleanup pass — masking the race that a production
  // build's single effect invocation exposes every time.
  useEffect(() => {
    const prev = prevContextRef.current;
    if (prev && prev !== activeContext) {
      queryClient.removeQueries({
        predicate: (query) =>
          query.queryKey.some((k) => {
            const ctx =
              typeof k === "string"
                ? k
                : typeof k === "object" && k !== null && "context" in k
                  ? (k as { context: string }).context
                  : undefined;
            return ctx !== undefined && ctx !== activeContext && connectedContexts.has(ctx);
          }),
      });
    }
    prevContextRef.current = activeContext;
  }, [activeContext, connectedContexts, queryClient]);

  function connectTo(ctx: string) {
    const attempt = ++connectAttemptRef.current;
    dispatch({ type: "CONNECT_START", ctx, attempt });
    connect(ctx, {
      onSuccess: () => dispatch({ type: "CONNECT_SUCCESS", ctx, attempt }),
      onError: () => dispatch({ type: "CONNECT_FAIL", ctx, attempt }),
    });
  }

  function handleSelectCluster(ctx: string) {
    dispatch({ type: "SET_SETTINGS_OPEN", open: false });
    dispatch({ type: "SET_MARKETPLACE_OPEN", open: false });
    if (ctx === activeContext && !connectFailedCtx) return;
    connectTo(ctx);
  }

  return (
    <TooltipProvider>
      <PluginRegistryReconciler />
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {error ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-destructive">{error.message}</p>
            </div>
          ) : (
            <>
              <ClusterRail
                contexts={contexts}
                contextGroups={groups}
                activeContext={connectingContext ?? connectFailedCtx ?? activeContext}
                connectedContexts={connectedContexts}
                connectingContext={connectingContext}
                settingsOpen={settingsOpen}
                marketplaceOpen={marketplaceOpen}
                onSelect={handleSelectCluster}
                onSettingsToggle={() =>
                  dispatch({ type: "SET_SETTINGS_OPEN", open: true, section: "welcome" })
                }
                onMarketplaceToggle={() => dispatch({ type: "SET_MARKETPLACE_OPEN", open: true })}
                onClusterSettings={(ctx) => dispatch({ type: "OPEN_CLUSTER_SETTINGS", ctx })}
              />
              <ErrorBoundary>
                <AppContent
                  settingsOpen={settingsOpen}
                  settingsSection={settingsSection}
                  marketplaceOpen={marketplaceOpen}
                  activeContext={activeContext}
                  connectingContext={connectingContext}
                  connectFailedCtx={connectFailedCtx}
                  connectAttempt={connectAttempt}
                  onOpenMarketplace={() => dispatch({ type: "SET_MARKETPLACE_OPEN", open: true })}
                  onGoToMarketplaceSettings={() =>
                    dispatch({ type: "SET_SETTINGS_OPEN", open: true, section: "marketplace" })
                  }
                  onReconnect={() => {
                    if (connectFailedCtx) connectTo(connectFailedCtx);
                  }}
                  onOpenClusterSettings={() => {
                    if (connectFailedCtx)
                      dispatch({ type: "OPEN_CLUSTER_SETTINGS", ctx: connectFailedCtx });
                  }}
                />
              </ErrorBoundary>
            </>
          )}
        </div>

        <AppFooter
          activeContext={connectingContext ?? connectFailedCtx ?? activeContext}
          updateInfo={updateInfo}
          onUpdateClick={() => setUpdateModalOpen(true)}
        />

        {aboutOpen && aboutPayload && (
          <AboutModal
            payload={aboutPayload}
            onClose={() => dispatch({ type: "CLOSE_ABOUT" })}
            onUpdateAvailable={() => setUpdateModalOpen(true)}
          />
        )}

        {updateInfo && (
          <UpdateModal
            open={updateModalOpen}
            onClose={dismissUpdate}
            currentVersion={currentVersion}
            latestVersion={updateInfo.latestVersion}
            releaseURL={updateInfo.releaseURL}
            downloadSize={updateInfo.downloadSize}
          />
        )}

        <ClusterSettingsModal
          key={clusterSettingsCtx ?? "closed"}
          contextName={clusterSettingsCtx}
          onClose={() => dispatch({ type: "CLOSE_CLUSTER_SETTINGS" })}
        />

        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
};
