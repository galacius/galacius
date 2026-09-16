import { useFullTextSearch } from "@galacius/design-system";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { Terminal } from "@xterm/xterm";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { StopLogs, StreamLogs } from "../api/resources";

export type StreamStatus = "connecting" | "streaming" | "error" | "closed";

type StreamState = { status: StreamStatus; error: string | null };
type StreamAction =
  { type: "connecting" | "streaming" | "closed" } | { type: "error"; error: string };

function streamReducer(_: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case "connecting":
      return { status: "connecting", error: null };
    case "streaming":
      return { status: "streaming", error: null };
    case "closed":
      return { status: "closed", error: null };
    case "error":
      return { status: "error", error: action.error };
  }
}

const searchOpts = {
  incremental: false,
  regex: false,
  wholeWord: false,
  caseSensitive: false,
  decorations: {
    matchBackground: "#713f12", // dark amber — yellow tint visible on dark bg
    matchBorder: "#facc15", // bright yellow border on all matches
    matchOverviewRuler: "#facc15",
    activeMatchBackground: "#7c2d12", // dark orange — current match tint
    activeMatchBorder: "#f97316", // bright orange border on active match
    activeMatchColorOverviewRuler: "#f97316",
  },
};

interface UsePodLogsInput {
  contextName: string;
  ns: string;
  pod: string;
  container: string;
  wrap?: boolean;
  showTimestamps?: boolean;
  showPrevTerminated?: boolean;
}

interface UsePodLogsResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  setContainerRef: (node: HTMLDivElement | null) => void;
  status: StreamStatus;
  error: string | null;
  reconnect: () => void;
  clear: () => void;
  searchTerm: string;
  handleSearch: (term: string) => void;
  handleSearchNext: () => void;
  matchCount: number;
  currentMatchIdx: number;
}

