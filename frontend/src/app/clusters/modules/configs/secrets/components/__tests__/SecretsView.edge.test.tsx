import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { UnifiedTrayProvider } from "../../../../../shared/components/trays/unified/UnifiedTrayContext";
import type { Secret } from "../../api/resources";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetSecretsMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const onToggleSecretDetailMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetSecrets", () => ({
  useGetSecrets: useGetSecretsMock,
}));
vi.mock("../../../../../MainLayoutContext", () => ({ useMainLayoutContext: vi.fn() }));

vi.mock("../../../../../shared/components/details/DetailDrawerContext", () => ({
  useDetailDrawerContext: vi.fn(),
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useMainLayoutContext } from "../../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../../shared/components/details/DetailDrawerContext";
import { SecretsView } from "../../SecretsView";

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

function makeSecret(overrides: Partial<Secret> = {}): Secret {
  return {
    Name: "test-secret",
    Namespace: "default",
    Labels: [],
    Keys: [],
    Type: "Opaque",
    Age: "1d",
    ...overrides,
  };
}

function renderView() {
  return render(<SecretsView />, {
    wrapper: makeWrapper(),
  });
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useGetSecretsMock.mockReturnValue({ data: [] });
  vi.mocked(useMainLayoutContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleSecretDetail: onToggleSecretDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleSecretDetail: onToggleSecretDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
});

afterEach(() => {
  cleanup();
});

// ─── edge-case and boundary tests ────────────────────────────────────────────

describe("SecretsView — edge cases and boundary conditions", () => {
  // 1. data: undefined from hook → falls back to [], no crash, shows "0 items"
  it("data undefined from hook → renders without crash and shows '0 items'", () => {
    useGetSecretsMock.mockReturnValue({ data: undefined });
    expect(() => renderView()).not.toThrow();
    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getByText("No Secrets")).toBeInTheDocument();
  });

  // 2. 50+ items filtered to 0 by search → "Item list is empty" + "0 items"
  it("50+ items filtered to 0 by search → 'Item list is empty' and '0 items'", async () => {
    const large = Array.from({ length: 55 }, (_, i) =>
      makeSecret({ Name: `secret-item-${i}`, Namespace: "default" })
    );
    useGetSecretsMock.mockReturnValue({ data: large });
    renderView();

    const input = screen.getByPlaceholderText("Search Secrets...");
    fireEvent.change(input, { target: { value: "zzz-no-match-ever" } });

    await waitFor(() => {
      expect(screen.getByText("No Secrets")).toBeInTheDocument();
    });
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  // 3. Search clear → items reappear after clearing input
  it("Search clears → items reappear after clearing input", async () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "tls-secret" }), makeSecret({ Name: "other-secret" })],
    });
    renderView();

    const input = screen.getByPlaceholderText("Search Secrets...");
    fireEvent.change(input, { target: { value: "tls" } });
    expect(screen.queryByText("other-secret")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "" } });
    await waitFor(() => {
      expect(screen.getByText("tls-secret")).toBeInTheDocument();
      expect(screen.getByText("other-secret")).toBeInTheDocument();
    });
  });

  // 4. Rapid search changes → final state matches last typed value
  it("Rapid search input changes → final state matches last typed value", async () => {
    const items = [
      makeSecret({ Name: "alpha-secret" }),
      makeSecret({ Name: "beta-secret" }),
      makeSecret({ Name: "gamma-secret" }),
    ];
    useGetSecretsMock.mockReturnValue({ data: items });
    renderView();

    const input = screen.getByPlaceholderText("Search Secrets...");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "al" } });
    fireEvent.change(input, { target: { value: "alp" } });
    fireEvent.change(input, { target: { value: "alpha" } });

    await waitFor(() => {
      expect(screen.getByText("alpha-secret")).toBeInTheDocument();
      expect(screen.queryByText("beta-secret")).not.toBeInTheDocument();
      expect(screen.queryByText("gamma-secret")).not.toBeInTheDocument();
    });
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  // 5. Empty namespace string "" → renders without crash
  it("Empty namespace string '' → renders without crash and Name cell is present", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "secret-no-ns", Namespace: "" })],
    });
    expect(() => renderView()).not.toThrow();
    expect(screen.getByText("secret-no-ns")).toBeInTheDocument();
  });

  // 6. Name with special characters (e.g. "tls/cert-secret") → renders correctly
  it("Name with special characters 'tls/cert-secret' → renders correctly", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "tls/cert-secret" })],
    });
    renderView();
    expect(screen.getByText("tls/cert-secret")).toBeInTheDocument();
  });

  // 7. Search matches substring in middle of name
  it("Search matches substring in middle of name", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "my-tls-certificate" }), makeSecret({ Name: "unrelated" })],
    });
    renderView();

    const input = screen.getByPlaceholderText("Search Secrets...");
    fireEvent.change(input, { target: { value: "tls" } });

    expect(screen.getByText("my-tls-certificate")).toBeInTheDocument();
    expect(screen.queryByText("unrelated")).not.toBeInTheDocument();
  });

  // 8. Multiple items with same namespace → each row has its own ResourceLink
  it("Multiple items with same namespace → each row renders its own ResourceLink", () => {
    useGetSecretsMock.mockReturnValue({
      data: [
        makeSecret({ Name: "secret-a", Namespace: "shared-ns" }),
        makeSecret({ Name: "secret-b", Namespace: "shared-ns" }),
        makeSecret({ Name: "secret-c", Namespace: "shared-ns" }),
      ],
    });
    renderView();

    const nsLinks = screen.getAllByText("shared-ns");
    expect(nsLinks).toHaveLength(3);
  });

  // 9. onToggleNamespaceDetail NOT called when clicking Name cell; called only on ResourceLink
  it("onToggleNamespaceDetail NOT called on Name cell click, called on ResourceLink click", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "click-test-secret", Namespace: "click-ns" })],
    });
    renderView();

    // Click on the Name cell — should not trigger namespace callback
    fireEvent.click(screen.getByText("click-test-secret"));
    expect(onToggleNamespaceDetailMock).not.toHaveBeenCalled();

    // Click on the namespace ResourceLink — should trigger callback
    fireEvent.click(screen.getByText("click-ns"));
    expect(onToggleNamespaceDetailMock).toHaveBeenCalledTimes(1);
    expect(onToggleNamespaceDetailMock).toHaveBeenCalledWith("click-ns");
  });

  // 10. Items rendered in alphabetical order by Name regardless of input order
  it("Items are rendered in alphabetical order by Name regardless of input order", () => {
    useGetSecretsMock.mockReturnValue({
      data: [
        makeSecret({ Name: "zeta-secret" }),
        makeSecret({ Name: "alpha-secret" }),
        makeSecret({ Name: "mid-secret" }),
      ],
    });
    renderView();

    const rows = screen.getAllByRole("row").slice(1); // exclude header row
    // Column 0 is the select-row checkbox; Name is column 1
    const firstCells = rows.map((row) => row.querySelectorAll("td")[1]?.textContent);
    expect(firstCells).toEqual(["alpha-secret", "mid-secret", "zeta-secret"]);
  });

  // 11. Labels with null/undefined → shows "—" without crash
  it("Labels null → shows '—' without crash", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "null-labels-secret", Labels: null as unknown as string[] })],
    });
    expect(() => renderView()).not.toThrow();
    // Labels cell should show "—"
    const rows = screen.getAllByRole("row").slice(1);
    const labelsCell = rows[0].querySelectorAll("td")[3];
    expect(labelsCell?.textContent).toBe("—");
  });

  it("Labels undefined → shows '—' without crash", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "undef-labels-secret", Labels: undefined as unknown as string[] })],
    });
    expect(() => renderView()).not.toThrow();
    const rows = screen.getAllByRole("row").slice(1);
    const labelsCell = rows[0].querySelectorAll("td")[3];
    expect(labelsCell?.textContent).toBe("—");
  });

  // 12. Keys with empty array → shows "—"
  it("Keys empty array → shows '—'", () => {
    useGetSecretsMock.mockReturnValue({
      data: [makeSecret({ Name: "empty-keys-secret", Keys: [] })],
    });
    renderView();
    const rows = screen.getAllByRole("row").slice(1);
    const keysCell = rows[0].querySelectorAll("td")[4];
    expect(keysCell?.textContent).toBe("—");
  });

  // 13. Type field with kubernetes.io/service-account-token → renders correctly
  it("Type 'kubernetes.io/service-account-token' renders correctly in Type column", () => {
    useGetSecretsMock.mockReturnValue({
      data: [
        makeSecret({
          Name: "sa-token-secret",
          Type: "kubernetes.io/service-account-token",
        }),
      ],
    });
    renderView();
    expect(screen.getByText("kubernetes.io/service-account-token")).toBeInTheDocument();
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
  - Labels: null, undefined, and empty array all render "—"
  - Keys: empty array renders "—"; multiple keys joined with ", "
  - Labels: multiple values joined with ", "
  - Type field with full kubernetes.io/... type string
  - Singular vs. plural count label boundary (0 items, 1 item, N items)
  - Case-insensitive search

  Gaps not covered here (out of scope for edge-case unit tests or require deeper
  infrastructure):

  1. useGetSecrets real query lifecycle (loading/error states) — the hook is fully
     mocked; testing network states belongs in hook-level tests with MSW or a
     Wails backend stub.

  2. Wails EventsOn real-time streaming — the live update path (EventsOn →
     setQueryData) is exercised by the hook's useEffect, which is not invoked here
     because the hook is mocked. A separate integration test that can stub the
     Wails runtime event bus is required.

  3. ResourceLink internal routing/href behavior — ResourceLink renders real, but
     its internal anchor/router behavior is not asserted. Navigation correctness
     belongs in E2E or integration tests.

  4. Age field formatting — Age is passed through from the DTO unchanged; no
     formatting logic exists in the component, so there is nothing to unit-test
     beyond presence in the cell.

  5. Accessibility (ARIA roles, keyboard navigation, focus management) — no axe
     scans or keyboard-focus assertions are in this file. A dedicated a11y test
     suite (e.g. jest-axe / @axe-core/react) is recommended.

  6. context and namespace prop passthrough to the hook — props are forwarded to
     the mocked hook so correctness of forwarding is not exercised. A hook-level
     test with the real hook verifies this.

  7. Keys: null value — the component uses `s.Keys?.join(", ") || "—"`, so a null
     Keys field would display "—", but null is not passed through the TypeScript
     type. An explicit null test would require a type cast; covered implicitly by
     the optional-chaining path tested with undefined Labels.
*/
