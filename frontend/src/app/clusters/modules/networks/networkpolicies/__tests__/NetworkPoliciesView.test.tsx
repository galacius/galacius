import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { NetworkPolicy } from "../api/resources";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetNetworkPoliciesMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const openTabMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/data-access/useGetNetworkPolicies", () => ({
  useGetNetworkPolicies: useGetNetworkPoliciesMock,
}));

vi.mock("../../../../MainLayoutContext", () => ({
  useMainLayoutContext: vi.fn(),
}));

vi.mock("../../../../shared/components/details/DetailDrawerContext", () => ({
  useDetailDrawerContext: vi.fn(),
}));

vi.mock("../../../../shared/components/trays/unified/UnifiedTrayContext", () => ({
  useUnifiedTray: () => ({ openTab: openTabMock }),
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { NetworkPoliciesView } from "../NetworkPoliciesView";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function makePolicy(overrides: Partial<NetworkPolicy> = {}): NetworkPolicy {
  return {
    Name: "test-policy",
    Namespace: "default",
    PolicyTypes: "Ingress",
    Age: "1d",
    ...overrides,
  };
}

function renderView() {
  return render(<NetworkPoliciesView />, {
    wrapper: makeWrapper(),
  });
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useGetNetworkPoliciesMock.mockReturnValue({ data: [] });
  vi.mocked(useMainLayoutContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: "",
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: "",
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
});

afterEach(() => {
  cleanup();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("NetworkPoliciesView", () => {
  it('renders "Network Policies" heading and "0 items" count when data is empty', () => {
    renderView();

    expect(screen.getByText("Network Policies")).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it('renders "Item list is empty" empty state row when no items', () => {
    renderView();

    expect(screen.getByText("No Network Policies")).toBeInTheDocument();
  });

  it("renders a single policy with all 4 columns: Name, Namespace, PolicyTypes, Age", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [
        makePolicy({
          Name: "allow-ingress",
          Namespace: "production",
          PolicyTypes: "Ingress, Egress",
          Age: "7d",
        }),
      ],
    });

    renderView();

    expect(screen.getByText("allow-ingress")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("Ingress, Egress")).toBeInTheDocument();
    expect(screen.getByText("7d")).toBeInTheDocument();
  });

  it("renders all rows when multiple policies are provided", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [
        makePolicy({ Name: "policy-alpha", Namespace: "ns-a" }),
        makePolicy({ Name: "policy-beta", Namespace: "ns-b" }),
        makePolicy({ Name: "policy-gamma", Namespace: "ns-c" }),
      ],
    });

    renderView();

    expect(screen.getByText("policy-alpha")).toBeInTheDocument();
    expect(screen.getByText("policy-beta")).toBeInTheDocument();
    expect(screen.getByText("policy-gamma")).toBeInTheDocument();
  });

  it('shows "1 item" (singular) when exactly one policy is present', () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [makePolicy({ Name: "only-policy" })],
    });

    renderView();

    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it('shows "N items" (plural) when multiple policies are present', () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [
        makePolicy({ Name: "policy-one" }),
        makePolicy({ Name: "policy-two" }),
        makePolicy({ Name: "policy-three" }),
      ],
    });

    renderView();

    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("filters policies by Name substring (case-insensitive)", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [makePolicy({ Name: "deny-egress" }), makePolicy({ Name: "allow-ingress" })],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Network Policies...");
    fireEvent.change(input, { target: { value: "ALLOW" } });

    expect(screen.getByText("allow-ingress")).toBeInTheDocument();
    expect(screen.queryByText("deny-egress")).not.toBeInTheDocument();
  });

  it('shows "0 items" and empty state when search matches nothing', () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [makePolicy({ Name: "deny-egress" })],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Network Policies...");
    fireEvent.change(input, { target: { value: "nonexistent" } });

    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getByText("No Network Policies")).toBeInTheDocument();
  });

  it("clicking Namespace ResourceLink calls onToggleNamespaceDetail with the correct namespace", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [makePolicy({ Name: "my-policy", Namespace: "staging" })],
    });

    renderView();

    fireEvent.click(screen.getByText("staging"));

    expect(onToggleNamespaceDetailMock).toHaveBeenCalledWith("staging");
    expect(onToggleNamespaceDetailMock).toHaveBeenCalledTimes(1);
  });
});
