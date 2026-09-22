import { Suspense, type FC } from "react";
import { PluginErrorBoundary } from "../clusters/plugins/components/PluginErrorBoundary";
import { usePluginFooterWidgets } from "../plugins/hooks/registry/footer/usePluginFooterWidgets";
import { ProxyServer } from "./ProxyServer";
import { Updater } from "./Updater";

interface Props {
  activeContext: string;
  updateInfo: { latestVersion: string; releaseURL: string } | null;
  onUpdateClick: () => void;
}

export const AppFooter: FC<Props> = ({ activeContext, updateInfo, onUpdateClick }) => {
  const footerWidgets = usePluginFooterWidgets();

  return (
    <footer className="flex shrink-0 items-center gap-3 border-t bg-background px-3 py-2">
      {/** Left side */}
      <ProxyServer activeContext={activeContext} />
      {footerWidgets.map(({ pluginId, widget }) => (
        <PluginErrorBoundary key={pluginId}>
          <Suspense>
            <widget.component />
          </Suspense>
        </PluginErrorBoundary>
      ))}

      {/** Right side */}
      <div className="ml-auto">
        {updateInfo && <Updater updateInfo={updateInfo} onUpdateClick={onUpdateClick} />}
      </div>
    </footer>
  );
};
