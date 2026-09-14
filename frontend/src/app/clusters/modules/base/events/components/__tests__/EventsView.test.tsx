import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { Event } from "../../api/resources";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetEventsMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const onToggleEventDetailMock = vi.hoisted(() => vi.fn());
const onTogglePodDetailMock = vi.hoisted(() => vi.fn());
const onToggleDeploymentDetailMock = vi.hoisted(() => vi.fn());
const onToggleReplicaSetDetailMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetEvents", () => ({
  useGetEvents: useGetEventsMock,
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
import { EventsView } from "../../EventsView";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    Name: "test-event",
    Namespace: "default",
    Type: "Normal",
    Message: "test message",
    InvolvedObjectKind: "Pod",
    InvolvedObjectName: "test-pod",
    InvolvedObjectFieldPath: "",
    InvolvedObjectNamespace: "default",
    Source: "kubelet",
    Count: 1,
    Age: "1d",
    LastSeen: "1m",
    CreatedAt: 1000,
    Reason: "Started",
    FirstSeen: "2d",
    FirstSeenAt: 900,
    LastSeenAt: 1100,
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
    onToggleEventDetail: onToggleEventDetailMock,
    onTogglePodDetail: onTogglePodDetailMock,
    onToggleDeploymentDetail: onToggleDeploymentDetailMock,
    onToggleReplicaSetDetail: onToggleReplicaSetDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "test-ctx",
    namespaces: [],
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleEventDetail: onToggleEventDetailMock,
    onTogglePodDetail: onTogglePodDetailMock,
    onToggleDeploymentDetail: onToggleDeploymentDetailMock,
    onToggleReplicaSetDetail: onToggleReplicaSetDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
});

afterEach(() => {
  cleanup();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("EventsView", () => {
  it('renders "Events" heading and "0 items" count when data is empty', () => {
    renderView();

    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it('renders "No Events" empty state when no items', () => {
    renderView();

    expect(screen.getByText("No Events")).toBeInTheDocument();
  });

  it("renders a single event with all visible columns", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({
          Name: "my-event",
          Namespace: "production",
          Type: "Normal",
          Message: "Container started",
          InvolvedObjectKind: "ReplicaSet",
          InvolvedObjectName: "my-rs",
          Source: "replicaset-controller",
          Count: 3,
          Age: "5d",
          LastSeen: "2m",
        }),
      ],
    });

    renderView();

    expect(screen.getByText("Container started")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("ReplicaSet")).toBeInTheDocument();
    expect(screen.getByText("my-rs")).toBeInTheDocument();
    expect(screen.getByText("replicaset-controller")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5d")).toBeInTheDocument();
    expect(screen.getByText("2m")).toBeInTheDocument();
  });

  it("renders all rows when multiple events are provided", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({ Name: "event-alpha", Message: "alpha happened" }),
        makeEvent({ Name: "event-beta", Message: "beta happened" }),
        makeEvent({ Name: "event-gamma", Message: "gamma happened" }),
      ],
    });

    renderView();

    expect(screen.getByText("alpha happened")).toBeInTheDocument();
    expect(screen.getByText("beta happened")).toBeInTheDocument();
    expect(screen.getByText("gamma happened")).toBeInTheDocument();
  });

  it('shows "1 item" (singular) when exactly one event is present', () => {
    useGetEventsMock.mockReturnValue({
      data: [makeEvent({ Name: "only-event" })],
    });

    renderView();

    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it('shows "N items" (plural) when multiple events are present', () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({ Name: "event-one" }),
        makeEvent({ Name: "event-two" }),
        makeEvent({ Name: "event-three" }),
      ],
    });

    renderView();

    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("filters by Message substring (case-insensitive)", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({ Name: "e1", Message: "Container pulled successfully" }),
        makeEvent({ Name: "e2", Message: "Back-off restarting failed container" }),
      ],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Events...");
    fireEvent.change(input, { target: { value: "PULLED" } });

    expect(screen.getByText("Container pulled successfully")).toBeInTheDocument();
    expect(screen.queryByText("Back-off restarting failed container")).not.toBeInTheDocument();
  });

  it("filters by InvolvedObjectKind substring (case-insensitive)", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({ Name: "e1", InvolvedObjectKind: "Pod", Message: "pod message" }),
        makeEvent({ Name: "e2", InvolvedObjectKind: "Deployment", Message: "deployment message" }),
      ],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Events...");
    fireEvent.change(input, { target: { value: "DEPLOY" } });

    expect(screen.getByText("deployment message")).toBeInTheDocument();
    expect(screen.queryByText("pod message")).not.toBeInTheDocument();
  });

  it("filters by InvolvedObjectName substring (case-insensitive)", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({ Name: "e1", InvolvedObjectName: "frontend-pod", Message: "frontend event" }),
        makeEvent({ Name: "e2", InvolvedObjectName: "backend-pod", Message: "backend event" }),
      ],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Events...");
    fireEvent.change(input, { target: { value: "FRONTEND" } });

    expect(screen.getByText("frontend event")).toBeInTheDocument();
    expect(screen.queryByText("backend event")).not.toBeInTheDocument();
  });

  it("filters by Namespace substring (case-insensitive)", () => {
    useGetEventsMock.mockReturnValue({
      data: [
        makeEvent({ Name: "e1", Namespace: "production", Message: "prod event" }),
        makeEvent({ Name: "e2", Namespace: "staging", Message: "staging event" }),
      ],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Events...");
    fireEvent.change(input, { target: { value: "PROD" } });

    expect(screen.getByText("prod event")).toBeInTheDocument();
    expect(screen.queryByText("staging event")).not.toBeInTheDocument();
  });

  it('shows "0 items" and empty state when search matches nothing', () => {
    useGetEventsMock.mockReturnValue({
      data: [makeEvent({ Name: "e1", Message: "something happened" })],
    });

    renderView();

    const input = screen.getByPlaceholderText("Search Events...");
    fireEvent.change(input, { target: { value: "nonexistent-xyz" } });

    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getByText("No Events")).toBeInTheDocument();
  });
});
