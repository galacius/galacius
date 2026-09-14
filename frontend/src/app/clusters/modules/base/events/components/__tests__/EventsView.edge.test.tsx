import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetEventsMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const onTogglePodDetailMock = vi.hoisted(() => vi.fn());
const onToggleDeploymentDetailMock = vi.hoisted(() => vi.fn());
const onToggleReplicaSetDetailMock = vi.hoisted(() => vi.fn());
const onToggleEventDetailMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetEvents", () => ({
  useGetEvents: useGetEventsMock,
}));
vi.mock("../../../../../MainLayoutContext", () => ({ useMainLayoutContext: vi.fn() }));

vi.mock("../../../../../shared/components/details/DetailDrawerContext", () => ({
  useDetailDrawerContext: vi.fn(),
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useMainLayoutContext } from "../../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../../shared/components/details/DetailDrawerContext";
import { EventsView } from "../../EventsView";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeEvent(overrides: Partial<import("../../api/resources").Event> = {}) {
  return {
    Type: "Normal",
    Message: "test message",
    Namespace: "default",
    InvolvedObjectKind: "Pod",
    InvolvedObjectName: "my-pod",
    Source: "kubelet",
    Count: 1,
    Age: "1m",
    LastSeen: "1m ago",
    CreatedAt: 1000,
    Name: "event-abc",
    Reason: "Started",
    FirstSeen: "2m ago",
    FirstSeenAt: 0,
    LastSeenAt: 0,
    InvolvedObjectFieldPath: "",
    InvolvedObjectNamespace: "default",
    ManagedFields: [],
    ...overrides,
  };
}

function renderView() {
  return render(<EventsView />, {
    wrapper: makeWrapper(),
  });
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useGetEventsMock.mockReturnValue({ data: [] });
  vi.mocked(useMainLayoutContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onTogglePodDetail: onTogglePodDetailMock,
    onToggleDeploymentDetail: onToggleDeploymentDetailMock,
    onToggleReplicaSetDetail: onToggleReplicaSetDetailMock,
    onToggleEventDetail: onToggleEventDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onTogglePodDetail: onTogglePodDetailMock,
    onToggleDeploymentDetail: onToggleDeploymentDetailMock,
    onToggleReplicaSetDetail: onToggleReplicaSetDetailMock,
    onToggleEventDetail: onToggleEventDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
});

afterEach(() => {
  cleanup();
});

// ─── edge-case and boundary tests ─────────────────────────────────────────────

describe("EventsView — edge cases and boundary conditions", () => {
  // 1. data: undefined from hook → no crash, shows "0 items"
  it("data undefined from hook → renders without crash and shows '0 items'", () => {
    useGetEventsMock.mockReturnValue({ data: undefined });
    expect(() => renderView()).not.toThrow();
    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getByText("No Events")).toBeInTheDocument();
  });

  // 2. 50+ events filtered to 0 by non-matching search → "No Events" + "0 items"
  it("50+ events filtered to 0 by search → 'No Events' and '0 items'", () => {
    const large = Array.from({ length: 55 }, (_, i) =>
      makeEvent({ Name: `event-${i}`, Message: `msg-${i}`, InvolvedObjectName: `pod-${i}` })
    );
    useGetEventsMock.mockReturnValue({ data: large });
    renderView();

    const input = screen.getByPlaceholderText("Search Events...");
    fireEvent.change(input, { target: { value: "zzz-no-match-ever" } });

    expect(screen.getByText("No Events")).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  // 3. Search clear after filtering → items reappear
  it("Search clears → items reappear after clearing input", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({
          Name: "event-alpha",
          Message: "alpha started",
          InvolvedObjectName: "pod-alpha",
        }),
        makeEvent({ Name: "event-beta", Message: "beta started", InvolvedObjectName: "pod-beta" }),
      ],
    });
    renderView();

    const input = screen.getByPlaceholderText("Search Events...");
    fireEvent.change(input, { target: { value: "alpha" } });
    expect(screen.queryByText("pod-beta")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText("pod-alpha")).toBeInTheDocument();
    expect(screen.getByText("pod-beta")).toBeInTheDocument();
  });

  // 4. Rapid successive search input changes → final state matches last typed value
  it("Rapid search input changes → final state matches last typed value", () => {
    const items = [
      makeEvent({ Name: "event-alpha", Message: "alpha event", InvolvedObjectName: "alpha-pod" }),
      makeEvent({ Name: "event-beta", Message: "beta event", InvolvedObjectName: "beta-pod" }),
      makeEvent({ Name: "event-gamma", Message: "gamma event", InvolvedObjectName: "gamma-pod" }),
    ];
    useGetEventsMock.mockReturnValue({ data: items });
    renderView();

    const input = screen.getByPlaceholderText("Search Events...");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "al" } });
    fireEvent.change(input, { target: { value: "alp" } });
    fireEvent.change(input, { target: { value: "alpha" } });

    expect(screen.getByText("alpha-pod")).toBeInTheDocument();
    expect(screen.queryByText("beta-pod")).not.toBeInTheDocument();
    expect(screen.queryByText("gamma-pod")).not.toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  // 5. Events sorted by CreatedAt descending — newer event appears first
  it("Events sorted by CreatedAt desc → newer event row appears before older event row", () => {
    const older = makeEvent({ Name: "old-event", InvolvedObjectName: "old-pod", CreatedAt: 1000 });
    const newer = makeEvent({ Name: "new-event", InvolvedObjectName: "new-pod", CreatedAt: 9000 });
    // Provide older before newer to verify sort overrides input order
    useGetEventsMock.mockReturnValue({ data: [older, newer] });
    renderView();

    const rows = screen.getAllByRole("row").slice(1); // exclude header
    const firstRowText = within(rows[0])
      .getAllByRole("cell")
      .map((c) => c.textContent)
      .join(" ");
    const secondRowText = within(rows[1])
      .getAllByRole("cell")
      .map((c) => c.textContent)
      .join(" ");
    expect(firstRowText).toContain("new-pod");
    expect(secondRowText).toContain("old-pod");
  });

  // 6. Row click on an event calls onToggleEventDetail(namespaces: [], name) exactly once
  it("Row click → calls onToggleEventDetail(namespaces: [], name) exactly once", () => {
    useGetEventsMock.mockReturnValue({
      data: [makeEvent({ Namespace: "kube-system", Name: "click-event" })],
    });
    renderView();

    const rows = screen.getAllByRole("row").slice(1);
    fireEvent.click(rows[0]);

    expect(onToggleEventDetailMock).toHaveBeenCalledTimes(1);
    expect(onToggleEventDetailMock).toHaveBeenCalledWith("kube-system", "click-event");
  });

  // 7. Clicking namespace ResourceLink calls onToggleNamespaceDetail and NOT onToggleEventDetail
  it("Namespace ResourceLink click → calls onToggleNamespaceDetail, NOT onToggleEventDetail", () => {
    useGetEventsMock.mockReturnValue({
      data: [makeEvent({ Namespace: "prod-ns", Name: "ns-link-event" })],
    });
    renderView();

    fireEvent.click(screen.getByText("prod-ns"));

    expect(onToggleNamespaceDetailMock).toHaveBeenCalledTimes(1);
    expect(onToggleNamespaceDetailMock).toHaveBeenCalledWith("prod-ns");
    expect(onToggleEventDetailMock).not.toHaveBeenCalled();
  });

  // 8. Clicking a Pod ResourceLink calls onTogglePodDetail and NOT onToggleEventDetail
  it("Pod ResourceLink click → calls onTogglePodDetail(namespaces: [], involvedObjectName), NOT onToggleEventDetail", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({
          Namespace: "default",
          Name: "pod-link-event",
          InvolvedObjectKind: "Pod",
          InvolvedObjectName: "target-pod",
        }),
      ],
    });
    renderView();

    fireEvent.click(screen.getByText("target-pod"));

    expect(onTogglePodDetailMock).toHaveBeenCalledTimes(1);
    expect(onTogglePodDetailMock).toHaveBeenCalledWith("default", "target-pod");
    expect(onToggleEventDetailMock).not.toHaveBeenCalled();
  });

  // 9. InvolvedObjectKind "ConfigMap" (not in RESOURCE_LINKS) → plain text, no ResourceLink
  it("InvolvedObjectKind 'ConfigMap' → InvolvedObjectName rendered as plain text, not a ResourceLink button", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({
          InvolvedObjectKind: "ConfigMap",
          InvolvedObjectName: "my-configmap",
        }),
      ],
    });
    renderView();

    const nameEl = screen.getByText("my-configmap");
    // Plain text: not wrapped in a button
    expect(nameEl.closest("button")).toBeNull();
  });

  // 10. Multiple events with same Namespace → all namespace ResourceLinks present
  it("Multiple events sharing same Namespace → each row has its own namespace ResourceLink", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({ Name: "ev-1", InvolvedObjectName: "pod-1", Namespace: "shared-ns" }),
        makeEvent({ Name: "ev-2", InvolvedObjectName: "pod-2", Namespace: "shared-ns" }),
        makeEvent({ Name: "ev-3", InvolvedObjectName: "pod-3", Namespace: "shared-ns" }),
      ],
    });
    renderView();

    const nsLinks = screen.getAllByText("shared-ns");
    expect(nsLinks).toHaveLength(3);
  });

  // 11. Event with empty Message → row renders without crash
  it("Event with empty Message → row renders without crash", () => {
    useGetEventsMock.mockReturnValue({
      data: [makeEvent({ Message: "", Name: "empty-msg-event", InvolvedObjectName: "some-pod" })],
    });
    expect(() => renderView()).not.toThrow();
    expect(screen.getByText("some-pod")).toBeInTheDocument();
  });

  // 12. InvolvedObjectKind uppercase ("POD") still resolves RESOURCE_LINKS via toLowerCase()
  it("InvolvedObjectKind 'POD' (uppercase) → InvolvedObjectName rendered as a ResourceLink button", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({
          InvolvedObjectKind: "POD",
          InvolvedObjectName: "uppercase-pod",
        }),
      ],
    });
    renderView();

    const nameEl = screen.getByText("uppercase-pod");
    expect(nameEl.closest("button")).not.toBeNull();
  });
});

