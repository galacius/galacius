import { FC } from "react";
import { RbacDetailDrawers } from "./RbacDetailDrawers";
import { NetworkDetailDrawers } from "./NetworkDetailDrawers";
import { WorkloadDetailDrawers } from "./WorkloadDetailDrawers";
import { ConfigStorageDetailDrawers } from "./ConfigStorageDetailDrawers";
import { ClusterDetailDrawers } from "./ClusterDetailDrawers";

export const DetailBlock: FC<{ onNavigateToPortForwarding: () => void }> = ({
  onNavigateToPortForwarding,
}) => (
  <>
    <RbacDetailDrawers />
    <NetworkDetailDrawers onNavigateToPortForwarding={onNavigateToPortForwarding} />
    <WorkloadDetailDrawers onNavigateToPortForwarding={onNavigateToPortForwarding} />
    <ConfigStorageDetailDrawers />
    <ClusterDetailDrawers />
  </>
);
