import { FC } from "react";
import { Button } from "../../atoms/button";
import { ChevronLeftIcon, ChevronRightIcon } from "../../atoms/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../atoms/select";

const PAGINATION_SIBLING_COUNT = 1;

function getPageNumbers(currentPage: number, pageCount: number): (number | "ellipsis")[] {
  const totalVisible = PAGINATION_SIBLING_COUNT * 2 + 5;
  if (pageCount <= totalVisible) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(currentPage - PAGINATION_SIBLING_COUNT, 1);
  const rightSibling = Math.min(currentPage + PAGINATION_SIBLING_COUNT, pageCount);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < pageCount - 1;

  const pages: (number | "ellipsis")[] = [1];
  if (showLeftEllipsis) pages.push("ellipsis");
  for (let p = Math.max(leftSibling, 2); p <= Math.min(rightSibling, pageCount - 1); p++) {
    pages.push(p);
  }
  if (showRightEllipsis) pages.push("ellipsis");
  pages.push(pageCount);

  return pages;
}

export interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const TablePagination: FC<TablePaginationProps> = ({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) => {
  const pageNumbers = getPageNumbers(page, pageCount);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            if (!value) return;
            onPageSizeChange(Number(value));
          }}
        >
          <SelectTrigger size="sm" className="w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          {pageNumbers.map((p, idx) =>
            p === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1 text-xs text-muted-foreground select-none"
              >
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon"
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
