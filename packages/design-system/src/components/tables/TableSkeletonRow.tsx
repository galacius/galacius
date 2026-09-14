import { FC } from "react";
import { TableRow, TableCell } from "../../atoms/table";
import { cn } from "../../utils/common";

const EMPTY_COLUMN_WIDTHS: string[] = [];

export interface TableSkeletonRowProps {
  columns: number;
  includeCheckbox?: boolean;
  columnWidths?: string[];
}

export const TableSkeletonRow: FC<TableSkeletonRowProps> = ({
  columns,
  includeCheckbox = false,
  columnWidths = EMPTY_COLUMN_WIDTHS,
}) => (
  <TableRow>
    {includeCheckbox && (
      <TableCell>
        <div className="h-4 w-4 animate-pulse rounded-[4px] bg-muted" />
      </TableCell>
    )}
    {Array.from({ length: columns }).map((_, i) => (
      <TableCell key={i}>
        <div
          className={cn("h-4 animate-pulse rounded-sm bg-muted", columnWidths[i] ?? "w-[70%]")}
        />
      </TableCell>
    ))}
    <TableCell />
  </TableRow>
);
