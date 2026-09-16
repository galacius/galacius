import { FC } from "react";
import { ProxyServer } from "./ProxyServer";
import { Updater } from "./Updater";

interface Props {
  activeContext: string;
  updateInfo: { latestVersion: string; releaseURL: string } | null;
  onUpdateClick: () => void;
}

export const AppFooter: FC<Props> = ({ activeContext, updateInfo, onUpdateClick }) => (
  <footer className="flex shrink-0 items-center gap-3 border-t bg-background px-3 py-2">
    <ProxyServer activeContext={activeContext} />
    {updateInfo && <Updater updateInfo={updateInfo} onUpdateClick={onUpdateClick} />}
  </footer>
);
