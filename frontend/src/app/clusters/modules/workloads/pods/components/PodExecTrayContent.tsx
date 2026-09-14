import { cn, LoadingSpinner } from "@galacius/design-system";
import { FC, lazy, Suspense, useCallback, useReducer } from "react";
import { usePodExec } from "../hooks/usePodExec";
import { PodExecTrayToolbar } from "./PodExecTrayToolbar";
import type { TrayTab } from "./PodTray";

const ExecPanel = lazy(() => import("./ExecPanel").then((m) => ({ default: m.ExecPanel })));

type ExecState = {
  container: string;
};

type ExecAction = { type: "set_container"; container: string };

function execReducer(_: ExecState, action: ExecAction): ExecState {
  return { container: action.container };
}

const initialExecState = (tab: TrayTab): ExecState => ({
  container: tab.containers[0]?.Name ?? "",
});

interface PodExecTrayContentProps {
  tab: TrayTab;
  collapsed: boolean;
}

export const PodExecTrayContent: FC<PodExecTrayContentProps> = ({ tab, collapsed }) => {
  const [state, dispatch] = useReducer(execReducer, tab, initialExecState);

  const { setContainerRef, status, error, reconnect } = usePodExec({
    contextName: tab.contextName,
    ns: tab.ns,
    pod: tab.pod,
    container: state.container,
  });

  const handleContainerChange = useCallback(
    (c: string) => dispatch({ type: "set_container", container: c }),
    []
  );

  return (
    <>
      {/* [B] Toolbar row */}
      <PodExecTrayToolbar
        collapsed={collapsed}
        tab={tab}
        container={state.container}
        onContainerChange={handleContainerChange}
        execStatus={status}
        onReconnect={reconnect}
      />

      {/* [C] Content area */}
      <div className={cn("min-h-0 flex-1 overflow-hidden pl-4", collapsed && "hidden")}>
        <Suspense fallback={<LoadingSpinner />}>
          <ExecPanel
            containerRef={setContainerRef}
            status={status}
            error={error}
            reconnect={reconnect}
          />
        </Suspense>
      </div>
    </>
  );
};
