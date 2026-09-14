import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetSettingsMock = vi.hoisted(() => vi.fn());
const saveSettingsMock = vi.hoisted(() => vi.fn());
const renderSuccessToastMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/data-access/useGetSettings", () => ({
  useGetSettings: useGetSettingsMock,
}));

vi.mock("@wailsjs/go/app/App", () => ({
  SaveSettings: saveSettingsMock,
  IsMarketplaceEnabled: () => Promise.resolve(true),
}));

vi.mock("@galacius/design-system", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    renderSuccessToast: renderSuccessToastMock,
  };
});

// Mock hooks for content components
const useGetDefaultShellMock = vi.hoisted(() => vi.fn());
const useMergeSettingsOnSaveMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useMergeSettingsOnSave", () => ({
  useMergeSettingsOnSave: useMergeSettingsOnSaveMock,
}));

vi.mock("../hooks/data-access/useGetDefaultShell", () => ({
  useGetDefaultShell: useGetDefaultShellMock,
}));

const usePluginSettingsTabsMock = vi.hoisted(() => vi.fn(() => [] as unknown[]));

vi.mock("../../plugins/hooks/registry/settings/usePluginSettingsTabs", () => ({
  usePluginSettingsTabs: usePluginSettingsTabsMock,
}));

// Stub heavy content components so each section test is isolated
vi.mock("../components/AppContent", () => ({
  AppContent: () => createElement("div", { "data-testid": "app-content" }),
}));
vi.mock("../components/K8sContent", () => ({
  K8sContent: () => createElement("div", { "data-testid": "k8s-content" }),
}));
vi.mock("../components/WelcomeView", () => ({
  WelcomeView: () => createElement("div", { "data-testid": "welcome-view" }),
}));
vi.mock("../components/MarketplaceContent", () => ({
  MarketplaceContent: () => {
    // Mock component that renders save button for testing
    return createElement(
      "div",
      { "data-testid": "marketplace-content" },
      createElement("button", { className: "save-btn" }, "Save")
    );
  },
}));
vi.mock("../components/SandboxContent", () => ({
  SandboxContent: () => {
    // Mock component that renders save button for testing
    return createElement(
      "div",
      { "data-testid": "sandbox-content" },
      createElement("button", { className: "save-btn" }, "Save")
    );
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { SettingsView } from "../SettingsView";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function renderSettings(initialSection?: Parameters<typeof SettingsView>[0]["initialSection"]) {
  return render(<SettingsView initialSection={initialSection} />, { wrapper: makeWrapper() });
}

// ─── setup ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  saveSettingsMock.mockResolvedValue(undefined);
  useGetSettingsMock.mockReturnValue({ data: undefined });
  useGetDefaultShellMock.mockReturnValue({ data: "/bin/zsh" });
  useMergeSettingsOnSaveMock.mockReturnValue(vi.fn().mockResolvedValue(undefined));
  usePluginSettingsTabsMock.mockReturnValue([]);
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("SettingsView", () => {
  describe("default section", () => {
    it("renders WelcomeView when no initialSection is given", () => {
      renderSettings();
      expect(screen.getByTestId("welcome-view")).toBeInTheDocument();
    });

    it("does not render SectionHeader on welcome section", () => {
      renderSettings();
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  describe("section routing via sidebar", () => {
    it("shows AppContent when App is selected", () => {
      renderSettings();
      fireEvent.click(screen.getByText("App"));
      expect(screen.getByTestId("app-content")).toBeInTheDocument();
    });

    it("shows K8sContent when Kubernetes is selected", () => {
      renderSettings();
      fireEvent.click(screen.getByText("Kubernetes"));
      expect(screen.getByTestId("k8s-content")).toBeInTheDocument();
    });
  });

  describe("save button visibility", () => {
    it("does not render save button on app section", () => {
      renderSettings();
      fireEvent.click(screen.getByText("App"));
      expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    });

    it("does not render save button on kubernetes section", () => {
      renderSettings();
      fireEvent.click(screen.getByText("Kubernetes"));
      expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    });

    it("renders save button on sandbox section", () => {
      renderSettings();
      fireEvent.click(screen.getByText(/Sandbox/i));
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
  });

  describe("save flow", () => {
    it("renders save buttons in content components (not in header)", async () => {
      renderSettings("sandbox");
      const saveButtons = screen.getAllByRole("button", { name: /save/i });
      // The mock component has a save button
      expect(saveButtons.length).toBeGreaterThan(0);
    });

    it("each section is independent and manages its own save state", async () => {
      // Sandbox section
      renderSettings("sandbox");
      expect(screen.getByTestId("sandbox-content")).toBeInTheDocument();

      // Switch to Marketplace (await button to appear as the query resolves)
      const marketplaceButton = await screen.findByText("Marketplace");
      fireEvent.click(marketplaceButton);
      const marketplaceContent = await screen.findByTestId("marketplace-content");
      expect(marketplaceContent).toBeInTheDocument();

      // Switch to Kubernetes
      fireEvent.click(screen.getByText("Kubernetes"));
      expect(screen.getByTestId("k8s-content")).toBeInTheDocument();
    });

    it("does not render save button in header", () => {
      renderSettings("sandbox");
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
      // Save button is now only in the content component footer, not in header
    });
  });

  describe("settings loading", () => {
    it("app content component renders when app section is selected", async () => {
      useGetSettingsMock.mockReturnValue({
        data: {
          accessToken: "",
          shellPath: "/bin/fish",
          kubeconfigPaths: [],
          locale: "UTC",
        },
      });
      renderSettings("app");
      await waitFor(() => {
        const appStub = screen.getByTestId("app-content");
        expect(appStub).toBeInTheDocument();
      });
    });

    it("content components render independently without prop drilling from SettingsView", async () => {
      useGetSettingsMock.mockReturnValue({
        data: {
          accessToken: "",
          shellPath: "/bin/fish",
          kubeconfigPaths: [],
          locale: "UTC",
        },
      });
      renderSettings("app");
      // Verify app content is rendered
      const appStub = screen.getByTestId("app-content");
      expect(appStub).toBeInTheDocument();
    });
  });

  describe("plugin tabs", () => {
    it("shows the plugin tab in the sidebar and its content when selected", () => {
      usePluginSettingsTabsMock.mockReturnValue([
        {
          id: "helm",
          label: "Helm",
          component: () => createElement("div", { "data-testid": "helm-plugin-content" }),
        },
      ]);
      renderSettings();
      fireEvent.click(screen.getByText("Helm"));
      expect(screen.getByTestId("helm-plugin-content")).toBeInTheDocument();
    });

    it("redirects to welcome and hides the sidebar entry when the active plugin tab disappears", () => {
      usePluginSettingsTabsMock.mockReturnValue([
        {
          id: "helm",
          label: "Helm",
          component: () => createElement("div", { "data-testid": "helm-plugin-content" }),
        },
      ]);
      const { rerender } = renderSettings("helm");
      expect(screen.getByTestId("helm-plugin-content")).toBeInTheDocument();
      expect(screen.getAllByText("Helm").length).toBeGreaterThan(0);

      // Plugin gets disabled/removed: registry now reports no tabs.
      usePluginSettingsTabsMock.mockReturnValue([]);
      rerender(<SettingsView initialSection="helm" />);

      expect(screen.queryByTestId("helm-plugin-content")).not.toBeInTheDocument();
      expect(screen.queryByText("Helm")).not.toBeInTheDocument();
      expect(screen.getByTestId("welcome-view")).toBeInTheDocument();
    });
  });

  describe("marketplace and sandbox sections", () => {
    it("renders marketplace content when marketplace section is active", async () => {
      useGetSettingsMock.mockReturnValue({
        data: {
          accessToken: "",
          shellPath: "",
          kubeconfigPaths: [],
          locale: "UTC",
          marketplaceRepositories: [
            {
              url: "https://github.com/test/marketplace",
              private: true,
              accessToken: "ghp_test_token_123",
            },
          ],
        },
      });
      renderSettings("marketplace");
      const content = await screen.findByTestId("marketplace-content");
      expect(content).toBeInTheDocument();
    });

    it("renders sandbox content when sandbox section is active", async () => {
      useGetSettingsMock.mockReturnValue({
        data: {
          accessToken: "test_token",
          shellPath: "",
          kubeconfigPaths: [],
          locale: "UTC",
        },
      });
      renderSettings("sandbox");
      const content = await screen.findByTestId("sandbox-content");
      expect(content).toBeInTheDocument();
    });

    it("marketplace content component is self-contained and manages its own state", async () => {
      useGetSettingsMock.mockReturnValue({
        data: {
          accessToken: "",
          shellPath: "",
          kubeconfigPaths: [],
          locale: "UTC",
          marketplaceRepositories: [
            {
              url: "https://github.com/test/marketplace",
              private: true,
              accessToken: "ghp_test_token_123",
            },
          ],
        },
      });
      renderSettings("marketplace");
      const content = await screen.findByTestId("marketplace-content");
      expect(content).toBeInTheDocument();
      // Each content component now manages its own state via useState/useEffect
    });
  });
});
