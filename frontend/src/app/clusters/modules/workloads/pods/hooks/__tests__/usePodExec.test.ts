/**
 * Tests for usePodExec — StrictMode double-invoke guard
 *
 * The bug: React StrictMode mounts → unmounts → remounts every effect in dev.
 * The original code used startSessionRef; a stale goroutine's events (stdout,
 * closed, started, exit) would still fire and write to the terminal a second
 * time, producing duplicated output.
 *
 * The fix: sessionGenRef (monotonically increasing integer). Each effect
 * invocation captures `thisGen`. All event handlers guard:
 *   if (sessionGenRef.current !== thisGen) return
 * Cleanup increments sessionGenRef.current as its first action, invalidating
 * any in-flight events from the previous (or stale StrictMode) goroutine.
 *
 * Scenarios verified:
 *   A - Effect subscribes all event keys and calls ExecInPod (via reconnect to
 *       seed containerRef first)
 *   B - Cleanup calls StopExec and disposes terminal
 *   C - Stale-gen events are ignored (StrictMode simulation)
 *   D - Current-gen events are processed
 *   E - reconnect re-runs the effect (triggers ExecInPod again)
 *   F - sendInput emits to the stdin key via EventsEmit
 *   G - resize delegates to ResizeExecTerminal
 *
 * Container ref strategy
 * ──────────────────────
 * The effect bails early if containerRef.current is null. renderHook does not
 * mount into a real DOM tree, so refs are null on the first effect run.
 * We work around this by:
 *   1. Render the hook (first effect fires but bails — containerRef is null).
 *   2. Manually assign a real DOM div to containerRef.current.
 *   3. Call result.current.reconnect() to increment openGen, which triggers
 *      the effect to run again — this time with containerRef populated.
 * This is intentional: reconnect() is the public API for re-mounting the
 * session, so testing it also covers the ref-seeded effect path.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type React from "react";

// ─── xterm mocks ─────────────────────────────────────────────────────────────

const mockTermWrite = vi.hoisted(() => vi.fn());
const mockTermWriteln = vi.hoisted(() => vi.fn());
const mockTermClear = vi.hoisted(() => vi.fn());
const mockTermDispose = vi.hoisted(() => vi.fn());
const mockTermOpen = vi.hoisted(() => vi.fn());
const mockOnDataDispose = vi.hoisted(() => vi.fn());
const mockTermOnData = vi.hoisted(() => vi.fn().mockReturnValue({ dispose: mockOnDataDispose }));
const mockFitFit = vi.hoisted(() => vi.fn());

vi.mock("@xterm/xterm", () => ({
  Terminal: vi.fn().mockImplementation(function () {
    return {
      loadAddon: vi.fn(),
      open: mockTermOpen,
      onData: mockTermOnData,
      write: mockTermWrite,
      writeln: mockTermWriteln,
      clear: mockTermClear,
      dispose: mockTermDispose,
      rows: 24,
      cols: 80,
    };
  }),
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn().mockImplementation(function () {
    return {
      fit: mockFitFit,
      dispose: vi.fn(),
    };
  }),
}));

// ─── Wails runtime mock ───────────────────────────────────────────────────────

type EventCallback = (...args: unknown[]) => void;

const _handlers = new Map<string, EventCallback[]>();

const mockEventsEmit = vi.hoisted(() => vi.fn());

vi.mock("@wailsjs/runtime/runtime", () => ({
  EventsOn: vi.fn((key: string, cb: EventCallback) => {
    if (!_handlers.has(key)) _handlers.set(key, []);
    _handlers.get(key)!.push(cb);
    return () => {
      const list = _handlers.get(key) ?? [];
      const idx = list.indexOf(cb);
      if (idx !== -1) list.splice(idx, 1);
    };
  }),
  EventsEmit: mockEventsEmit,
}));

function getHandlers(key: string): EventCallback[] {
  return _handlers.get(key) ?? [];
}

function emitEvent(key: string, ...args: unknown[]): void {
  (_handlers.get(key) ?? []).forEach((cb) => cb(...args));
}

// ─── API mock ─────────────────────────────────────────────────────────────────

const mockExecInPod = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockStopExec = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockResizeExecTerminal = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("../../api/resources", () => ({
  ExecInPod: mockExecInPod,
  StopExec: mockStopExec,
  ResizeExecTerminal: mockResizeExecTerminal,
}));

// ─── ResizeObserver stub ──────────────────────────────────────────────────────

const mockRoDisconnect = vi.hoisted(() => vi.fn());

vi.stubGlobal(
  "ResizeObserver",
  vi.fn().mockImplementation(function () {
    return {
      observe: vi.fn(),
      disconnect: mockRoDisconnect,
    };
  })
);

// ─── import hook ─────────────────────────────────────────────────────────────

import { usePodExec } from "../usePodExec";

// ─── constants ───────────────────────────────────────────────────────────────

const INPUT = { contextName: "ctx", ns: "default", pod: "my-pod", container: "main" };
const KEY = `exec:${INPUT.ns}:${INPUT.pod}:${INPUT.container}`;
const STDOUT_KEY = `exec:stdout:${KEY}`;
const CLOSED_KEY = `exec:closed:${KEY}`;
const STARTED_KEY = `exec:started:${KEY}`;
const EXIT_KEY = `exec:exit:${KEY}`;

// ─── setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  _handlers.clear();
  mockExecInPod.mockClear();
  mockStopExec.mockClear();
  mockResizeExecTerminal.mockClear();
  mockEventsEmit.mockClear();
  mockTermWrite.mockClear();
  mockTermWriteln.mockClear();
  mockTermClear.mockClear();
  mockTermDispose.mockClear();
  mockTermOpen.mockClear();
  mockFitFit.mockClear();
  mockRoDisconnect.mockClear();
  mockOnDataDispose.mockClear();
});

afterEach(() => {
  document.body.innerHTML = "";
});

// ─── helper ──────────────────────────────────────────────────────────────────
// Render the hook, seed containerRef.current with a real DOM div, then call
// reconnect() to fire the effect with the ref in place (openGen increments →
// effect re-runs). Returns the hook result and the div.
function renderActive() {
  const div = document.createElement("div");
  document.body.appendChild(div);

  const hook = renderHook(() => usePodExec(INPUT));

  // Seed the ref BEFORE triggering the reconnect-driven effect re-run
  (hook.result.current.containerRef as React.MutableRefObject<HTMLDivElement>).current = div;

  // reconnect(): clears terminal + increments openGen → effect re-runs with ref set
  act(() => {
    hook.result.current.reconnect();
  });

  return { hook, div };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("usePodExec", () => {
  // ── Scenario A ──────────────────────────────────────────────────────────────
  describe("Scenario A: effect subscribes all event keys and calls ExecInPod", () => {
    it("calls ExecInPod with correct args after containerRef is seeded", () => {
      renderActive();

      expect(mockExecInPod).toHaveBeenCalledWith(
        INPUT.contextName,
        INPUT.ns,
        INPUT.pod,
        INPUT.container
      );
    });

    it("registers handlers for stdout, closed, started, exit keys", () => {
      renderActive();

      expect(getHandlers(STDOUT_KEY).length).toBeGreaterThan(0);
      expect(getHandlers(CLOSED_KEY).length).toBeGreaterThan(0);
      expect(getHandlers(STARTED_KEY).length).toBeGreaterThan(0);
      expect(getHandlers(EXIT_KEY).length).toBeGreaterThan(0);
    });
  });

  // ── Scenario B: cleanup ───────────────────────────────────────────────────
  describe("Scenario B: cleanup calls StopExec and disposes terminal", () => {
    it("calls StopExec with ns, pod, container on unmount", () => {
      const { hook } = renderActive();
      hook.unmount();

      expect(mockStopExec).toHaveBeenCalledWith(INPUT.ns, INPUT.pod, INPUT.container);
    });

    it("disposes the terminal on unmount", () => {
      const { hook } = renderActive();
      hook.unmount();

      expect(mockTermDispose).toHaveBeenCalled();
    });
  });

  // ── Scenario C: StrictMode stale-gen guard ──────────────────────────────────
  describe("Scenario C: stale-gen events are silently ignored after cleanup", () => {
    it("ignores stdout events that arrive on a stale handler after unmount", () => {
      const { hook } = renderActive();

      // Snapshot the handlers registered in the current (active) gen
      const gen1Stdout = [...getHandlers(STDOUT_KEY)];
      expect(gen1Stdout.length).toBeGreaterThan(0);

      // Cleanup: increments gen as its first action
      hook.unmount();

      // Fire the stale handler (its thisGen < sessionGenRef.current)
      act(() => {
        gen1Stdout.forEach((h) => h("stale output"));
      });

      // terminal.write must NOT be called
      expect(mockTermWrite).not.toHaveBeenCalled();
    });

    it("ignores exit events after cleanup (stale gen)", () => {
      const { hook } = renderActive();
      const gen1Exit = [...getHandlers(EXIT_KEY)];

      hook.unmount();

      act(() => {
        gen1Exit.forEach((h) => h(0));
      });

      expect(mockTermWriteln).not.toHaveBeenCalled();
    });

    it("ignores started events after cleanup (stale gen)", () => {
      const { hook } = renderActive();
      const gen1Started = [...getHandlers(STARTED_KEY)];

      hook.unmount();

      act(() => {
        gen1Started.forEach((h) => h("echo line"));
      });

      expect(mockTermWriteln).not.toHaveBeenCalled();
    });

    it("ignores closed events after cleanup without throwing (stale gen)", () => {
      const { hook } = renderActive();
      const gen1Closed = [...getHandlers(CLOSED_KEY)];

      hook.unmount();

      expect(() => {
        act(() => {
          gen1Closed.forEach((h) => h());
        });
      }).not.toThrow();
    });
  });

  // ── Scenario D: current-gen events are processed ────────────────────────────
  describe("Scenario D: current-gen events are processed normally", () => {
    it("writes stdout data to terminal when gen matches", () => {
      renderActive();

      act(() => {
        emitEvent(STDOUT_KEY, "hello world");
      });

      expect(mockTermWrite).toHaveBeenCalledWith("hello world");
    });

    it("writes exit code line for code 0 (green color escape)", () => {
      renderActive();

      act(() => {
        emitEvent(EXIT_KEY, 0);
      });

      expect(mockTermWriteln).toHaveBeenCalledWith(
        expect.stringContaining("Process exited with code 0")
      );
    });

    it("writes exit code line for non-zero code (red color escape)", () => {
      renderActive();

      act(() => {
        emitEvent(EXIT_KEY, 1);
      });

      expect(mockTermWriteln).toHaveBeenCalledWith(
        expect.stringContaining("Process exited with code 1")
      );
    });

    it("writes echo line to terminal when started event fires", () => {
      renderActive();

      act(() => {
        emitEvent(STARTED_KEY, "kubectl exec -it my-pod -- bash");
      });

      expect(mockTermWriteln).toHaveBeenCalledWith(
        expect.stringContaining("kubectl exec -it my-pod -- bash")
      );
    });
  });

  // ── Scenario E: reconnect re-runs the effect ─────────────────────────────
  describe("Scenario E: reconnect increments openGen and re-mounts effect", () => {
    it("calling reconnect a second time triggers another ExecInPod call", () => {
      const { hook } = renderActive();

      // At this point ExecInPod was called once (from renderActive's reconnect).
      const callsBefore = mockExecInPod.mock.calls.length;
      expect(callsBefore).toBeGreaterThan(0);

      act(() => {
        hook.result.current.reconnect();
      });

      expect(mockExecInPod.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it("reconnect disposes the old terminal and opens a new one", () => {
      const { hook } = renderActive();

      // After renderActive, terminal was opened once
      const opensBefore = mockTermOpen.mock.calls.length;
      const disposesBefore = mockTermDispose.mock.calls.length;

      act(() => {
        hook.result.current.reconnect();
      });

      // Old terminal disposed, new one opened
      expect(mockTermDispose.mock.calls.length).toBeGreaterThan(disposesBefore);
      expect(mockTermOpen.mock.calls.length).toBeGreaterThan(opensBefore);
    });
  });

  // ── Scenario F: sendInput ─────────────────────────────────────────────────
  describe("Scenario F: sendInput emits to the stdin key", () => {
    it("emits typed input to exec:stdin key", () => {
      const { hook } = renderActive();

      act(() => {
        hook.result.current.sendInput("ls -la\r");
      });

      expect(mockEventsEmit).toHaveBeenCalledWith(`exec:stdin:${KEY}`, "ls -la\r");
    });
  });

  // ── Scenario G: resize ────────────────────────────────────────────────────
  describe("Scenario G: resize delegates to ResizeExecTerminal", () => {
    it("forwards rows and cols to ResizeExecTerminal", () => {
      const { hook } = renderActive();

      act(() => {
        hook.result.current.resize(30, 100);
      });

      expect(mockResizeExecTerminal).toHaveBeenCalledWith(
        INPUT.ns,
        INPUT.pod,
        INPUT.container,
        30,
        100
      );
    });
  });
});
