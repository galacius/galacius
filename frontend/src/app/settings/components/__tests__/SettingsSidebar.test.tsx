import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { SettingsSidebar } from "../SettingsSidebar";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useIsPrivateRepoAccessMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useIsPrivateRepoAccess", () => ({
  useIsPrivateRepoAccess: useIsPrivateRepoAccessMock,
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

// ─── setup ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  // Default to true (feature visible) to match backend default
  useIsPrivateRepoAccessMock.mockReturnValue({ data: true });
});

describe("SettingsSidebar", () => {
  it("renders all top-level nav items", () => {
    render(<SettingsSidebar section="welcome" onSelect={() => {}} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("App")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("Sandbox (beta)")).toBeInTheDocument();
  });

  it("highlights the active section button", () => {
    render(<SettingsSidebar section="app" onSelect={() => {}} />, {
      wrapper: makeWrapper(),
    });
    const appBtn = screen.getByText("App").closest("button");
    expect(appBtn?.className).toContain("bg-secondary");
  });

  it("does not highlight inactive section buttons", () => {
    render(<SettingsSidebar section="app" onSelect={() => {}} />, {
      wrapper: makeWrapper(),
    });
    const welcomeBtn = screen.getByText("Welcome").closest("button");
    expect(welcomeBtn?.className).not.toContain("bg-secondary");
  });

  it("calls onSelect with correct section on nav button click", () => {
    const onSelect = vi.fn();
    render(<SettingsSidebar section="welcome" onSelect={onSelect} />, {
      wrapper: makeWrapper(),
    });
    fireEvent.click(screen.getByText("App"));
    expect(onSelect).toHaveBeenCalledWith("app");
    fireEvent.click(screen.getByText("Kubernetes"));
    expect(onSelect).toHaveBeenCalledWith("kubernetes");
    fireEvent.click(screen.getByText("Welcome"));
    expect(onSelect).toHaveBeenCalledWith("welcome");
  });

  it("selects sandbox section on nav button click", () => {
    const onSelect = vi.fn();
    render(<SettingsSidebar section="welcome" onSelect={onSelect} />, {
      wrapper: makeWrapper(),
    });
    fireEvent.click(screen.getByText("Sandbox (beta)"));
    expect(onSelect).toHaveBeenCalledWith("sandbox");
  });

  it("highlights kubernetes section when active", () => {
    render(<SettingsSidebar section="kubernetes" onSelect={() => {}} />, {
      wrapper: makeWrapper(),
    });
    const k8sBtn = screen.getByText("Kubernetes").closest("button");
    expect(k8sBtn?.className).toContain("bg-secondary");
  });
});
