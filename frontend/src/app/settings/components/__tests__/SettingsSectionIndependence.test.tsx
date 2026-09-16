import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { config } from "@wailsjs/go/models";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── hoisted mocks ──────────────────────────────────────────────────────────

const useGetSettingsMock = vi.hoisted(() => vi.fn());
const useGetDefaultShellMock = vi.hoisted(() => vi.fn());
const saveSettingsMock = vi.hoisted(() => vi.fn());
const getSettingsMock = vi.hoisted(() => vi.fn());
const saveMarketplaceRepositoriesMock = vi.hoisted(() => vi.fn());
const renderSuccessToastMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetSettings", () => ({
  useGetSettings: useGetSettingsMock,
}));

vi.mock("../../hooks/data-access/useGetDefaultShell", () => ({
  useGetDefaultShell: useGetDefaultShellMock,
}));

vi.mock("@wailsjs/go/app/App", () => ({
  SaveSettings: saveSettingsMock,
  GetSettings: getSettingsMock,
  SaveMarketplaceRepositories: saveMarketplaceRepositoriesMock,
}));

vi.mock("@galacius/design-system", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    renderSuccessToast: renderSuccessToastMock,
  };
});

// ─── imports after mocks ──────────────────────────────────────────────────────

import { AppContent } from "../AppContent";
import { MarketplaceContent } from "../MarketplaceContent";
import { SandboxContent } from "../SandboxContent";

// ─── helpers ────────────────────────────────────────────────────────────────

interface TestSettings extends Partial<config.Settings> {
  shellPath?: string;
  accessToken?: string;
  marketplaceRepositories?: config.MarketplaceRepository[];
  kubeconfigPaths?: string[];
  locale?: string;
}

function makeMockSettings(overrides?: TestSettings): config.Settings {
  const base = {
    shellPath: "/bin/bash",
    accessToken: "existing_token",
    marketplaceRepositories: [],
    kubeconfigPaths: ["/home/.kube/config"],
    locale: "UTC",
  };
  return config.Settings.createFrom({ ...base, ...overrides });
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

// ─── setup ──────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  saveSettingsMock.mockResolvedValue(undefined);
  getSettingsMock.mockResolvedValue(makeMockSettings());
  saveMarketplaceRepositoriesMock.mockResolvedValue(undefined);
  useGetDefaultShellMock.mockReturnValue({ data: "/bin/zsh" });
  renderSuccessToastMock.mockImplementation(() => {});
});

// ─── tests ──────────────────────────────────────────────────────────────────

