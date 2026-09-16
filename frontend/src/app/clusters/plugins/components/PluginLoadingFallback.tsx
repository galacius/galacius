import { FC } from "react";
import { LoadingSpinner, Table, TableBody, TableSkeletonLoader } from "@galacius/design-system";

export const PluginLoadingFallback: FC = () => {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Table>
        <TableBody>
          <TableSkeletonLoader rows={3} columns={4} />
        </TableBody>
      </Table>
      <div className="flex flex-col items-center gap-3 py-8">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">Installing plugin...</p>
      </div>
    </div>
  );
};
