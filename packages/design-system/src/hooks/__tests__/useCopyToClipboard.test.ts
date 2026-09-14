import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCopyToClipboard } from "../useCopyToClipboard";

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Stub navigator.clipboard if it doesn't exist
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("has initial state of null", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copiedValue).toBeNull();
  });

  it("has copy function", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(typeof result.current.copy).toBe("function");
  });

  it("copies text to clipboard", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      result.current.copy("test text");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test text");
  });

  it("sets copiedValue to true by default", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      result.current.copy("test");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.copiedValue).toBe(true);
  });

  it("accepts custom marker value", async () => {
    const { result } = renderHook(() => useCopyToClipboard<string>());
    await act(async () => {
      result.current.copy("text", "copied");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.copiedValue).toBe("copied");
  });

  it("resets copiedValue after timeout", async () => {
    const { result } = renderHook(() => useCopyToClipboard(100));
    await act(async () => {
      result.current.copy("test");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.copiedValue).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(result.current.copiedValue).toBeNull();
  });

  it("uses custom timeout value", async () => {
    const { result } = renderHook(() => useCopyToClipboard(50));
    await act(async () => {
      result.current.copy("test");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.copiedValue).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(result.current.copiedValue).toBeNull();
  });

  it("clears previous timeout when copy is called again", async () => {
    const { result } = renderHook(() => useCopyToClipboard(100));

    await act(async () => {
      result.current.copy("text 1");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.copiedValue).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(80);
    });

    await act(async () => {
      result.current.copy("text 2");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.copiedValue).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(result.current.copiedValue).toBeNull();
  });

  it("handles empty string text", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      result.current.copy("");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("");
  });

  it("handles long text", async () => {
    const longText = "a".repeat(10000);
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      result.current.copy(longText);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(longText);
  });

  it("handles special characters", async () => {
    const specialText = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      result.current.copy(specialText);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(specialText);
  });

  it("handles unicode characters", async () => {
    const unicodeText = "こんにちは世界🎉";
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      result.current.copy(unicodeText);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(unicodeText);
  });

  it("multiple copies override previous state", async () => {
    const { result } = renderHook(() => useCopyToClipboard<number>());

    await act(async () => {
      result.current.copy("first", 1);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.copiedValue).toBe(1);

    await act(async () => {
      result.current.copy("second", 2);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.copiedValue).toBe(2);
  });

  it("cleanup on unmount", () => {
    const { unmount } = renderHook(() => useCopyToClipboard());
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it("custom timeout of 0 resets immediately", async () => {
    const { result } = renderHook(() => useCopyToClipboard(0));
    await act(async () => {
      result.current.copy("test");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.copiedValue).toBeNull();
  });

  it("works with default marker (true)", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      result.current.copy("text");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.copiedValue).toBe(true);
  });

  it("handles rapid successive copies", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      result.current.copy("text1");
      result.current.copy("text2");
      result.current.copy("text3");
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(3);
    expect(result.current.copiedValue).toBe(true);
  });

  it("custom marker with different types", async () => {
    const { result: resultStr } = renderHook(() => useCopyToClipboard<string>());
    await act(async () => {
      resultStr.current.copy("text", "copied!");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(resultStr.current.copiedValue).toBe("copied!");

    const { result: resultNum } = renderHook(() => useCopyToClipboard<number>());
    await act(async () => {
      resultNum.current.copy("text", 42);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(resultNum.current.copiedValue).toBe(42);
  });
});
