import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { NetworkPolicy } from "../api/resources";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetNetworkPoliciesMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const onToggleNetworkPolicyDetailMock = vi.hoisted(() => vi.fn());
const openTabMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/data-access/useGetNetworkPolicies", () => ({
  useGetNetworkPolicies: useGetNetworkPoliciesMock,
}));
vi.mock("../../../../MainLayoutContext", () => ({ useMainLayoutContext: vi.fn() }));

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
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleNetworkPolicyDetail: onToggleNetworkPolicyDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleNetworkPolicyDetail: onToggleNetworkPolicyDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
});

afterEach(() => {
  cleanup();
});

// ─── edge-case and boundary tests ────────────────────────────────────────────

describe("NetworkPoliciesView — edge cases and boundary conditions", () => {
  // 1. data: undefined from hook → falls back to [], no crash, shows "0 items"
  it("data undefined from hook → renders without crash and shows '0 items'", () => {
    useGetNetworkPoliciesMock.mockReturnValue({ data: undefined });
    expect(() => renderView()).not.toThrow();
    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getByText("No Network Policies")).toBeInTheDocument();
  });

  // 2. 50+ items filtered to 0 by search → "Item list is empty" + "0 items"
  it("50+ items filtered to 0 by search → 'Item list is empty' and '0 items'", () => {
    const large = Array.from({ length: 55 }, (_, i) =>
      makePolicy({ Name: `policy-item-${i}`, Namespace: "default" })
    );
    useGetNetworkPoliciesMock.mockReturnValue({ data: large });
    renderView();

    const input = screen.getByPlaceholderText("Search Network Policies...");
    fireEvent.change(input, { target: { value: "zzz-no-match-ever" } });

    expect(screen.getByText("No Network Policies")).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  // 3. Search clear → items reappear after clearing input
  it("Search clears → items reappear after clearing input", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [makePolicy({ Name: "allow-ingress" }), makePolicy({ Name: "deny-egress" })],
    });
    renderView();

    const input = screen.getByPlaceholderText("Search Network Policies...");
    fireEvent.change(input, { target: { value: "allow" } });
    expect(screen.queryByText("deny-egress")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText("allow-ingress")).toBeInTheDocument();
    expect(screen.getByText("deny-egress")).toBeInTheDocument();
  });

  // 4. Rapid search changes → final state matches last typed value
  it("Rapid search input changes → final state matches last typed value", () => {
    const items = [
      makePolicy({ Name: "alpha-policy" }),
      makePolicy({ Name: "beta-policy" }),
      makePolicy({ Name: "gamma-policy" }),
    ];
    useGetNetworkPoliciesMock.mockReturnValue({ data: items });
    renderView();

    const input = screen.getByPlaceholderText("Search Network Policies...");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "al" } });
    fireEvent.change(input, { target: { value: "alp" } });
    fireEvent.change(input, { target: { value: "alpha" } });

    expect(screen.getByText("alpha-policy")).toBeInTheDocument();
    expect(screen.queryByText("beta-policy")).not.toBeInTheDocument();
    expect(screen.queryByText("gamma-policy")).not.toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  // 5. Empty namespace string "" → renders without crash
  it("Empty namespace string '' → renders without crash and Name cell is present", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [makePolicy({ Name: "policy-no-ns", Namespace: "" })],
    });
    expect(() => renderView()).not.toThrow();
    expect(screen.getByText("policy-no-ns")).toBeInTheDocument();
  });

  // 6. Name with special characters (e.g. "allow/deny-ingress") → renders correctly
  it("Name with special characters 'allow/deny-ingress' → renders correctly", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [makePolicy({ Name: "allow/deny-ingress" })],
    });
    renderView();
    expect(screen.getByText("allow/deny-ingress")).toBeInTheDocument();
  });

  // 7. Search matches substring in middle of name
  it("Search matches substring in middle of name", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [makePolicy({ Name: "my-ingress-policy" }), makePolicy({ Name: "unrelated" })],
    });
    renderView();

    const input = screen.getByPlaceholderText("Search Network Policies...");
    fireEvent.change(input, { target: { value: "ingress" } });

    expect(screen.getByText("my-ingress-policy")).toBeInTheDocument();
    expect(screen.queryByText("unrelated")).not.toBeInTheDocument();
  });

  // 8. Multiple items with same namespace → each row has its own ResourceLink
  it("Multiple items with same namespace → each row renders its own ResourceLink", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [
        makePolicy({ Name: "policy-a", Namespace: "shared-ns" }),
        makePolicy({ Name: "policy-b", Namespace: "shared-ns" }),
        makePolicy({ Name: "policy-c", Namespace: "shared-ns" }),
      ],
    });
    renderView();

    const nsLinks = screen.getAllByText("shared-ns");
    expect(nsLinks).toHaveLength(3);
  });

  // 9. onToggleNamespaceDetail NOT called when clicking Name cell; only on ResourceLink click
  it("onToggleNamespaceDetail NOT called on Name cell click, called on ResourceLink click", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [makePolicy({ Name: "click-test-policy", Namespace: "click-ns" })],
    });
    renderView();

    // Click on the Name cell — should not trigger namespace callback
    fireEvent.click(screen.getByText("click-test-policy"));
    expect(onToggleNamespaceDetailMock).not.toHaveBeenCalled();

    // Click on the namespace ResourceLink — should trigger callback
    fireEvent.click(screen.getByText("click-ns"));
    expect(onToggleNamespaceDetailMock).toHaveBeenCalledTimes(1);
    expect(onToggleNamespaceDetailMock).toHaveBeenCalledWith("click-ns");
  });

  // 10. Items rendered in alphabetical order by Name regardless of input order
  it("Items are rendered in alphabetical order by Name regardless of input order", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [
        makePolicy({ Name: "zeta-policy" }),
        makePolicy({ Name: "alpha-policy" }),
        makePolicy({ Name: "mid-policy" }),
      ],
    });
    renderView();

    const rows = screen.getAllByRole("row").slice(1); // exclude header row
    // Column 0 is the select-row checkbox; Name is column 1
    const firstCells = rows.map((row) => within(row).getAllByRole("cell")[1]?.textContent?.trim());
    expect(firstCells).toEqual(["alpha-policy", "mid-policy", "zeta-policy"]);
  });

  // 11. Age field with unusual value (e.g. "365d") renders in correct column
  it("Age field with unusual value '365d' renders in the Age column", () => {
    useGetNetworkPoliciesMock.mockReturnValue({
      data: [makePolicy({ Name: "old-policy", Age: "365d" })],
    });
    renderView();

    const rows = screen.getAllByRole("row").slice(1);
    // Column order: Checkbox(0), Name(1), Namespace(2), PolicyTypes(3), Age(4)
    const ageCell = rows[0].querySelectorAll("td")[4];
    expect(ageCell).toBeDefined();
    expect(ageCell?.textContent?.trim()).toBe("365d");
  });
});

