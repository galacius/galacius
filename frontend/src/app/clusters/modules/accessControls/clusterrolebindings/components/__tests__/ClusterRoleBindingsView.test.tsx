import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClusterRoleBinding } from "../../api/resources";
import { UnifiedTrayProvider } from "../../../../../shared/components/trays/unified/UnifiedTrayContext";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const onToggleClusterRoleDetailMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const onToggleServiceAccountDetailMock = vi.hoisted(() => vi.fn());
const onToggleClusterRoleBindingDetailMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetClusterRoleBindings", () => ({
  useGetClusterRoleBindings: vi.fn(),
}));

vi.mock("../../../../../MainLayoutContext", () => ({
  useMainLayoutContext: vi.fn(),
}));

vi.mock("../../../../../shared/components/details/DetailDrawerContext", () => ({
  useDetailDrawerContext: vi.fn(),
}));

// useGetEvents is called lazily inside ClusterRoleBindingDetailDrawer.
// Mock it so the drawer can render without real IPC.
vi.mock("../../../../base/events/hooks/data-access/useGetEvents", () => ({
  useGetEvents: vi.fn(),
}));

// Wails runtime alias resolves to src/__mocks__/wailsjs/runtime/runtime.ts automatically.

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useGetClusterRoleBindings } from "../../hooks/data-access/useGetClusterRoleBindings";
import { useGetEvents } from "../../../../base/events/hooks/data-access/useGetEvents";
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

// ─── setup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  (useGetClusterRoleBindings as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
  (useGetEvents as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
  vi.mocked(useMainLayoutContext).mockReturnValue({
    activeContext: "ctx",
    onToggleClusterRoleDetail: onToggleClusterRoleDetailMock,
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleServiceAccountDetail: onToggleServiceAccountDetailMock,
    onToggleClusterRoleBindingDetail: onToggleClusterRoleBindingDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "ctx",
    onToggleClusterRoleDetail: onToggleClusterRoleDetailMock,
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleServiceAccountDetail: onToggleServiceAccountDetailMock,
    onToggleClusterRoleBindingDetail: onToggleClusterRoleBindingDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("ClusterRoleBindingsView", () => {
  it('renders heading "Cluster Role Bindings" and "0 items" count', () => {
    render(<ClusterRoleBindingsView />, { wrapper: makeWrapper() });

    // Use getAllByText to tolerate hidden Sheet portal duplication
    expect(screen.getAllByText("Cluster Role Bindings").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0 item/).length).toBeGreaterThan(0);
  });

  it("renders list of CRBs with Name, Cluster Role, and Age columns", () => {
    const crbs = [
      makeCrb({ Name: "binding-a", RoleRefName: "role-a", Age: "3d" }),
      makeCrb({ Name: "binding-b", RoleRefName: "role-b", Age: "5d" }),
    ];
    (useGetClusterRoleBindings as ReturnType<typeof vi.fn>).mockReturnValue({ data: crbs });

    render(<ClusterRoleBindingsView />, { wrapper: makeWrapper() });

    expect(screen.getAllByText("binding-a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("binding-b").length).toBeGreaterThan(0);
    expect(screen.getAllByText("role-a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("role-b").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3d").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5d").length).toBeGreaterThan(0);
  });

  it('shows "Item list is empty" when data is empty', () => {
    render(<ClusterRoleBindingsView />, { wrapper: makeWrapper() });

    expect(screen.getAllByText("No Cluster Role Bindings").length).toBeGreaterThan(0);
  });

  it("filters CRBs by search (case-insensitive)", () => {
    const crbs = [makeCrb({ Name: "admin-binding" }), makeCrb({ Name: "view-binding" })];
    (useGetClusterRoleBindings as ReturnType<typeof vi.fn>).mockReturnValue({ data: crbs });

    render(<ClusterRoleBindingsView />, { wrapper: makeWrapper() });

    const input = screen.getByPlaceholderText("Search Cluster Role Bindings...");
    fireEvent.change(input, { target: { value: "ADMIN" } });

    expect(screen.getAllByText("admin-binding").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("view-binding")).toHaveLength(0);
  });

  it("renders list sorted alphabetically by Name", () => {
    const crbs = [
      makeCrb({ Name: "zebra-binding", RoleRefName: "role-z" }),
      makeCrb({ Name: "alpha-binding", RoleRefName: "role-a" }),
      makeCrb({ Name: "mango-binding", RoleRefName: "role-m" }),
    ];
    (useGetClusterRoleBindings as ReturnType<typeof vi.fn>).mockReturnValue({ data: crbs });

    render(<ClusterRoleBindingsView />, { wrapper: makeWrapper() });

    // Find all table rows (role="row") and extract first td text
    const rows = screen.getAllByRole("row");
    // rows[0] is the header; data rows start at index 1 (skip portal-duplicated rows by
    // finding the first three that have a td with content matching a known CRB name)
    // Column 0 is the select-row checkbox; Name is column 1
    const dataRows = rows.filter((row) => row.querySelectorAll("td")[1]?.textContent);
    const nameCells = dataRows.map((row) => row.querySelectorAll("td")[1]?.textContent);
    expect(nameCells).toEqual(["alpha-binding", "mango-binding", "zebra-binding"]);
  });

  it("clicking a row calls onToggleClusterRoleBindingDetail with the CRB name", () => {
    const crb = makeCrb({ Name: "my-crb" });
    (useGetClusterRoleBindings as ReturnType<typeof vi.fn>).mockReturnValue({ data: [crb] });

    render(<ClusterRoleBindingsView />, { wrapper: makeWrapper() });

    // Click the name cell
    fireEvent.click(screen.getAllByText("my-crb")[0]);

    // Verify callback was called with the CRB name
    expect(onToggleClusterRoleBindingDetailMock).toHaveBeenCalledWith("my-crb");
  });

  it("clicking the RoleRefName ResourceLink calls onToggleClusterRoleDetail and stops row propagation", () => {
    const crb = makeCrb({ Name: "my-crb", RoleRefName: "my-role" });
    (useGetClusterRoleBindings as ReturnType<typeof vi.fn>).mockReturnValue({ data: [crb] });

    render(<ClusterRoleBindingsView />, { wrapper: makeWrapper() });

    // The ResourceLink renders a button wrapping the role name text
    const roleLinks = screen.getAllByText("my-role");
    const roleBtn = roleLinks.find((el) => el.closest("button") !== null);
    expect(roleBtn).toBeTruthy();
    if (!roleBtn) throw new Error("roleBtn not found");
    fireEvent.click(roleBtn);

    expect(onToggleClusterRoleDetailMock).toHaveBeenCalledWith("my-role");
    // Row click must NOT have also fired — drawer title should NOT be in the DOM
    expect(screen.queryAllByText("Cluster Role Binding: my-crb")).toHaveLength(0);
  });

  it("deduplicates subject types in the Types column", () => {
    const crb = makeCrb({
      Name: "sa-binding",
      Subjects: [
        { Kind: "ServiceAccount", Name: "sa-1", Namespace: "default" },
        { Kind: "ServiceAccount", Name: "sa-2", Namespace: "kube-system" },
      ],
    });
    (useGetClusterRoleBindings as ReturnType<typeof vi.fn>).mockReturnValue({ data: [crb] });

    render(<ClusterRoleBindingsView />, { wrapper: makeWrapper() });

    // Only one "ServiceAccount" cell in the Types column (deduplicated via Set)
    const typeCells = screen.getAllByText("ServiceAccount");
    expect(typeCells).toHaveLength(1);
  });
});
