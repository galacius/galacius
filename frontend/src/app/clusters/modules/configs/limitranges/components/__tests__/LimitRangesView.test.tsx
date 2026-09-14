import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { LimitRange } from "../../api/resources";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetLimitRangesMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const openTabMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetLimitRanges", () => ({
  useGetLimitRanges: useGetLimitRangesMock,
}));

vi.mock("../../../../../MainLayoutContext", () => ({
  useMainLayoutContext: vi.fn(),
}));

vi.mock("../../../../../shared/components/details/DetailDrawerContext", () => ({
  useDetailDrawerContext: vi.fn(),
}));

vi.mock("../../../../../shared/components/trays/unified/UnifiedTrayContext", () => ({
  useUnifiedTray: () => ({ openTab: openTabMock }),
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useMainLayoutContext } from "../../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../../shared/components/details/DetailDrawerContext";
import { LimitRangesView } from "../../LimitRangesView";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeLimitRange(overrides: Partial<LimitRange> = {}): LimitRange {
  return {
    Name: "test-limitrange",
    Namespace: "default",
    Age: "1d",
    ...overrides,
  };
}

function renderView() {
  return render(<LimitRangesView />, {
    wrapper: makeWrapper(),
  });
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useGetLimitRangesMock.mockReturnValue({ data: [] });
  vi.mocked(useMainLayoutContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
});

afterEach(() => {
  cleanup();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("LimitRangesView", () => {
  it('renders "Limit Ranges" heading and "0 items" count when data is empty', () => {
    renderView();

    expect(screen.getByText("Limit Ranges")).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it('renders "Item list is empty" empty state row when no items', () => {
    renderView();

    expect(screen.getByText("No Limit Ranges")).toBeInTheDocument();
  });

  it("renders a single item with all 3 columns: Name, Namespace, Age", () => {
    useGetLimitRangesMock.mockReturnValue({
      data: [
        makeLimitRange({
          Name: "mem-limit-range",
          Namespace: "production",
          Age: "14d",
        }),
      ],
    });

    renderView();

    expect(screen.getByText("mem-limit-range")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("14d")).toBeInTheDocument();
  });

  it("renders all rows when multiple items are provided", () => {
    useGetLimitRangesMock.mockReturnValue({
      data: [
        makeLimitRange({ Name: "lr-alpha", Namespace: "ns-a" }),
        makeLimitRange({ Name: "lr-beta", Namespace: "ns-b" }),
        makeLimitRange({ Name: "lr-gamma", Namespace: "ns-c" }),
      ],
    });

    renderView();

    expect(screen.getByText("lr-alpha")).toBeInTheDocument();
    expect(screen.getByText("lr-beta")).toBeInTheDocument();
    expect(screen.getByText("lr-gamma")).toBeInTheDocument();
  });

  it('shows "1 item" (singular) when exactly one item is present', () => {
    useGetLimitRangesMock.mockReturnValue({
      data: [makeLimitRange({ Name: "only-lr" })],
    });

    renderView();

    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it('shows "N items" (plural) when multiple items are present', () => {
    useGetLimitRangesMock.mockReturnValue({
      data: [
        makeLimitRange({ Name: "lr-one" }),
        makeLimitRange({ Name: "lr-two" }),
        makeLimitRange({ Name: "lr-three" }),
      ],
    });

    renderView();

    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("filters by Name substring (case-insensitive)", () => {
    useGetLimitRangesMock.mockReturnValue({
      data: [
        makeLimitRange({ Name: "cpu-limit-range" }),
        makeLimitRange({ Name: "mem-limit-range" }),
      ],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Limit Ranges...");
    fireEvent.change(input, { target: { value: "CPU" } });

    expect(screen.getByText("cpu-limit-range")).toBeInTheDocument();
    expect(screen.queryByText("mem-limit-range")).not.toBeInTheDocument();
  });

  it('shows "0 items" and empty state when search matches nothing', () => {
    useGetLimitRangesMock.mockReturnValue({
      data: [makeLimitRange({ Name: "cpu-limit-range" })],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Limit Ranges...");
    fireEvent.change(input, { target: { value: "nonexistent" } });

    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getByText("No Limit Ranges")).toBeInTheDocument();
  });

  it("clicking Namespace ResourceLink calls onToggleNamespaceDetail with the correct namespace", () => {
    useGetLimitRangesMock.mockReturnValue({
      data: [makeLimitRange({ Name: "my-lr", Namespace: "staging" })],
    });

    renderView();

    fireEvent.click(screen.getByText("staging"));

    expect(onToggleNamespaceDetailMock).toHaveBeenCalledWith("staging");
    expect(onToggleNamespaceDetailMock).toHaveBeenCalledTimes(1);
  });
});