/* COVERAGE GAP ANALYSIS

  Covered by this file:
  - Hook default fallback (undefined data → [])
  - Large dataset (55 events) filtered to empty by non-matching search
  - Search clear/reset behavior restoring all items
  - Rapid successive search input changes (final state correctness)
  - Sort by CreatedAt descending: newer event row precedes older in DOM order
  - Row click dispatches onToggleEventDetail(namespaces: [], name) exactly once
  - Namespace ResourceLink click: onToggleNamespaceDetail called, onToggleEventDetail not called (stopPropagation verified)
  - Pod ResourceLink click: onTogglePodDetail called, onToggleEventDetail not called (stopPropagation verified)
  - InvolvedObjectKind not in RESOURCE_LINKS ("ConfigMap") → InvolvedObjectName as plain text (no button)
  - Multiple events sharing same Namespace → each row renders its own namespace ResourceLink (count assertion)
  - Event with empty Message field → no crash, other cells still render
  - Singular vs. plural count label boundary ("1 item" vs. "0 items" vs. N items)
  - InvolvedObjectKind uppercase ("POD") resolves RESOURCE_LINKS via toLowerCase() → rendered as ResourceLink

  Gaps not covered here (out of scope for edge-case unit tests or require deeper
  infrastructure):

  1. Deployment and ReplicaSet RESOURCE_LINKS dispatch — onToggleDeploymentDetail and
     onToggleReplicaSetDetail are mounted in context but stopPropagation behavior is
     only tested for Pod. The pattern is identical, but dedicated assertions for each
     kind would increase coverage confidence.

  2. useGetEvents real query lifecycle (loading / error states) — the hook is fully
     mocked; testing network states belongs in hook-level tests with MSW or a Wails
     backend stub.

  3. Wails EventsOn real-time streaming — the live update path (EventsOn →
     setQueryData) is exercised by the hook's useEffect, not invoked here because the
     hook is mocked. A separate integration test that can stub the Wails runtime event
     bus is required.

  4. ResourceLink internal routing/href behavior — ResourceLink renders real, but its
     internal anchor/router behavior is not asserted. Navigation correctness belongs in
     E2E or integration tests.

  5. EventTypeBadge rendering — "Normal" / "Warning" / unknown type badge class logic
     is not asserted in these tests. A dedicated EventTypeBadge unit test is warranted.

  6. EventDetailDrawer open/close interaction — onToggleEventDetail is asserted called,
     but the drawer opening and rendering EventDetailDrawer content is outside the scope
     of this view-level test.

  7. context and namespace prop passthrough to the hook — props are forwarded to the
     mocked hook; correctness of forwarding is not independently verified. A hook-level
     test with the real hook covers this.

  8. context="" disabled-query guard — useGetEvents has enabled: !!context; when
     context is empty string the query is disabled. This is a hook-level behavior not
     observable through the mocked hook in this file.

  9. Accessibility (ARIA roles, keyboard navigation, focus management) — no axe scans
     or keyboard-focus assertions are included. A dedicated a11y test suite (e.g.
     jest-axe / @axe-core/react) is recommended.
*/
