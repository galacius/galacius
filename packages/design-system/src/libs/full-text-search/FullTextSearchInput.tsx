import { FC } from "react";
import { SearchIcon } from "../../atoms/icon";
import { Input } from "../../atoms/input";

interface FullTextSearchInputProps {
  searchTerm: string;
  matchCount: number;
  currentMatchIdx: number;
  onSearch: (term: string) => void;
  onSearchNext: () => void;
  ariaLabel?: string;
}

export const FullTextSearchInput: FC<FullTextSearchInputProps> = ({
  searchTerm,
  matchCount,
  currentMatchIdx,
  onSearch,
  onSearchNext,
  ariaLabel = "Search",
}) => (
  <div className="relative">
    <SearchIcon className="absolute top-1/2 left-1.5 size-3 -translate-y-1/2 text-muted-foreground" />
    <Input
      className="h-6 w-44 pr-9 pl-6 text-xs"
      placeholder="Search…"
      value={searchTerm}
      onChange={(e) => onSearch(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSearchNext();
        }
      }}
      aria-label={ariaLabel}
    />
    <output
      aria-live="polite"
      className="absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
    >
      {searchTerm ? (matchCount === 0 ? "0" : `${currentMatchIdx + 1}/${matchCount}`) : ""}
    </output>
  </div>
);
