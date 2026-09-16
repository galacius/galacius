import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFullTextSearch } from "../useFullTextSearch";

describe("useFullTextSearch", () => {
  describe("without options (base behavior)", () => {
    it("has correct initial state", () => {
      const { result } = renderHook(() => useFullTextSearch());
      expect(result.current.searchTerm).toBe("");
      expect(result.current.matchCount).toBe(0);
      expect(result.current.currentMatchIdx).toBe(0);
    });

    it("setSearchTerm updates searchTerm", () => {
      const { result } = renderHook(() => useFullTextSearch());
      act(() => {
        result.current.setSearchTerm("hello");
      });
      expect(result.current.searchTerm).toBe("hello");
    });

    it("setMatchCount updates matchCount", () => {
      const { result } = renderHook(() => useFullTextSearch());
      act(() => {
        result.current.setMatchCount(5);
      });
      expect(result.current.matchCount).toBe(5);
    });

    it("setCurrentMatchIdx updates currentMatchIdx", () => {
      const { result } = renderHook(() => useFullTextSearch());
      act(() => {
        result.current.setCurrentMatchIdx(3);
      });
      expect(result.current.currentMatchIdx).toBe(3);
    });

    it("resetMatches resets count and idx to 0", () => {
      const { result } = renderHook(() => useFullTextSearch());
      act(() => {
        result.current.setSearchTerm("test");
        result.current.setMatchCount(5);
        result.current.setCurrentMatchIdx(2);
      });
      act(() => {
        result.current.resetMatches();
      });
      expect(result.current.matchCount).toBe(0);
      expect(result.current.currentMatchIdx).toBe(0);
      expect(result.current.searchTerm).toBe("test");
    });
  });

  describe("with options (handlers and matches)", () => {
    let scrollIntoViewMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView =
        scrollIntoViewMock as unknown as typeof window.HTMLElement.prototype.scrollIntoView;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns handleSearch, handleSearchNext, matches, contentRef when options provided", () => {
      const { result } = renderHook(() => useFullTextSearch({ text: "hello world" }));
      expect(result.current).toHaveProperty("handleSearch");
      expect(result.current).toHaveProperty("handleSearchNext");
      expect(result.current).toHaveProperty("matches");
      expect(result.current).toHaveProperty("activeMatchCharIdx");
      expect(result.current).toHaveProperty("contentRef");
    });

    it("handleSearch finds all char-index matches", () => {
      const { result } = renderHook(() => useFullTextSearch({ text: "ab:ab:ab" }));
      act(() => {
        result.current.handleSearch("ab");
      });
      expect(result.current.matches).toEqual([0, 3, 6]);
      expect(result.current.matchCount).toBe(3);
    });

    it("handleSearch resets on empty term", () => {
      const { result } = renderHook(() => useFullTextSearch({ text: "hello world" }));
      act(() => {
        result.current.handleSearch("hello");
      });
      expect(result.current.matchCount).toBe(1);
      act(() => {
        result.current.handleSearch("");
      });
      expect(result.current.matchCount).toBe(0);
      expect(result.current.matches).toEqual([]);
    });

    it("handleSearchNext cycles currentMatchIdx through matches", () => {
      const { result } = renderHook(() => useFullTextSearch({ text: "ab:ab:ab" }));
      act(() => {
        result.current.handleSearch("ab");
      });
      expect(result.current.currentMatchIdx).toBe(0);

      act(() => {
        result.current.handleSearchNext();
      });
      expect(result.current.currentMatchIdx).toBe(1);

      act(() => {
        result.current.handleSearchNext();
      });
      expect(result.current.currentMatchIdx).toBe(2);

      act(() => {
        result.current.handleSearchNext();
      });
      expect(result.current.currentMatchIdx).toBe(0);
    });

    it("activeMatchCharIdx is -1 when no matches", () => {
      const { result } = renderHook(() => useFullTextSearch({ text: "hello world" }));
      act(() => {
        result.current.handleSearch("zzz");
      });
      expect(result.current.activeMatchCharIdx).toBe(-1);
    });

    it("activeMatchCharIdx reflects currentMatchIdx", () => {
      const { result } = renderHook(() => useFullTextSearch({ text: "ab:ab:ab" }));
      act(() => {
        result.current.handleSearch("ab");
      });
      expect(result.current.activeMatchCharIdx).toBe(result.current.matches[0]);

      act(() => {
        result.current.handleSearchNext();
      });
      expect(result.current.activeMatchCharIdx).toBe(result.current.matches[1]);

      act(() => {
        result.current.handleSearchNext();
      });
      expect(result.current.activeMatchCharIdx).toBe(result.current.matches[2]);
    });
  });

  describe("with custom backend options (onSearch, onSearchNext)", () => {
    it("has contentRef even with custom backend", () => {
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch: () => {},
          onSearchNext: () => {},
        })
      );
      expect(result.current).toHaveProperty("contentRef");
      expect(result.current.contentRef).toBeDefined();
      expect(result.current.contentRef.current).toBeNull();
    });

    it("matches is always empty array for custom backend", () => {
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch: () => {},
          onSearchNext: () => {},
        })
      );
      expect(result.current.matches).toEqual([]);
    });

    it("activeMatchCharIdx is always -1 for custom backend", () => {
      const onSearch = vi.fn();
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch,
          onSearchNext: () => {},
        })
      );
      act(() => {
        result.current.handleSearch("test");
      });
      expect(result.current.activeMatchCharIdx).toBe(-1);
    });

    it("handleSearch calls onSearch callback with term", () => {
      const onSearch = vi.fn();
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch,
          onSearchNext: () => {},
        })
      );
      act(() => {
        result.current.handleSearch("hello");
      });
      expect(onSearch).toHaveBeenCalledWith("hello");
      expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it("handleSearch sets searchTerm", () => {
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch: () => {},
          onSearchNext: () => {},
        })
      );
      act(() => {
        result.current.handleSearch("test");
      });
      expect(result.current.searchTerm).toBe("test");
    });

    it("handleSearch resets currentMatchIdx to 0", () => {
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch: () => {},
          onSearchNext: () => {},
        })
      );
      act(() => {
        result.current.setCurrentMatchIdx(5);
      });
      act(() => {
        result.current.handleSearch("test");
      });
      expect(result.current.currentMatchIdx).toBe(0);
    });

    it("handleSearch with empty string does NOT call onSearch", () => {
      const onSearch = vi.fn();
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch,
          onSearchNext: () => {},
        })
      );
      act(() => {
        result.current.handleSearch("");
      });
      expect(onSearch).not.toHaveBeenCalled();
    });

    it("handleSearch with empty string resets matches", () => {
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch: () => {},
          onSearchNext: () => {},
        })
      );
      act(() => {
        result.current.setMatchCount(5);
        result.current.setCurrentMatchIdx(2);
      });
      act(() => {
        result.current.handleSearch("");
      });
      expect(result.current.matchCount).toBe(0);
      expect(result.current.currentMatchIdx).toBe(0);
    });

    it("handleSearchNext calls onSearchNext callback", () => {
      const onSearchNext = vi.fn();
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch: () => {},
          onSearchNext,
        })
      );
      act(() => {
        result.current.setMatchCount(3);
      });
      act(() => {
        result.current.handleSearchNext();
      });
      expect(onSearchNext).toHaveBeenCalledTimes(1);
    });

    it("handleSearchNext increments currentMatchIdx", () => {
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch: () => {},
          onSearchNext: () => {},
        })
      );
      act(() => {
        result.current.setMatchCount(3);
      });
      expect(result.current.currentMatchIdx).toBe(0);

      act(() => {
        result.current.handleSearchNext();
      });
      expect(result.current.currentMatchIdx).toBe(1);

      act(() => {
        result.current.handleSearchNext();
      });
      expect(result.current.currentMatchIdx).toBe(2);
    });

    it("handleSearchNext wraps currentMatchIdx at matchCount", () => {
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch: () => {},
          onSearchNext: () => {},
        })
      );
      act(() => {
        result.current.setMatchCount(2);
        result.current.setCurrentMatchIdx(1);
      });
      act(() => {
        result.current.handleSearchNext();
      });
      expect(result.current.currentMatchIdx).toBe(0);
    });

    it("handleSearchNext does NOT call onSearchNext when matchCount is 0", () => {
      const onSearchNext = vi.fn();
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch: () => {},
          onSearchNext,
        })
      );
      expect(result.current.matchCount).toBe(0);

      act(() => {
        result.current.handleSearchNext();
      });
      expect(onSearchNext).not.toHaveBeenCalled();
      expect(result.current.currentMatchIdx).toBe(0);
    });

    it("multiple handleSearch calls accumulate correct state", () => {
      const onSearch = vi.fn();
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch,
          onSearchNext: () => {},
        })
      );
      act(() => {
        result.current.handleSearch("first");
      });
      expect(result.current.searchTerm).toBe("first");
      expect(onSearch).toHaveBeenCalledWith("first");

      act(() => {
        result.current.handleSearch("second");
      });
      expect(result.current.searchTerm).toBe("second");
      expect(onSearch).toHaveBeenCalledWith("second");
      expect(onSearch).toHaveBeenCalledTimes(2);
    });

    it("handles alternating search and searchNext correctly", () => {
      const onSearch = vi.fn();
      const onSearchNext = vi.fn();
      const { result } = renderHook(() =>
        useFullTextSearch({
          onSearch,
          onSearchNext,
        })
      );
      act(() => {
        result.current.handleSearch("test");
      });
      expect(result.current.currentMatchIdx).toBe(0);
      expect(onSearch).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.setMatchCount(3);
      });
      act(() => {
        result.current.handleSearchNext();
      });
      expect(result.current.currentMatchIdx).toBe(1);
      expect(onSearchNext).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.handleSearch("new");
      });
      expect(result.current.currentMatchIdx).toBe(0);
      expect(onSearch).toHaveBeenCalledTimes(2);
    });
  });
});
