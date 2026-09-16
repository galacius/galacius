import { FC } from "react";
import { TableSkeletonRow } from "./TableSkeletonRow";

const EMPTY_COLUMN_WIDTHS: string[] = [];

export interface TableSkeletonLoaderProps {
  rows?: number;
  columns: number;
  includeCheckbox?: boolean;
  columnWidths?: string[];
}

export const TableSkeletonLoader: FC<TableSkeletonLoaderProps> = ({
  rows = 5,
  columns,
  includeCheckbox = false,
  columnWidths = EMPTY_COLUMN_WIDTHS,
}) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <TableSkeletonRow
        key={i}
        columns={columns}
        includeCheckbox={includeCheckbox}
        columnWidths={columnWidths}
      />
    ))}
  </>
);
