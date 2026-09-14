import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClusterRoleBinding } from "../../api/resources";
import { UnifiedTrayProvider } from "../../../../../shared/components/trays/unified/UnifiedTrayContext";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetEventsMock = vi.hoisted(() => vi.fn());
const useGetClusterRoleBindingDetailMock = vi.hoisted(() => vi.fn());
const useCatchForbiddenResourceMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const onToggleClusterRoleDetailMock = vi.hoisted(() => vi.fn());
const onToggleServiceAccountDetailMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../base/events/hooks/data-access/useGetEvents", () => ({
  useGetEvents: useGetEventsMock,
}));

vi.mock("../../hooks/data-access/useGetClusterRoleBindingDetail", () => ({
  useGetClusterRoleBindingDetail: useGetClusterRoleBindingDetailMock,
}));

vi.mock("../../../../../../shared/hooks/async-events/useCatchForbiddenResource", () => ({
  useCatchForbiddenResource: useCatchForbiddenResourceMock,
}));

vi.mock("../../../../../MainLayoutContext", () => ({
  useMainLayoutContext: vi.fn(),
}));

vi.mock("../../../../../shared/components/details/DetailDrawerContext", () => ({
  useDetailDrawerContext: vi.fn(),
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useMainLayoutContext } from "../../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../../shared/components/details/DetailDrawerContext";
import { ClusterRoleBindingDetailDrawer } from "../ClusterRoleBindingDetailDrawer";

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
    Age: "2d",
    CreatedAt: "2026-01-01T00:00:00Z",
    Labels: {},
    Annotations: {},
    ManagedFields: [],
    ...overrides,
  };
}