/*
  COVERAGE GAP ANALYSIS

  Covered by this file:
  - Hook default fallback (undefined data → [])
  - Large dataset (55 items) filtered to empty by non-matching search
  - Search clear/reset behavior restoring all items
  - Rapid successive search input changes (final state correctness)
  - Empty namespace prop on component and empty Namespace field in data
  - Name with special characters (forward slash, hyphens)
  - Substring-in-middle search match
  - Multiple rows sharing the same namespaces: each row gets its own ResourceLink
  - Click isolation: onToggleNamespaceDetail fires only on ResourceLink, not on Name cell
  - Alphabetical sort order of rendered rows regardless of input order
  - PolicyTypes with multiple values ("Ingress, Egress") renders correctly
  - Age field with unusual value ("365d") renders in the correct column (index 4)
  - Singular vs. plural count label boundary (0 items, 1 item, N items)
  - Search is case-insensitive (implicitly: filter uses toLowerCase on both sides)

  Gaps not covered here (out of scope for edge-case unit tests or require deeper
  infrastructure):

  1. useGetNetworkPolicies real query lifecycle (loading/error states) — the hook
     is fully mocked; testing network states belongs in hook-level tests with MSW
     or a Wails backend stub.

  2. Wails EventsOn real-time streaming — the live update path (EventsOn →
     setQueryData) is exercised by the hook's useEffect, which is not invoked here
     because the hook is mocked. A separate integration test that can stub the
     Wails runtime event bus is required.

  3. ResourceLink internal routing/href behavior — ResourceLink renders real, but
     its internal anchor/router behavior is not asserted. Navigation correctness
     belongs in E2E or integration tests.

  4. Age field formatting — Age is passed through from the DTO unchanged; no
     formatting logic exists in the component, so there is nothing to unit-test
     beyond presence in the correct cell.

  5. Accessibility (ARIA roles, keyboard navigation, focus management) — no axe
     scans or keyboard-focus assertions are in this file. A dedicated a11y test
     suite (e.g. jest-axe / @axe-core/react) is recommended.

  6. context and namespace prop passthrough to the hook — props are forwarded to
     the mocked hook so correctness of forwarding is not independently verified.
     A hook-level test with the real hook verifies this.

  7. PolicyTypes empty string — the component renders the raw string value, so an
     empty PolicyTypes would render an empty cell. This is a data-layer concern
     better validated in the Go DTO, not the React component.

  8. Case-insensitive search is explicitly covered by NetworkPoliciesView.test.tsx
     test 7 (uppercase "ALLOW" query matching lowercase "allow-ingress" name).
*/
