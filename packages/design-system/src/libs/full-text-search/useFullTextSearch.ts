import React, { useRef, useState } from "react";

export interface UseFullTextSearchReturn {
  searchTerm: string;
  matchCount: number;
  currentMatchIdx: number;
  setSearchTerm: (term: string) => void;
  setMatchCount: (count: number) => void;
  setCurrentMatchIdx: (idx: number) => void;
  resetMatches: () => void;
}

export interface UseFullTextSearchWithHandlersReturn extends UseFullTextSearchReturn {
  matches: number[];
  activeMatchCharIdx: number;
  contentRef: React.RefObject<HTMLDivElement | null>;
  handleSearch: (term: string) => void;
  handleSearchNext: () => void;
}

export interface UseFullTextSearchOptions {
  text: string;
}

export interface UseFullTextSearchCustomOptions {
  onSearch: (term: string) => void;
  onSearchNext: () => void;
}

export function useFullTextSearch(
  options: UseFullTextSearchOptions
): UseFullTextSearchWithHandlersReturn;
export function useFullTextSearch(options?: undefined): UseFullTextSearchReturn;
export function useFullTextSearch(
  options: UseFullTextSearchCustomOptions
): UseFullTextSearchWithHandlersReturn;
export function useFullTextSearch(
  options?: UseFullTextSearchOptions | UseFullTextSearchCustomOptions
): UseFullTextSearchReturn | UseFullTextSearchWithHandlersReturn {
  const [searchTerm, setSearchTerm] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [matches, setMatches] = useState<number[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  const resetMatches = () => {
    setMatchCount(0);
    setCurrentMatchIdx(0);
  };

  const base: UseFullTextSearchReturn = {
    searchTerm,
    matchCount,
    currentMatchIdx,
    setSearchTerm,
    setMatchCount,
    setCurrentMatchIdx,
    resetMatches,
  };

  // Early return: no options provided
  if (!options) return base;

  // Detect which options type was passed
  const isCustomBackend = "onSearch" in options;

  // Handle custom backend (xterm or similar)
  if (isCustomBackend) {
    const { onSearch, onSearchNext } = options;

    const handleSearch = (term: string) => {
      setSearchTerm(term);
      if (!term) {
        setMatches([]);
        resetMatches();
        return;
      }
      // Delegate to custom backend; it will call onMatchInfo to update count/idx
      onSearch(term);
      setCurrentMatchIdx(0);
    };

    const handleSearchNext = () => {
      if (matchCount === 0) return;
      const nextIdx = (currentMatchIdx + 1) % matchCount;
      setCurrentMatchIdx(nextIdx);
      onSearchNext();
    };

    return {
      ...base,
      matches: [],
      activeMatchCharIdx: -1,
      contentRef,
      handleSearch,
      handleSearchNext,
    };
  }

  // Handle text-based backend (DOM search)
  const { text } = options;

  const scrollToLine = (charIdx: number) => {
    if (!text) return;
    const lineNum = text.slice(0, charIdx).split("\n").length - 1;

    const parseLineHeight = (el: Element) => {
      const raw = globalThis.getComputedStyle(el).lineHeight;
      return raw === "normal" ? 20 : Number.parseFloat(raw) || 20;
    };

    // Edit mode: scroll the textarea directly
    const textarea = contentRef.current?.querySelector("textarea[data-yaml-editor]");
    if (textarea) {
      textarea.scrollTop = Math.max(
        0,
        lineNum * parseLineHeight(textarea) - textarea.clientHeight / 2
      );
      return;
    }

    // Read-only mode: scroll the overflow container
    const scrollableDiv = contentRef.current?.querySelector("[data-yaml-scroll]");
    if (scrollableDiv) {
      scrollableDiv.scrollTop = Math.max(
        0,
        lineNum * parseLineHeight(scrollableDiv) - scrollableDiv.clientHeight / 2
      );
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term || !text) {
      setMatches([]);
      resetMatches();
      return;
    }
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const found: number[] = [];
    let idx = 0;
    let pos: number;
    while ((pos = lowerText.indexOf(lowerTerm, idx)) !== -1) {
      found.push(pos);
      idx = pos + lowerTerm.length;
    }
    setMatches(found);
    setMatchCount(found.length);
    setCurrentMatchIdx(0);
    if (found.length > 0) scrollToLine(found[0]);
  };

  const handleSearchNext = () => {
    if (!matches.length) return;
    const nextIdx = (currentMatchIdx + 1) % matches.length;
    setCurrentMatchIdx(nextIdx);
    scrollToLine(matches[nextIdx]);
  };

  return {
    ...base,
    matches,
    activeMatchCharIdx: matches.length > 0 ? matches[currentMatchIdx] : -1,
    contentRef,
    handleSearch,
    handleSearchNext,
  };
}