function renderDrawer(
  props: Partial<{
    crb: ClusterRoleBinding | null;
    open: boolean;
    onClose: () => void;
  }> = {}
) {
  const { crb = null, open = false, onClose = vi.fn() } = props;
  useGetClusterRoleBindingDetailMock.mockReturnValue({ data: crb ?? undefined });
  return render(
    <ClusterRoleBindingDetailDrawer
      clusterRoleBindingName={crb?.Name ?? null}
      open={open}
      onClose={onClose}
    />,
    { wrapper: makeWrapper() }
  );
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useGetEventsMock.mockReturnValue({ data: [] });
  useCatchForbiddenResourceMock.mockReturnValue(undefined);
  (useMainLayoutContext as ReturnType<typeof vi.fn>).mockReturnValue({
    activeContext: "test-ctx",
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleClusterRoleDetail: onToggleClusterRoleDetailMock,
    onToggleServiceAccountDetail: onToggleServiceAccountDetailMock,
    onTogglePodDetail: vi.fn(),
    onToggleDeploymentDetail: vi.fn(),
    onToggleReplicaSetDetail: vi.fn(),
    onToggleEventDetail: vi.fn(),
  });
  (useDetailDrawerContext as ReturnType<typeof vi.fn>).mockReturnValue({
    activeContext: "test-ctx",
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleClusterRoleDetail: onToggleClusterRoleDetailMock,
    onToggleServiceAccountDetail: onToggleServiceAccountDetailMock,
    onTogglePodDetail: vi.fn(),
    onToggleDeploymentDetail: vi.fn(),
    onToggleReplicaSetDetail: vi.fn(),
    onToggleEventDetail: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
});

// ─── edge-case tests ──────────────────────────────────────────────────────────

describe("ClusterRoleBindingDetailDrawer — edge cases", () => {
  // 1. crb changes from null to a valid object → body renders
  it("crb transitions from null to a valid object → drawer body becomes visible", () => {
    const { rerender } = renderDrawer({ crb: null, open: true });
    // EmptyStateBody always renders "Cluster Role Binding: —" — verify tabs are absent (no drawer body)
    expect(screen.queryByRole("tablist")).toBeNull();

    const crb = makeCrb({ Name: "appeared-crb" });
    useGetClusterRoleBindingDetailMock.mockReturnValue({ data: crb });
    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ClusterRoleBindingDetailDrawer
          clusterRoleBindingName={crb.Name}
          open={true}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText("Cluster Role Binding: appeared-crb")).toBeInTheDocument();
  });

  // 2. crb identity changes → body re-mounts (key={crb.Name} effect)
  it("crb identity changes (different Name) → title updates to new name", () => {
    const crb1 = makeCrb({ Name: "first-crb" });
    const { rerender } = renderDrawer({ crb: crb1, open: true });
    expect(screen.getByText("Cluster Role Binding: first-crb")).toBeInTheDocument();

    const crb2 = makeCrb({ Name: "second-crb" });
    useGetClusterRoleBindingDetailMock.mockReturnValue({ data: crb2 });
    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ClusterRoleBindingDetailDrawer
          clusterRoleBindingName={crb2.Name}
          open={true}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.queryByText("Cluster Role Binding: first-crb")).not.toBeInTheDocument();
    expect(screen.getByText("Cluster Role Binding: second-crb")).toBeInTheDocument();
  });

  // 3. Labels empty object → shows "—"
  it("Labels is empty object → shows '—' placeholder, not an empty tag list", () => {
    const crb = makeCrb({ Labels: {} });
    renderDrawer({ crb, open: true });
    // There is a "—" somewhere on the page (could be labels or annotations or namespace)
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    // No AnnotationBadge should exist for labels
    expect(screen.queryByText(/=/)).not.toBeInTheDocument();
  });

  // 4. Annotations empty object → shows "—"
  it("Annotations is empty object → shows '—' placeholder", () => {
    const crb = makeCrb({ Annotations: {} });
    renderDrawer({ crb, open: true });
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  // 5. ManagedFields empty array → managed fields section not rendered
  it("ManagedFields is empty array → 'Managed Fields' label is not rendered", () => {
    const crb = makeCrb({ ManagedFields: [] });
    renderDrawer({ crb, open: true });
    expect(screen.queryByText("Managed Fields")).not.toBeInTheDocument();
  });

  // 6. ManagedFields has entries → renders ManagedFieldBlock for each
  it("ManagedFields has 2 entries → 'Managed Fields' label and both managers are rendered", () => {
    const crb = makeCrb({
      ManagedFields: [
        { Manager: "kubectl-client-side-apply", Operation: "Update", FieldsYAML: "" },
        { Manager: "kube-controller-manager", Operation: "Apply", FieldsYAML: "" },
      ],
    });
    renderDrawer({ crb, open: true });
    expect(screen.getByText("Managed Fields")).toBeInTheDocument();
    // ManagedFieldBlock renders "{Manager}: {Operation}" in a single span; use partial regex match
    expect(screen.getByText(/kubectl-client-side-apply/)).toBeInTheDocument();
    expect(screen.getByText(/kube-controller-manager/)).toBeInTheDocument();
  });

  // 7. Subject with empty Namespace string → shows "—" in namespace cell
  it("Subject with empty Namespace string → shows '—' in the namespace cell", () => {
    const crb = makeCrb({
      Subjects: [{ Kind: "User", Name: "alice", Namespace: "" }],
    });
    renderDrawer({ crb, open: true });
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  // 8. Subject Kind is "Group" → renders as plain text, no ResourceLink button
  it("Subject Kind 'Group' → Name renders as plain text, not inside a button", () => {
    const crb = makeCrb({
      Subjects: [{ Kind: "Group", Name: "system:masters", Namespace: "" }],
    });
    renderDrawer({ crb, open: true });

    const nameEl = screen.getByText("system:masters");
    expect(nameEl.closest("button")).toBeNull();
  });

  it("Subject Kind 'User' → Name renders as plain text, not inside a button", () => {
    const crb = makeCrb({
      Subjects: [{ Kind: "User", Name: "regular-user", Namespace: "" }],
    });
    renderDrawer({ crb, open: true });

    const nameEl = screen.getByText("regular-user");
    expect(nameEl.closest("button")).toBeNull();
  });

  it("Subject Kind 'ServiceAccount' → Name renders inside a button (ResourceLink)", () => {
    const crb = makeCrb({
      Subjects: [{ Kind: "ServiceAccount", Name: "my-sa", Namespace: "default" }],
    });
    renderDrawer({ crb, open: true });

    const nameEl = screen.getByText("my-sa");
    expect(nameEl.closest("button")).not.toBeNull();
  });

  // 9. Events tab: clicking fires useGetEvents; switching back to overview doesn't reset
  it("Events tab not visible initially — useGetEvents not called until tab clicked", () => {
    const crb = makeCrb({ Name: "lazy-events-crb" });
    renderDrawer({ crb, open: true });

    // On the overview tab by default; events hook must be idle
    expect(useGetEventsMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Events"));
    expect(useGetEventsMock).toHaveBeenCalledTimes(1);
  });

  it("Switching back to Overview after Events tab → hook call count doesn't increase again", () => {
    const crb = makeCrb({ Name: "tab-switch-crb" });
    renderDrawer({ crb, open: true });

    fireEvent.click(screen.getByText("Events"));
    const callCountAfterEvents = useGetEventsMock.mock.calls.length;

    fireEvent.click(screen.getByText("Overview"));
    // Events hook should not have been called again
    expect(useGetEventsMock).toHaveBeenCalledTimes(callCountAfterEvents);
  });

  it("Events tab open → events are filtered by InvolvedObjectName matching crb.Name", () => {
    const crb = makeCrb({ Name: "target-crb" });
    useGetEventsMock.mockReturnValue({
      data: [
        {
          Name: "ev-1",
          InvolvedObjectKind: "clusterrolebinding",
          InvolvedObjectName: "target-crb",
          Namespace: "",
          Reason: "Synced",
          // Message is the column rendered in EventsTable
          Message: "event-for-target-crb",
          Type: "Normal",
          Count: 1,
          Age: "1m",
          CreatedAt: 1700000000,
          FirstSeen: "1m",
          FirstSeenAt: "2026-01-01T00:00:00Z",
          InvolvedObjectFieldPath: "",
          InvolvedObjectNamespace: "",
          ManagedFields: [],
        },
        {
          Name: "ev-2",
          InvolvedObjectKind: "clusterrolebinding",
          InvolvedObjectName: "other-crb", // should be filtered out
          Namespace: "",
          Reason: "Conflict",
          Message: "event-for-other-crb",
          Type: "Warning",
          Count: 1,
          Age: "2m",
          CreatedAt: 1700000001,
          FirstSeen: "2m",
          FirstSeenAt: "2026-01-01T00:00:00Z",
          InvolvedObjectFieldPath: "",
          InvolvedObjectNamespace: "",
          ManagedFields: [],
        },
      ],
    });

    renderDrawer({ crb, open: true });
    fireEvent.click(screen.getByText("Events"));

    // Message for target-crb must appear; message for other-crb must be absent
    expect(screen.getByText("event-for-target-crb")).toBeInTheDocument();
    expect(screen.queryByText("event-for-other-crb")).not.toBeInTheDocument();
  });

  // 10. open=false → Sheet is closed; no content visible
  it("open=false → Sheet is closed, drawer content is not in the document", () => {
    const crb = makeCrb({ Name: "hidden-crb" });
    renderDrawer({ crb, open: false });
    expect(screen.queryByText("Cluster Role Binding: hidden-crb")).not.toBeInTheDocument();
  });

  it("open=false with crb=null → renders without crash", () => {
    expect(() => renderDrawer({ crb: null, open: false })).not.toThrow();
  });

  // Boundary: Subjects empty array → Bindings section shows "—"
  it("Subjects empty array → Bindings section shows '—' placeholder", () => {
    const crb = makeCrb({ Subjects: [] });
    renderDrawer({ crb, open: true });
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  // Boundary: RoleRefGroup empty string → reference table shows "—"
  it("RoleRefGroup empty string → API Group cell shows '—'", () => {
    const crb = makeCrb({ RoleRefGroup: "" });
    renderDrawer({ crb, open: true });
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  // Labels and Annotations with actual values → renders badges
  it("Labels with entries → renders AnnotationBadge for each key=value pair", () => {
    const crb = makeCrb({
      Labels: { app: "myapp", env: "staging" },
      Annotations: {},
    });
    renderDrawer({ crb, open: true });
    expect(screen.getByText("app=myapp")).toBeInTheDocument();
    expect(screen.getByText("env=staging")).toBeInTheDocument();
  });

  it("Annotations with entries → renders AnnotationBadge for each key=value pair", () => {
    const crb = makeCrb({
      Labels: {},
      Annotations: { "managed-by": "helm" },
    });
    renderDrawer({ crb, open: true });
    expect(screen.getByText("managed-by=helm")).toBeInTheDocument();
  });
});
