import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { Pod } from "../../api/resources";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetPodDetailMock = vi.hoisted(() => vi.fn());
const useGetEventsMock = vi.hoisted(() => vi.fn());
const useGetPortForwardsMock = vi.hoisted(() => vi.fn());
const useCatchForbiddenResourceMock = vi.hoisted(() => vi.fn());
const onToggleNamespaceDetailMock = vi.hoisted(() => vi.fn());
const onToggleNodeDetailMock = vi.hoisted(() => vi.fn());
const useUnifiedTrayMock = vi.hoisted(() => vi.fn());
const openTabMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetPodDetail", () => ({
  useGetPodDetail: useGetPodDetailMock,
}));

vi.mock("../../../../base/events/hooks/data-access/useGetEvents", () => ({
  useGetEvents: useGetEventsMock,
}));

vi.mock("../../../../networks/portforwarding/hooks/data-access/useGetPortForwards", () => ({
  useGetPortForwards: useGetPortForwardsMock,
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

vi.mock("../../../../../shared/components/trays/unified/UnifiedTrayContext", () => ({
  useUnifiedTray: useUnifiedTrayMock,
}));

vi.mock("../../../../events/EventsTable", () => ({
  EventsTable: () => createElement("div", { "data-testid": "events-table" }),
}));

vi.mock("../../../../portforwarding/PortForwardCtaButton", () => ({
  PortForwardCtaButton: () => null,
}));

vi.mock("../../../../portforwarding/PortForwardOperationDialog", () => ({
  PortForwardOperationDialog: () => null,
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { useMainLayoutContext } from "../../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../../shared/components/details/DetailDrawerContext";
import { PodDetailDrawer } from "../PodDetailDrawer";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function makePod(overrides: Partial<Pod> = {}): Pod {
  return {
    Name: "my-pod",
    Namespace: "default",
    Status: "Running",
    Ready: "1/1",
    Containers: 1,
    Restarts: 0,
    ControlledBy: "",
    ControlledByName: "",
    NodeName: "node-1",
    QoS: "BestEffort",
    Age: "1d",
    CPU: "100m",
    Memory: "128Mi",
    Disk: "",
    CPUPercent: 10,
    MemPercent: 20,
    DiskPercent: 0,
    CreatedAt: "2026-01-01T00:00:00Z",
    ServiceAccount: "",
    PriorityClass: "",
    TerminationGracePeriod: "30s",
    HostIPs: [],
    PodIPs: [],
    Tolerations: 0,
    TolerationDetails: [],
    AffinityCount: 0,
    Affinities: "",
    Labels: {},
    Annotations: {},
    ManagedFields: [],
    Conditions: [],
    ContainerDetails: [
      {
        Name: "app",
        Image: "nginx:latest",
        Ready: true,
        Status: "Running",
        Ports: [],
        EnvVars: [],
        Mounts: [],
        LastStatus: null,
        Liveness: "",
        Readiness: "",
        Startup: "",
        Command: [],
        Args: [],
        StatusMessage: "running, ready",
        CPURequest: "",
        MemRequest: "",
        DiskRequest: "",
        CPULimit: "",
        MemLimit: "",
        DiskLimit: "",
        RestartCount: 0,
        ContainerID: "docker://abc123",
        Reason: "",
        StartedAt: "2026-07-12T10:00:00Z",
        FinishedAt: "",
      },
    ],
    InitContainerDetails: [],
    Volumes: [],
    ...overrides,
  };
}

function renderDrawer(open = true) {
  return render(
    <PodDetailDrawer
      podName="my-pod"
      podNamespace="default"
      open={open}
      onClose={vi.fn()}
      onNavigateToPortForwarding={vi.fn()}
    />,
    { wrapper: makeWrapper() }
  );
}

function getLogsBtn(): HTMLElement {
  return screen.getByRole("button", { name: "Open Pod Logs" });
}
function getShellBtn(): HTMLElement {
  return screen.getByRole("button", { name: "Open Pod Shell" });
}
function getToolbarButtons(): HTMLElement[] {
  return [getLogsBtn(), getShellBtn()];
}

type UnifiedTab = { origin: "core"; family: "pod"; pod: string; ns: string; mode: "logs" | "exec" };

// ─── setup ────────────────────────────────────────────────────────────────────

let openTabs: UnifiedTab[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  openTabs = [];
  useGetPodDetailMock.mockReturnValue({ data: makePod() });
  useGetEventsMock.mockReturnValue({ data: [] });
  useGetPortForwardsMock.mockReturnValue({ data: [] });
  useCatchForbiddenResourceMock.mockReturnValue(undefined);
  vi.mocked(useMainLayoutContext).mockReturnValue({
    activeContext: "test-ctx",
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleNodeDetail: onToggleNodeDetailMock,
  } as unknown as ReturnType<typeof useMainLayoutContext>);
  vi.mocked(useDetailDrawerContext).mockReturnValue({
    activeContext: "test-ctx",
    onToggleNamespaceDetail: onToggleNamespaceDetailMock,
    onToggleNodeDetail: onToggleNodeDetailMock,
  } as unknown as ReturnType<typeof useDetailDrawerContext>);
  useUnifiedTrayMock.mockImplementation(() => ({
    tabs: openTabs,
    openTab: openTabMock,
  }));
});

afterEach(() => {
  cleanup();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("PodDrawerBody — CTA buttons", () => {
  it("renders two CTA icon buttons in the header toolbar", () => {
    renderDrawer();
    expect(getToolbarButtons()).toHaveLength(2);
  });

  it("calls openTab('pod', {...mode: 'logs'}) when Logs button is clicked", () => {
    renderDrawer();
    fireEvent.click(getLogsBtn());
    expect(openTabMock).toHaveBeenCalledWith(
      "pod",
      expect.objectContaining({
        contextName: "test-ctx",
        ns: "default",
        pod: "my-pod",
        mode: "logs",
      })
    );
  });

  it("calls openTab('pod', {...mode: 'exec'}) when Shell button is clicked", () => {
    renderDrawer();
    fireEvent.click(getShellBtn());
    expect(openTabMock).toHaveBeenCalledWith(
      "pod",
      expect.objectContaining({
        contextName: "test-ctx",
        ns: "default",
        pod: "my-pod",
        mode: "exec",
      })
    );
  });

  it("passes containers as pod.ContainerDetails ?? [] when opening a tab", () => {
    useGetPodDetailMock.mockReturnValue({
      data: makePod({ ContainerDetails: [] }),
    });
    renderDrawer();
    fireEvent.click(getLogsBtn());
    expect(openTabMock).toHaveBeenCalledWith("pod", expect.objectContaining({ containers: [] }));
  });
});

describe("PodDrawerBody — CTA button active color", () => {
  it("neither CTA button has text-success when no matching tab is open", () => {
    renderDrawer();
    expect(getLogsBtn()).not.toHaveClass("text-success");
    expect(getShellBtn()).not.toHaveClass("text-success");
  });

  it("Logs button has text-success class when a logs tab for this pod is open", () => {
    openTabs = [{ origin: "core", family: "pod", pod: "my-pod", ns: "default", mode: "logs" }];
    renderDrawer();
    expect(getLogsBtn()).toHaveClass("text-success");
    expect(getShellBtn()).not.toHaveClass("text-success");
  });

  it("Shell button has text-success class when an exec tab for this pod is open", () => {
    openTabs = [{ origin: "core", family: "pod", pod: "my-pod", ns: "default", mode: "exec" }];
    renderDrawer();
    expect(getShellBtn()).toHaveClass("text-success");
    expect(getLogsBtn()).not.toHaveClass("text-success");
  });

  it("both CTA buttons have text-success when both tabs are open", () => {
    openTabs = [
      { origin: "core", family: "pod", pod: "my-pod", ns: "default", mode: "logs" },
      { origin: "core", family: "pod", pod: "my-pod", ns: "default", mode: "exec" },
    ];
    renderDrawer();
    expect(getLogsBtn()).toHaveClass("text-success");
    expect(getShellBtn()).toHaveClass("text-success");
  });

  it("does not highlight for a tab belonging to a different pod", () => {
    openTabs = [{ origin: "core", family: "pod", pod: "other-pod", ns: "default", mode: "logs" }];
    renderDrawer();
    expect(getLogsBtn()).not.toHaveClass("text-success");
  });
});
