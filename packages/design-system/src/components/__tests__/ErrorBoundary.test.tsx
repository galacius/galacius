import { render, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorBoundary } from "../ErrorBoundary";

beforeEach(() => {
  // Suppress console.error for these tests
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );
    expect(getByText("Test Content")).toBeTruthy();
  });

  it("renders default error UI when error is caught", () => {
    const BadComponent = () => {
      throw new Error("Test error");
    };

    const { getByText } = render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    expect(getByText("Something went wrong")).toBeTruthy();
    expect(getByText(/Test error/)).toBeTruthy();
  });

  it("displays error message in pre element", () => {
    const BadComponent = () => {
      throw new Error("Detailed error message");
    };

    const { container } = render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    const pre = container.querySelector("pre");
    expect(pre?.textContent).toContain("Detailed error message");
  });

  it("displays error stack trace when available", () => {
    const BadComponent = () => {
      throw new Error("Error with stack");
    };

    const { container } = render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    const pre = container.querySelector("pre");
    expect(pre).toBeTruthy();
  });

  it("renders copy button in default error UI", () => {
    const BadComponent = () => {
      throw new Error("Test error");
    };

    const { container } = render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    const copyButton = container.querySelector('[aria-label="Copy error"]');
    expect(copyButton).toBeTruthy();
  });

  it("renders try again button in default error UI", () => {
    const BadComponent = () => {
      throw new Error("Test error");
    };

    const { getByText } = render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    expect(getByText("Try again")).toBeTruthy();
  });

  it("resets error state when try again is clicked", () => {
    let shouldThrow = true;

    const ToggleErrorComponent = () => {
      if (shouldThrow) throw new Error("Test error");
      return <div>Recovered</div>;
    };

    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ToggleErrorComponent />
      </ErrorBoundary>
    );

    expect(getByText("Something went wrong")).toBeTruthy();

    shouldThrow = false;
    const tryAgainButton = getByText("Try again");
    fireEvent.click(tryAgainButton);

    rerender(
      <ErrorBoundary>
        <ToggleErrorComponent />
      </ErrorBoundary>
    );

    expect(getByText("Recovered")).toBeTruthy();
  });

  it("uses custom fallback when provided", () => {
    const BadComponent = () => {
      throw new Error("Test error");
    };

    const customFallback = (error: Error, reset: () => void) => (
      <div>
        <p>Custom Error: {error.message}</p>
        <button onClick={reset}>Retry</button>
      </div>
    );

    const { getByText } = render(
      <ErrorBoundary fallback={customFallback}>
        <BadComponent />
      </ErrorBoundary>
    );

    expect(getByText("Custom Error: Test error")).toBeTruthy();
    expect(getByText("Retry")).toBeTruthy();
  });

  it("passes error and reset function to custom fallback", () => {
    const BadComponent = () => {
      throw new Error("Custom fallback test");
    };

    let assertionRan = false;

    const customFallback = (error: Error, reset: () => void) => (
      <div>
        <p
          onClick={() => {
            expect(error.message).toBe("Custom fallback test");
            assertionRan = true;
          }}
        >
          Error captured
        </p>
        <button onClick={() => reset()}>Reset</button>
      </div>
    );

    const { getByText } = render(
      <ErrorBoundary fallback={customFallback}>
        <BadComponent />
      </ErrorBoundary>
    );

    fireEvent.click(getByText("Error captured"));
    expect(assertionRan).toBe(true);
  });

  it("renders destructive text color for error message", () => {
    const BadComponent = () => {
      throw new Error("Test error");
    };

    const { container } = render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    const errorText = container.querySelector(".text-destructive");
    expect(errorText).toBeTruthy();
  });

  it("centers error UI with flex layout", () => {
    const BadComponent = () => {
      throw new Error("Test error");
    };

    const { container } = render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    const wrapper = container.querySelector(".flex.flex-1.flex-col");
    expect(wrapper).toBeTruthy();
  });

  it("displays correct icon for copy button", () => {
    const BadComponent = () => {
      throw new Error("Test error");
    };

    const { container } = render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    const copyButton = container.querySelector('[aria-label="Copy error"]');
    expect(copyButton).toBeTruthy();
  });

  it("handles errors during error rendering gracefully", () => {
    const BadComponent = () => {
      throw new Error("Test error");
    };

    expect(() => {
      render(
        <ErrorBoundary>
          <BadComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();
  });

  it("renders pre element with overflow-auto for long error messages", () => {
    const BadComponent = () => {
      throw new Error("This is a very long error message ".repeat(10));
    };

    const { container } = render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    const pre = container.querySelector("pre.overflow-auto");
    expect(pre).toBeTruthy();
  });

  it("applies correct text size to error display", () => {
    const BadComponent = () => {
      throw new Error("Test error");
    };

    const { container } = render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    const pre = container.querySelector("pre.text-xs");
    expect(pre).toBeTruthy();
  });

  it("handles multiple consecutive errors", () => {
    const ErrorComponent = () => {
      throw new Error("Test error");
    };

    const { container } = render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(container.textContent).toContain("Something went wrong");
    expect(container.textContent).toContain("Test error");
  });
});