export function usePodLogs({
  contextName,
  ns,
  pod,
  container,
  wrap,
  showTimestamps,
  showPrevTerminated,
}: UsePodLogsInput): UsePodLogsResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const currentTermRef = useRef<string>("");
  const [{ status, error }, dispatch] = useReducer(streamReducer, {
    status: "connecting",
    error: null,
  });
  // LogsPanel is lazy-loaded, so the div this attaches to may not exist yet on
  // first render. Track attachment via state so the setup effect below re-runs
  // once the node actually mounts, instead of silently no-op'ing forever.
  const [attached, setAttached] = useState(false);
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setAttached(node !== null);
  }, []);
  const startStreamRef = useRef<(() => void) | null>(null);
  // Breaks the circular dep: xtermSearch needs setMatchCount, which comes from useFullTextSearch below
  const setMatchCountRef = useRef<((n: number) => void) | null>(null);
  // Terminals wrap at their column count, not via CSS — tracked in a ref so the
  // ResizeObserver (set up once per stream) always reads the latest wrap setting.
  const wrapRef = useRef(wrap ?? false);
  const applyFitRef = useRef<() => void>(() => {});
  // Longest line seen so far, so wrap-off only widens the terminal as far as
  // real content requires instead of a fixed oversized column count that
  // leaves a phantom, empty horizontal scroll area for short lines.
  const maxLineLenRef = useRef(0);

  useEffect(() => {
    const key = `log:${ns}:${pod}:${container}`;
    const closedKey = `log:closed:${key}`;
    if (!containerRef.current) return;

    const style = getComputedStyle(document.documentElement);
    const bg = style.getPropertyValue("--background").trim() || "#000000";
    const fg = style.getPropertyValue("--foreground").trim() || "#ffffff";

    const term = new Terminal({
      allowProposedApi: true,
      theme: { background: bg, foreground: fg },
      fontSize: 12,
      fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
    });
    const fit = new FitAddon();
    const search = new SearchAddon();
    term.loadAddon(fit);
    term.loadAddon(search);
    term.open(containerRef.current);

    // Terminals always wrap at `cols` — there's no CSS-level "no wrap" for a
    // canvas/DOM-rendered grid. Wrap-on: let FitAddon shrink cols to the
    // container width, so long lines wrap at the visible edge. Wrap-off: cols
    // is the wider of (a) the container width in chars and (b) the longest
    // line seen, so short content never leaves a phantom horizontal scroll
    // area, and long lines overflow the container (overflow-x: auto) instead
    // of wrapping.
    const applyFit = () => {
      const proposed = fit.proposeDimensions();
      const fitCols = proposed?.cols ?? term.cols;
      const rows = proposed?.rows ?? term.rows;
      if (wrapRef.current) {
        fit.fit();
      } else {
        term.resize(Math.max(fitCols, maxLineLenRef.current), rows);
      }
    };
    applyFitRef.current = applyFit;
    applyFit();
    termRef.current = term;
    fitRef.current = fit;
    searchRef.current = search;

    const unsubLine = EventsOn(key, (line: string) => {
      dispatch({ type: "streaming" });
      if (line.length > maxLineLenRef.current) {
        maxLineLenRef.current = line.length;
        if (!wrapRef.current && line.length > term.cols) {
          term.resize(line.length, term.rows);
        }
      }
      term.writeln(line);
    });

    const unsubClosed = EventsOn(closedKey, () => {
      dispatch({ type: "closed" });
    });

    const startStream = () => {
      dispatch({ type: "connecting" });
      StreamLogs(
        contextName,
        ns,
        pod,
        container,
        showTimestamps ?? false,
        showPrevTerminated ?? false
      ).catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        dispatch({ type: "error", error: errMsg });
      });
    };
    startStreamRef.current = startStream;
    startStream();

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) applyFit();
    });
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    return () => {
      ro.disconnect();
      StopLogs(ns, pod, container);
      if (typeof unsubLine === "function") unsubLine();
      if (typeof unsubClosed === "function") unsubClosed();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      searchRef.current = null;
      applyFitRef.current = () => {};
    };
  }, [contextName, ns, pod, container, attached, showTimestamps, showPrevTerminated]);

  // Toggling wrap after mount doesn't resize the container, so the
  // ResizeObserver won't fire on its own — re-apply fit explicitly.
  useEffect(() => {
    wrapRef.current = wrap ?? false;
    applyFitRef.current();
  }, [wrap]);

  const reconnect = () => {
    termRef.current?.clear();
    maxLineLenRef.current = 0;
    applyFitRef.current();
    startStreamRef.current?.();
  };

  const clear = () => {
    termRef.current?.clear();
    maxLineLenRef.current = 0;
    applyFitRef.current();
  };

  const countBufferMatches = useCallback((term: string): number => {
    const t = termRef.current;
    if (!t || !term) return 0;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    const buf = t.buffer.active;
    let total = 0;
    for (let i = 0; i < buf.length; i++) {
      const line = buf.getLine(i)?.translateToString(true);
      if (line) {
        const m = line.match(re);
        if (m) total += m.length;
      }
    }
    return total;
  }, []);

  const xtermSearch = useCallback(
    (term: string) => {
      currentTermRef.current = term;
      if (!searchRef.current || !term) {
        searchRef.current?.clearDecorations();
        setMatchCountRef.current?.(0);
        return;
      }
      const count = countBufferMatches(term);
      setMatchCountRef.current?.(count);
      if (count > 0) {
        searchRef.current.findNext(term, searchOpts);
      }
    },
    [countBufferMatches]
  );

  const xtermSearchNext = useCallback(() => {
    const term = currentTermRef.current;
    if (!searchRef.current || !term) return;
    searchRef.current.findNext(term, searchOpts);
  }, []);

  const { searchTerm, handleSearch, handleSearchNext, matchCount, currentMatchIdx, setMatchCount } =
    useFullTextSearch({ onSearch: xtermSearch, onSearchNext: xtermSearchNext });

  useEffect(() => {
    setMatchCountRef.current = setMatchCount;
  }, [setMatchCount]);

  return {
    containerRef,
    setContainerRef,
    status,
    error,
    reconnect,
    clear,
    searchTerm,
    handleSearch,
    handleSearchNext,
    matchCount,
    currentMatchIdx,
  };
}
