import { EventsEmit, EventsOn } from "@wailsjs/runtime/runtime";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ExecInPod, ResizeExecTerminal, StopExec } from "../api/resources";

export type ExecStatus = "connecting" | "active" | "error" | "closed";

type ExecState = { status: ExecStatus; error: string | null };
type ExecAction = { type: "connecting" | "active" | "closed" } | { type: "error"; error: string };

function execReducer(_: ExecState, action: ExecAction): ExecState {
  switch (action.type) {
    case "connecting":
      return { status: "connecting", error: null };
    case "active":
      return { status: "active", error: null };
    case "closed":
      return { status: "closed", error: null };
    case "error":
      return { status: "error", error: action.error };
  }
}

interface UsePodExecInput {
  contextName: string;
  ns: string;
  pod: string;
  container: string;
}

interface UsePodExecResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  setContainerRef: (node: HTMLDivElement | null) => void;
  status: ExecStatus;
  error: string | null;
  reconnect: () => void;
  sendInput: (data: string) => void;
  resize: (rows: number, cols: number) => void;
}

export function usePodExec({ contextName, ns, pod, container }: UsePodExecInput): UsePodExecResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [{ status, error }, dispatch] = useReducer(execReducer, {
    status: "connecting",
    error: null,
  });
  const [openGen, setOpenGen] = useState(0);
  const sessionGenRef = useRef(0);
  // ExecPanel is lazy-loaded, so the div this attaches to may not exist yet on
  // first render. Track attachment via state so the setup effect below re-runs
  // once the node actually mounts, instead of silently no-op'ing forever.
  const [attached, setAttached] = useState(false);
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setAttached(node !== null);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    sessionGenRef.current += 1;
    const thisGen = sessionGenRef.current;

    const key = `exec:${ns}:${pod}:${container}`;
    const stdoutKey = `exec:stdout:${key}`;
    const closedKey = `exec:closed:${key}`;
    const stdinKey = `exec:stdin:${key}`;

    const style = getComputedStyle(document.documentElement);
    const bg = style.getPropertyValue("--background").trim() || "#000000";
    const fg = style.getPropertyValue("--foreground").trim() || "#ffffff";

    const term = new Terminal({
      theme: { background: bg, foreground: fg },
      fontSize: 12,
      fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const disposeOnData = term.onData((data) => {
      EventsEmit(stdinKey, data);
    });

    const unsubStdout = EventsOn(stdoutKey, (data: string) => {
      if (sessionGenRef.current !== thisGen) return;
      dispatch({ type: "active" });
      term.write(data);
    });

    const unsubClosed = EventsOn(closedKey, () => {
      if (sessionGenRef.current !== thisGen) return;
      dispatch({ type: "closed" });
    });

    const startedKey = `exec:started:${key}`;
    const unsubStarted = EventsOn(startedKey, (echoLine: string) => {
      if (sessionGenRef.current !== thisGen) return;
      term.writeln(`\x1b[90m${echoLine}\x1b[0m`);
      term.writeln("");
    });

    const exitKey = `exec:exit:${key}`;
    const unsubExit = EventsOn(exitKey, (code: number) => {
      if (sessionGenRef.current !== thisGen) return;
      const color = code === 0 ? "\x1b[32m" : "\x1b[31m";
      term.writeln(`\r\n${color}[Process exited with code ${code}]\x1b[0m`);
    });

    const startSession = () => {
      dispatch({ type: "connecting" });
      ExecInPod(contextName, ns, pod, container).catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        dispatch({ type: "error", error: errMsg });
      });
    };
    startSession();

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        fit.fit();
        if (term.rows && term.cols) {
          ResizeExecTerminal(ns, pod, container, term.rows, term.cols).catch(() => {});
        }
      }
    });
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    return () => {
      sessionGenRef.current += 1;
      ro.disconnect();
      disposeOnData.dispose();
      StopExec(ns, pod, container);
      if (typeof unsubStdout === "function") unsubStdout();
      if (typeof unsubClosed === "function") unsubClosed();
      if (typeof unsubStarted === "function") unsubStarted();
      if (typeof unsubExit === "function") unsubExit();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [contextName, ns, pod, container, openGen, attached]);

  const reconnect = () => {
    setOpenGen((g) => g + 1);
  };

  const sendInput = (data: string) => {
    const key = `exec:${ns}:${pod}:${container}`;
    EventsEmit(`exec:stdin:${key}`, data);
  };

  const resize = (rows: number, cols: number) => {
    ResizeExecTerminal(ns, pod, container, rows, cols).catch(() => {});
  };

  return { containerRef, setContainerRef, status, error, reconnect, sendInput, resize };
}
