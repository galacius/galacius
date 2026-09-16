import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const LogsPanelMock = vi.hoisted(() => vi.fn());
const ExecPanelMock = vi.hoisted(() => vi.fn());

vi.mock("../LogsPanel", () => ({
  LogsPanel: (props: Record<string, unknown>) => {
    LogsPanelMock(props);
    return createElement("div", { "data-testid": "logs-panel" });
  },
}));

vi.mock("../ExecPanel", () => ({
  ExecPanel: (props: Record<string, unknown>) => {
    ExecPanelMock(props);
    return createElement("div", { "data-testid": "exec-panel" });
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { PodLogTrayContent } from "../PodLogTrayContent";
import { PodExecTrayContent } from "../PodExecTrayContent";
import type { TrayTab } from "../PodTray";
import type { PodContainerDetail } from "../../api/resources";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeContainers(count = 1): PodContainerDetail[] {
  return Array.from({ length: count }, (_, i) => ({
    Name: `container-${i}`,
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
    ContainerID: `docker://container-${i}`,
    Reason: "",
    StartedAt: "2026-07-12T10:00:00Z",
    FinishedAt: "",
  }));
}

function makeTab(overrides: Partial<TrayTab> = {}): TrayTab {
  return {
    id: "tab-1",
    contextName: "test-ctx",
    ns: "default",
    pod: "my-pod",
    containers: makeContainers(),
    mode: "logs",
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client }, ui));
}

// ─── setup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("PodTray — content panels", () => {
  it("renders LogsPanel for a logs tab", async () => {
    renderWithClient(<PodLogTrayContent tab={makeTab({ mode: "logs" })} collapsed={false} />);
    await waitFor(() => {
      expect(screen.getByTestId("logs-panel")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("exec-panel")).toBeNull();
  });

  it("renders ExecPanel for an exec tab", async () => {
    render(<PodExecTrayContent tab={makeTab({ mode: "exec" })} collapsed={false} />);
    await waitFor(() => {
      expect(screen.getByTestId("exec-panel")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("logs-panel")).toBeNull();
  });

  it("forwards correct props to LogsPanel", async () => {
    const containers = makeContainers(2);
    renderWithClient(
      <PodLogTrayContent
        tab={makeTab({ contextName: "ctx", ns: "ns1", pod: "pod1", containers, mode: "logs" })}
        collapsed={false}
      />
    );
    await waitFor(() => {
      expect(LogsPanelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          containerRef: expect.any(Function),
          status: expect.any(String),
          error: null,
        })
      );
    });
  });

  it("forwards correct props to ExecPanel", async () => {
    const containers = makeContainers(2);
    render(
      <PodExecTrayContent
        tab={makeTab({ contextName: "ctx", ns: "ns1", pod: "pod1", containers, mode: "exec" })}
        collapsed={false}
      />
    );
    await waitFor(() => {
      expect(ExecPanelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          containerRef: expect.any(Function),
          status: expect.any(String),
          error: null,
          reconnect: expect.any(Function),
        })
      );
    });
  });

  it("hides content area when collapsed", async () => {
    renderWithClient(<PodLogTrayContent tab={makeTab({ mode: "logs" })} collapsed={true} />);
    const panel = await waitFor(() => screen.getByTestId("logs-panel"));
    expect(panel.parentElement).toHaveClass("hidden");
  });
});

describe("PodTray — bottom bar (logs mode)", () => {
  it("renders bottom bar for logs tab", () => {
    renderWithClient(<PodLogTrayContent tab={makeTab({ mode: "logs" })} collapsed={false} />);
    expect(screen.getByText("Word wrap")).toBeInTheDocument();
    expect(screen.getByText("Show timestamps")).toBeInTheDocument();
    expect(screen.getByText("Show prev. terminated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
  });

  it("toggles word wrap checkbox", () => {
    renderWithClient(<PodLogTrayContent tab={makeTab({ mode: "logs" })} collapsed={false} />);
    const wordWrapCheckbox = screen.getByRole("checkbox", { name: /word wrap/i });
    expect(wordWrapCheckbox).not.toBeChecked();
    fireEvent.click(wordWrapCheckbox);
    expect(wordWrapCheckbox).toBeChecked();
  });

  it("forwards wrap state to LogsPanel, toggled by the checkbox", async () => {
    renderWithClient(<PodLogTrayContent tab={makeTab({ mode: "logs" })} collapsed={false} />);

    await waitFor(() => expect(screen.getByTestId("logs-panel")).toBeInTheDocument());

    expect(LogsPanelMock).toHaveBeenLastCalledWith(expect.objectContaining({ wrap: false }));

    const wordWrapCheckbox = screen.getByRole("checkbox", { name: /word wrap/i });
    fireEvent.click(wordWrapCheckbox);
    expect(wordWrapCheckbox).toBeChecked();

    await waitFor(() => {
      expect(LogsPanelMock).toHaveBeenLastCalledWith(expect.objectContaining({ wrap: true }));
    });
  });
});
