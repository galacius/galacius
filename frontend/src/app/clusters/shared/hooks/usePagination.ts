import { useState } from "react";

const DEFAULT_PAGE_SIZE_OPTIONS = [50, 100, 150] as const;

interface UsePaginationOptions {
  pageSizeOptions?: readonly number[];
  /** Pagination resets to page 1 whenever this value changes (e.g. a search term). */
  resetKey?: unknown;
}

export interface UsePaginationResult<T> {
  visibleItems: T[];
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  isPaginated: boolean;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
}

export function usePagination<T>(
  items: T[],
  { pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS, resetKey }: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const [pageSize, setPageSizeState] = useState<number>(pageSizeOptions[0]);
  const [page, setPage] = useState(1);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    if (page !== 1) setPage(1);
  }

  const isPaginated = items.length > pageSizeOptions[0];
  const pageCount = isPaginated ? Math.max(1, Math.ceil(items.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount);
  const visibleItems = isPaginated
    ? items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : items;

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  return {
    visibleItems,
    page: currentPage,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  };
}