describe("Settings Sections Independence", () => {
  describe("AppContent shellPath independence", () => {
    it("manages its own local state for shellPath", async () => {
      const settings = makeMockSettings({
        shellPath: "/bin/zsh",
      });
      useGetSettingsMock.mockReturnValue({ data: settings });

      const { wrapper } = makeWrapper();
      render(<AppContent />, { wrapper });

      // Verify initial state is populated from settings
      const shellInput = screen.getByDisplayValue("/bin/zsh");
      expect(shellInput).toBeInTheDocument();
    });

    it("does not share state with SandboxContent", async () => {
      const settings = makeMockSettings({
        shellPath: "/bin/zsh",
        accessToken: "sandbox_token",
      });
      useGetSettingsMock.mockReturnValue({ data: settings });

      const { wrapper } = makeWrapper();

      // Render App
      render(<AppContent />, { wrapper });
      expect(screen.getByDisplayValue("/bin/zsh")).toBeInTheDocument();

      cleanup();
      vi.clearAllMocks();
      saveSettingsMock.mockClear();

      // Render Sandbox (fresh component)
      useGetSettingsMock.mockReturnValue({ data: settings });
      render(<SandboxContent />, { wrapper });

      // Sandbox should have its own state, not App's
      // Token input should show the token, not the shell path
      const passwordInput = screen.getByDisplayValue("sandbox_token");
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput.id).toBe("access-token");
    });

    it("has its own save button and independent save status", async () => {
      const settings = makeMockSettings();
      useGetSettingsMock.mockReturnValue({ data: settings });

      const { wrapper } = makeWrapper();
      render(<AppContent />, { wrapper });

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe("SandboxContent independence", () => {
    it("manages its own token state independently", async () => {
      const settings = makeMockSettings({
        accessToken: "test_sandbox_token",
      });
      useGetSettingsMock.mockReturnValue({ data: settings });

      const { wrapper } = makeWrapper();
      render(<SandboxContent />, { wrapper });

      // Should show token in password mode
      const tokenInput = screen.getByDisplayValue("test_sandbox_token") as HTMLInputElement;
      expect(tokenInput).toBeInTheDocument();
      expect(tokenInput.type).toBe("password");
    });

    it("has its own Replace/Cancel button for token replacement flow", async () => {
      const settings = makeMockSettings({
        accessToken: "saved_token",
      });
      useGetSettingsMock.mockReturnValue({ data: settings });

      const { wrapper } = makeWrapper();
      render(<SandboxContent />, { wrapper });

      // Replace button should be visible
      const replaceButton = screen.getByRole("button", { name: /replace/i });
      expect(replaceButton).toBeInTheDocument();

      // Click Replace
      fireEvent.click(replaceButton);

      // Cancel button should now be visible
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it("does not share Replace state with MarketplaceContent", async () => {
      const settings = makeMockSettings({
        accessToken: "sandbox_token",
        marketplaceRepositories: [
          {
            url: "https://github.com/custom/repo",
            private: true,
            accessToken: "marketplace_token",
            locked: false,
            disabled: false,
          },
        ],
      });
      useGetSettingsMock.mockReturnValue({ data: settings });

      const { wrapper } = makeWrapper();

      // Render Sandbox
      render(<SandboxContent />, { wrapper });
      const sandboxReplaceButton = screen.getByRole("button", { name: /replace/i });
      expect(sandboxReplaceButton).toBeInTheDocument();

      cleanup();
      vi.clearAllMocks();
      useGetSettingsMock.mockReturnValue({ data: settings });

      // Render Marketplace (separate component)
      render(<MarketplaceContent />, { wrapper });

      // Marketplace should have its own key icon button (not a "Replace" button)
      const keyButton = screen.queryByRole("button", { name: /replace/i });
      expect(keyButton).not.toBeInTheDocument();
    });
  });

  describe("MarketplaceContent independence", () => {
    it("manages its own marketplace URL and token states", async () => {
      const settings = makeMockSettings({
        marketplaceRepositories: [
          {
            url: "https://github.com/custom/repo",
            private: true,
            accessToken: "mp_token",
            locked: false,
            disabled: false,
          },
        ],
      });
      useGetSettingsMock.mockReturnValue({ data: settings });

      const { wrapper } = makeWrapper();
      render(<MarketplaceContent />, { wrapper });

      // Verify all fields are loaded
      expect(screen.getByDisplayValue("https://github.com/custom/repo")).toBeInTheDocument();
      const privateSwitches = screen.getAllByRole("switch", { name: /private/i });
      expect(privateSwitches.length).toBeGreaterThan(0);
      expect(privateSwitches[0]).toBeChecked();
    });

    it("does not interfere with App or Sandbox sections", async () => {
      const settings = makeMockSettings({
        shellPath: "/bin/bash",
        accessToken: "sandbox_token",
        marketplaceRepositories: [
          {
            url: "https://github.com/mp/repo",
            private: false,
            accessToken: "",
            locked: false,
            disabled: false,
          },
        ],
      });
      useGetSettingsMock.mockReturnValue({ data: settings });

      const { wrapper } = makeWrapper();

      // All three sections should render independently
      render(<AppContent />, { wrapper });
      expect(screen.getByDisplayValue("/bin/bash")).toBeInTheDocument();

      cleanup();
      useGetSettingsMock.mockReturnValue({ data: settings });
      render(<SandboxContent />, { wrapper });
      expect(screen.getByDisplayValue("sandbox_token")).toBeInTheDocument();

      cleanup();
      useGetSettingsMock.mockReturnValue({ data: settings });
      render(<MarketplaceContent />, { wrapper });
      expect(screen.getByDisplayValue("https://github.com/mp/repo")).toBeInTheDocument();
    });
  });

  describe("save isolation: one section's save doesn't reset another's pending edits", () => {
    it("App save preserves Sandbox pending edits", async () => {
      const settings = makeMockSettings({
        shellPath: "/bin/bash",
        accessToken: "original_token",
      });

      // Simulate:
      // 1. User edits App (changes shellPath)
      // 2. User edits Sandbox (changes token)
      // 3. App saves first
      // 4. Verify Sandbox's pending edit is still there (not reset)

      useGetSettingsMock.mockReturnValue({ data: settings });

      const { wrapper } = makeWrapper();

      // Render App and make an edit
      const { unmount: unmountApp } = render(<AppContent />, { wrapper });
      const appShellInput = screen.getByDisplayValue("/bin/bash") as HTMLInputElement;
      fireEvent.change(appShellInput, { target: { value: "/bin/zsh" } });
      expect(appShellInput.value).toBe("/bin/zsh");

      // Save App
      const appSaveButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(appSaveButton);

      // Unmount App
      unmountApp();
      cleanup();

      // Render Sandbox and make an edit
      useGetSettingsMock.mockReturnValue({ data: settings });
      render(<SandboxContent />, { wrapper });

      const tokenInput = screen.getByDisplayValue("original_token") as HTMLInputElement;
      const replaceButton = screen.getByRole("button", { name: /replace/i });
      fireEvent.click(replaceButton);

      // Type new token
      fireEvent.change(tokenInput, { target: { value: "new_token" } });
      expect(tokenInput.value).toBe("new_token");

      // Verify the edit is still there (not reset by Terminal's save)
      expect(screen.getByDisplayValue("new_token")).toBeInTheDocument();
    });
  });

  describe("initializedRef prevents unwanted re-initialization", () => {
    it("AppContent does not reset shellPath when settings refetch completes", async () => {
      const initialSettings = makeMockSettings({
        shellPath: "/bin/bash",
      });
      useGetSettingsMock.mockReturnValue({ data: initialSettings });

      const { wrapper } = makeWrapper();
      const { rerender } = render(<AppContent />, { wrapper });

      const shellInput = screen.getByDisplayValue("/bin/bash") as HTMLInputElement;
      fireEvent.change(shellInput, { target: { value: "/bin/zsh" } });
      expect(shellInput.value).toBe("/bin/zsh");

      // Simulate settings refetch completing with new data
      const refetchedSettings = makeMockSettings({
        shellPath: "/bin/bash", // Backend still has old value
      });
      useGetSettingsMock.mockReturnValue({ data: refetchedSettings });

      // Re-render should NOT reset the local input value
      rerender(<AppContent />);

      // User's edit should still be there
      const updatedInput = screen.getByDisplayValue("/bin/zsh");
      expect(updatedInput).toBeInTheDocument();
    });

    it("SandboxContent does not reset when settings refetch completes mid-edit", async () => {
      const initialSettings = makeMockSettings({
        accessToken: "original_token",
      });
      useGetSettingsMock.mockReturnValue({ data: initialSettings });

      const { wrapper } = makeWrapper();
      const { rerender } = render(<SandboxContent />, { wrapper });

      const tokenInput = screen.getByDisplayValue("original_token") as HTMLInputElement;
      const replaceButton = screen.getByRole("button", { name: /replace/i });
      fireEvent.click(replaceButton);

      // Type new token
      fireEvent.change(tokenInput, { target: { value: "new_token" } });
      expect(tokenInput.value).toBe("new_token");

      // Simulate settings refetch
      useGetSettingsMock.mockReturnValue({ data: initialSettings });
      rerender(<SandboxContent />);

      // User's pending edit should still be there
      const updatedInput = screen.getByDisplayValue("new_token");
      expect(updatedInput).toBeInTheDocument();
    });

    it("MarketplaceContent waits for in-flight refetch before hydrating from a stale cache", () => {
      // Simulate remounting right after a save: the settings query was
      // invalidated and is refetching, but React Query still synchronously
      // returns the last (stale, pre-save) cached value while isFetching is true.
      const staleSettings = makeMockSettings({
        marketplaceRepositories: [
          {
            url: "https://api.github.com/repos/old/repo/releases",
            private: false,
            accessToken: "",
            locked: false,
            disabled: false,
          },
        ],
      });
      useGetSettingsMock.mockReturnValue({ data: staleSettings, isFetching: true });

      const { wrapper } = makeWrapper();
      const { rerender } = render(<MarketplaceContent />, { wrapper });

      // Must not hydrate from the stale snapshot while a refetch is in flight
      expect(
        screen.queryByDisplayValue("https://api.github.com/repos/old/repo/releases")
      ).not.toBeInTheDocument();

      // Refetch resolves with the authoritative (freshly saved) value
      const freshSettings = makeMockSettings({
        marketplaceRepositories: [
          {
            url: "https://api.github.com/repos/new/repo/releases",
            private: false,
            accessToken: "",
            locked: false,
            disabled: false,
          },
        ],
      });
      useGetSettingsMock.mockReturnValue({ data: freshSettings, isFetching: false });
      rerender(<MarketplaceContent />);

      expect(
        screen.getByDisplayValue("https://api.github.com/repos/new/repo/releases")
      ).toBeInTheDocument();
    });

    it("MarketplaceContent does not discard rows added while the initial fetch is still in flight", () => {
      // Simulates a user who clicks "Add Marketplace" and types URLs before the
      // very first GetSettings() call resolves (real Wails IPC has non-zero
      // latency, unlike an instantly-resolving mock). The hydration effect must
      // not clobber those in-progress rows once the fetch finally lands.
      useGetSettingsMock.mockReturnValue({ data: undefined, isFetching: true });

      const { wrapper } = makeWrapper();
      const { rerender } = render(<MarketplaceContent />, { wrapper });

      fireEvent.click(screen.getByRole("button", { name: /add marketplace/i }));
      const newRowInput = screen.getByPlaceholderText(
        "https://github.com/user/plugins"
      ) as HTMLInputElement;
      fireEvent.change(newRowInput, { target: { value: "https://github.com/userA/repoA" } });

      // The initial fetch resolves after the user has already started editing.
      const initialSettings = makeMockSettings({
        marketplaceRepositories: [
          {
            url: "https://api.github.com/repos/galacius/galacius/releases",
            private: false,
            accessToken: "",
            locked: false,
            disabled: false,
          },
        ],
      });
      useGetSettingsMock.mockReturnValue({ data: initialSettings, isFetching: false });
      rerender(<MarketplaceContent />);

      // The user's in-progress row must survive, not be replaced by server data.
      expect(screen.getByDisplayValue("https://github.com/userA/repoA")).toBeInTheDocument();
    });
  });
});
