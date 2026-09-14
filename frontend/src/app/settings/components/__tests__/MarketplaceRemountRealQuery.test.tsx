import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { config } from "@wailsjs/go/models";

// This test intentionally does NOT mock the useGetSettings hook itself — it
// mocks only the underlying Wails IPC calls (GetSettings/SaveSettings), so the
// real @tanstack/react-query cache, staleTime, refetchOnMount, and
// invalidateQueries behavior all run for real. This is the only way to
// actually exercise the exact race the user reported: add rows -> save ->
// switch tabs away (unmount) -> switch back (remount), all within the same
// running session / same QueryClient instance, with realistic IPC latency.

const getSettingsMock = vi.hoisted(() => vi.fn());
const saveSettingsMock = vi.hoisted(() => vi.fn());
const saveMarketplaceRepositoriesMock = vi.hoisted(() => vi.fn());
const renderSuccessToastMock = vi.hoisted(() => vi.fn());

vi.mock("@wailsjs/go/app/App", () => ({
  GetSettings: getSettingsMock,
  SaveSettings: saveSettingsMock,
  SaveMarketplaceRepositories: saveMarketplaceRepositoriesMock,
}));

vi.mock("@galacius/design-system", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    renderSuccessToast: renderSuccessToastMock,
  };
});

import { MarketplaceContent } from "../MarketplaceContent";

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function makeSettings(repos: config.MarketplaceRepository[]): config.Settings {
  return config.Settings.createFrom({
    accessToken: "",
    clusterProxies: {},
    shellPath: "/bin/bash",
    kubeconfigPaths: [],
    locale: "UTC",
    marketplaceRepositories: repos,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MarketplaceContent remount with real react-query (no hook mocking)", () => {
  it("shows saved rows after unmount+remount (tab switch) using the same QueryClient, with realistic IPC latency", async () => {
    renderSuccessToastMock.mockImplementation(() => {});

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    const defaultRepo = {
      url: "https://api.github.com/repos/galacius/galacius/releases",
      private: false,
      accessToken: "",
      locked: false,
      disabled: false,
    };

    // Initial GetSettings call (mount #1) — simulate real IPC latency.
    getSettingsMock.mockImplementation(() => delay(makeSettings([defaultRepo]), 20));

    const { unmount } = render(<MarketplaceContent />, { wrapper });

    // Wait for initial hydration.
    await screen.findByDisplayValue(defaultRepo.url);

    // User adds two rows with distinct URLs.
    fireEvent.click(screen.getByRole("button", { name: /add marketplace/i }));
    let inputs = screen.getAllByPlaceholderText("https://github.com/user/plugins");
    fireEvent.change(inputs[inputs.length - 1], {
      target: { value: "https://github.com/userA/repoA" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add marketplace/i }));
    inputs = screen.getAllByPlaceholderText("https://github.com/user/plugins");
    fireEvent.change(inputs[inputs.length - 1], {
      target: { value: "https://github.com/userB/repoB" },
    });

    const savedRepos = [
      defaultRepo,
      {
        url: "https://github.com/userA/repoA",
        private: false,
        accessToken: "",
        locked: false,
        disabled: false,
      },
      {
        url: "https://github.com/userB/repoB",
        private: false,
        accessToken: "",
        locked: false,
        disabled: false,
      },
    ];

    // After save succeeds, GetSettings (queried again on invalidate/remount) must
    // reflect the newly-saved data, again with realistic latency.
    saveMarketplaceRepositoriesMock.mockImplementation(() => delay(undefined, 20));
    getSettingsMock.mockImplementation(() => delay(makeSettings(savedRepos), 20));

    const saveButtons = screen.getAllByRole("button", { name: /save/i });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => expect(saveMarketplaceRepositoriesMock).toHaveBeenCalledTimes(1));

    // Give the background invalidate-triggered refetch a moment to land while
    // still mounted (as would happen in the real app before the user switches tabs).
    await waitFor(() => expect(getSettingsMock.mock.calls.length).toBeGreaterThanOrEqual(2));

    // User switches tabs away.
    unmount();

    // User switches back — fresh component instance, same QueryClient.
    render(<MarketplaceContent />, { wrapper });

    // All three rows must be present, not reverted to just the default.
    await waitFor(() => {
      expect(screen.getByDisplayValue("https://github.com/userA/repoA")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://github.com/userB/repoB")).toBeInTheDocument();
      expect(screen.getByDisplayValue(defaultRepo.url)).toBeInTheDocument();
    });
  });
});
