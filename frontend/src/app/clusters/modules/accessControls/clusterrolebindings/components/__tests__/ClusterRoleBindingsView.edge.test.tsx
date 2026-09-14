import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClusterRoleBinding } from "../../api/resources";
import { UnifiedTrayProvider } from "../../../../../shared/components/trays/unified/UnifiedTrayContext";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetClusterRoleBindingsMock = vi.hoisted(() => vi.fn());
const onToggleClusterRoleDetailMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const onToggleServiceAccountDetailMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetClusterRoleBindings", () => ({
  useGetClusterRoleBindings: useGetClusterRoleBindingsMock,
}));

vi.mock("../../../../../MainLayoutContext", () => ({
  useMainLayoutContext: vi.fn(),
}));

vi.mock("../../../../../shared/components/details/DetailDrawerContext", () => ({
  useDetailDrawerContext: vi.fn(),
}));

// Stub the drawer — this file tests the view in isolation.
// Without this stub, the drawer brings in useGetEvents and Sheet animations
// that aren't the focus of these edge-case tests.
vi.mock("../ClusterRoleBindingDetailDrawer", () => ({
  ClusterRoleBindingDetailDrawer: ({
    crb,
    open,
  }: {
    crb: { Name: string } | null;
    open: boolean;
  }) =>
    open && crb ? <div data-testid="drawer-stub">Cluster Role Binding: {crb.Name}</div> : null,
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useMainLayoutContext } from "../../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../../shared/components/details/DetailDrawerContext";
import { ClusterRoleBindingsView } from "../../ClusterRoleBindingsView";

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

function makeCrb(overrides: Partial<ClusterRoleBinding> = {}): ClusterRoleBinding {
  return {
    Name: "test-crb",
    RoleRefName: "test-role",
    RoleRefKind: "ClusterRole",
    RoleRefGroup: "rbac.authorization.k8s.io",
    Subjects: [],
    Bindings: "",
    Age: "1d",
    CreatedAt: "2026-01-01T00:00:00Z",
    Labels: {},
    Annotations: {},
    ManagedFields: [],
    ...overrides,
  };
}

function renderView() {
  return render(<ClusterRoleBindingsView />, {
    wrapper: makeWrapper(),
  });
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useGetClusterRoleBindingsMock.mockReturnValue({ data: [] });
  vi.mocked(useMainLayoutContext).mockReturnValue({
    activeContext: "test-ctx",
    onToggleClusterRoleDetail: onToggleClusterRoleDetailMock,
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleServiceAccountDetail: onToggleServiceAccountDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "test-ctx",
    onToggleClusterRoleDetail: onToggleClusterRoleDetailMock,
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleServiceAccountDetail: onToggleServiceAccountDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
});

afterEach(() => {
  cleanup();
});

// ─── edge-case tests ──────────────────────────────────────────────────────────

describe("ClusterRoleBindingsView — edge cases", () => {
  // 1. Subjects null/undefined
  it("Subjects null → Types column shows '—' without crashing", () => {
    useGetClusterRoleBindingsMock.mockReturnValue({
      data: [makeCrb({ Name: "null-subjects-crb", Subjects: null as never })],
    });
    renderView();
    // Types cell falls back to "—" when the deduped set is empty
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("null-subjects-crb")).toBeInTheDocument();
  });

  it("Subjects undefined → Types column shows '—' without crashing", () => {
    useGetClusterRoleBindingsMock.mockReturnValue({
      data: [makeCrb({ Name: "undef-subjects-crb", Subjects: undefined as never })],
    });
    renderView();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  // 2. Bindings is empty string
  it("Bindings empty string → TruncatedText renders without error", () => {
    useGetClusterRoleBindingsMock.mockReturnValue({
      data: [makeCrb({ Name: "empty-bindings-crb", Bindings: "" })],
    });
    expect(() => renderView()).not.toThrow();
    expect(screen.getByText("empty-bindings-crb")).toBeInTheDocument();
  });

  // 3. Search clears → controlled state resets
  it("Search clears → both items reappear after clearing input", async () => {
    useGetClusterRoleBindingsMock.mockReturnValue({
      data: [makeCrb({ Name: "nginx-crb" }), makeCrb({ Name: "other-crb" })],
    });
    renderView();

    const input = screen.getByPlaceholderText("Search Cluster Role Bindings...");
    fireEvent.change(input, { target: { value: "nginx" } });
    expect(screen.queryByText("other-crb")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "" } });
    await waitFor(() => {
      expect(screen.getByText("nginx-crb")).toBeInTheDocument();
      expect(screen.getByText("other-crb")).toBeInTheDocument();
    });
  });

  // 4. Exactly 1 item → singular "item"
  it("Exactly 1 item → count label shows '1 item' (no trailing 's')", () => {
    useGetClusterRoleBindingsMock.mockReturnValue({
      data: [makeCrb({ Name: "solo-crb" })],
    });
    renderView();
    expect(screen.getByText("1 item")).toBeInTheDocument();
    expect(screen.queryByText("1 items")).not.toBeInTheDocument();
  });

  // 5. Very large list filtered to 0 → empty state
  it("50+ items filtered to 0 results → empty state row and '0 items' count", async () => {
    const large = Array.from({ length: 55 }, (_, i) => makeCrb({ Name: `crb-item-${i}` }));
    useGetClusterRoleBindingsMock.mockReturnValue({ data: large });
    renderView();

    const input = screen.getByPlaceholderText("Search Cluster Role Bindings...");
    fireEvent.change(input, { target: { value: "zzz-no-match-ever" } });

    await waitFor(() => {
      expect(screen.getByText("No Cluster Role Bindings")).toBeInTheDocument();
    });
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  // 6. Multiple subjects with mixed Kinds → deduplicated comma-separated list
  it("Multiple subjects with mixed Kinds → Types shows comma-separated deduplicated list", () => {
    useGetClusterRoleBindingsMock.mockReturnValue({
      data: [
        makeCrb({
          Name: "mixed-crb",
          Subjects: [
            { Kind: "User", Name: "alice", Namespace: "" },
            { Kind: "Group", Name: "devs", Namespace: "" },
            { Kind: "User", Name: "bob", Namespace: "" }, // duplicate — must be deduped
          ],
        }),
      ],
    });
    renderView();
    // "User" appears first, "Group" second (insertion order); no repeated "User"
    expect(screen.getByText("User, Group")).toBeInTheDocument();
  });

  it("All subjects with the same Kind → Types shows only one value, no comma", () => {
    useGetClusterRoleBindingsMock.mockReturnValue({
      data: [
        makeCrb({
          Name: "sa-only-crb",
          Subjects: [
            { Kind: "ServiceAccount", Name: "sa-1", Namespace: "default" },
            { Kind: "ServiceAccount", Name: "sa-2", Namespace: "kube-system" },
          ],
        }),
      ],
    });
    renderView();
    // Must appear exactly once as a Types cell value
    const cells = screen.getAllByText("ServiceAccount");
    expect(cells).toHaveLength(1);
  });

  // 7. Search is case-insensitive
  it("Search is case-insensitive — 'NGINX' matches 'nginx-crb'", () => {
    useGetClusterRoleBindingsMock.mockReturnValue({
      data: [makeCrb({ Name: "nginx-crb" }), makeCrb({ Name: "apache-crb" })],
    });
    renderView();

    const input = screen.getByPlaceholderText("Search Cluster Role Bindings...");
    fireEvent.change(input, { target: { value: "NGINX" } });

    expect(screen.getByText("nginx-crb")).toBeInTheDocument();
    expect(screen.queryByText("apache-crb")).not.toBeInTheDocument();
  });

  it("Search is case-insensitive — mixed-case query matches lower-case name", () => {
    useGetClusterRoleBindingsMock.mockReturnValue({
      data: [makeCrb({ Name: "system:node-proxier" })],
    });
    renderView();

    const input = screen.getByPlaceholderText("Search Cluster Role Bindings...");
    fireEvent.change(input, { target: { value: "System:Node" } });

    expect(screen.getByText("system:node-proxier")).toBeInTheDocument();
  });

  // 8. Rapid search input changes → final state reflects last value
  it("Rapid search input changes → final state reflects last typed value only", async () => {
    const items = [
      makeCrb({ Name: "alpha-crb" }),
      makeCrb({ Name: "beta-crb" }),
      makeCrb({ Name: "gamma-crb" }),
    ];
    useGetClusterRoleBindingsMock.mockReturnValue({ data: items });
    renderView();

    const input = screen.getByPlaceholderText("Search Cluster Role Bindings...");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "al" } });
    fireEvent.change(input, { target: { value: "alp" } });
    fireEvent.change(input, { target: { value: "alpha" } });

    await waitFor(() => {
      expect(screen.getByText("alpha-crb")).toBeInTheDocument();
      expect(screen.queryByText("beta-crb")).not.toBeInTheDocument();
      expect(screen.queryByText("gamma-crb")).not.toBeInTheDocument();
    });
    // Count label must reflect filtered result
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  // Boundary: exactly 0 items from data (not from search)
  it("Empty data response → '0 items' and empty state, no table rows", () => {
    useGetClusterRoleBindingsMock.mockReturnValue({ data: [] });
    renderView();
    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getByText("No Cluster Role Bindings")).toBeInTheDocument();
  });

  // Boundary: undefined data (hook hasn't resolved yet — default fallback)
  it("Undefined data (hook not yet resolved) → renders without crash, shows '0 items'", () => {
    useGetClusterRoleBindingsMock.mockReturnValue({ data: undefined });
    expect(() => renderView()).not.toThrow();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });
});
