import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { UnifiedTrayProvider } from "../../../../../shared/components/trays/unified/UnifiedTrayContext";
import type { ResourceQuota } from "../../api/resources";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetResourceQuotasMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetResourceQuotas", () => ({
  useGetResourceQuotas: useGetResourceQuotasMock,
}));

vi.mock("../../../../../MainLayoutContext", () => ({
  useMainLayoutContext: vi.fn(),
}));

vi.mock("../../../../../shared/components/details/DetailDrawerContext", () => ({
  useDetailDrawerContext: vi.fn(),
}));

// Wails runtime alias resolves to src/__mocks__/wailsjs/runtime/runtime.ts automatically.

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useMainLayoutContext } from "../../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../../shared/components/details/DetailDrawerContext";
import { ResourceQuotasView } from "../../ResourceQuotasView";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(UnifiedTrayProvider, null, children)
    );
}

function makeQuota(overrides: Partial<ResourceQuota> = {}): ResourceQuota {
  return {
    Name: "test-quota",
    Namespace: "default",
    Age: "1d",
    ...overrides,
  };
}

function renderView() {
  return render(<ResourceQuotasView />, {
    wrapper: makeWrapper(),
  });
}

// ─── setup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  useGetResourceQuotasMock.mockReturnValue({ data: [] });
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

// ─── tests ────────────────────────────────────────────────────────────────────

describe("ResourceQuotasView", () => {
  it('renders heading "Resource Quotas" and "0 items" count when data is empty', () => {
    renderView();

    expect(screen.getByText("Resource Quotas")).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it("renders table rows for each quota with Name, Namespace, Age columns", () => {
    useGetResourceQuotasMock.mockReturnValue({
      data: [
        makeQuota({ Name: "quota-a", Namespace: "ns-a", Age: "3d" }),
        makeQuota({ Name: "quota-b", Namespace: "ns-b", Age: "7d" }),
      ],
    });

    renderView();

    expect(screen.getByText("quota-a")).toBeInTheDocument();
    expect(screen.getByText("quota-b")).toBeInTheDocument();
    expect(screen.getByText("ns-a")).toBeInTheDocument();
    expect(screen.getByText("ns-b")).toBeInTheDocument();
    expect(screen.getByText("3d")).toBeInTheDocument();
    expect(screen.getByText("7d")).toBeInTheDocument();
  });

  it("filters quotas by search input (case-insensitive)", () => {
    useGetResourceQuotasMock.mockReturnValue({
      data: [makeQuota({ Name: "compute-quota" }), makeQuota({ Name: "storage-quota" })],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Resource Quotas...");
    fireEvent.change(input, { target: { value: "COMPUTE" } });

    expect(screen.getByText("compute-quota")).toBeInTheDocument();
    expect(screen.queryByText("storage-quota")).not.toBeInTheDocument();
  });

  it("clicking Namespace ResourceLink calls onToggleNamespaceDetail with the namespace", () => {
    useGetResourceQuotasMock.mockReturnValue({
      data: [makeQuota({ Name: "my-quota", Namespace: "my-namespace" })],
    });

    renderView();

    fireEvent.click(screen.getByText("my-namespace"));

    expect(onToggleNamespaceDetailMock).toHaveBeenCalledWith("my-namespace");
  });
});
