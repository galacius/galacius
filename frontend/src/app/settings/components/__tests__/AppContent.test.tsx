import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetSettingsMock = vi.hoisted(() => vi.fn());
const saveTimezoneMock = vi.hoisted(() => vi.fn());
const renderSuccessToastMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetSettings", () => ({
  useGetSettings: useGetSettingsMock,
}));

vi.mock("../../hooks/data-mutation/useSaveLocaleTimezone", () => ({
  useSaveLocaleTimezone: () => ({ mutate: saveTimezoneMock }),
}));

vi.mock("@galacius/design-system", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    TimezoneSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
      createElement(
        "select",
        {
          "data-testid": "tz-select",
          value,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
        },
        // Always include the current value so the select doesn't fall back to first option
        createElement("option", { value }, value),
        createElement("option", { value: "UTC" }, "UTC"),
        createElement("option", { value: "America/New_York" }, "America/New_York"),
        createElement("option", { value: "Asia/Tokyo" }, "Asia/Tokyo")
      ),
    renderSuccessToast: renderSuccessToastMock,
  };
});

// ─── imports after mocks ──────────────────────────────────────────────────────

import { AppContent } from "../AppContent";

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
  useGetSettingsMock.mockReturnValue({ data: { locale: "UTC", kubeconfigPaths: [] } });
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("AppContent", () => {
  it("renders the Locale Timezone label", () => {
    render(<AppContent />, { wrapper: makeWrapper() });
    expect(screen.getByText("Locale Timezone")).toBeInTheDocument();
  });

  it("passes settings.locale as value to TimezoneSelect", () => {
    useGetSettingsMock.mockReturnValue({ data: { locale: "Asia/Tokyo", kubeconfigPaths: [] } });
    render(<AppContent />, { wrapper: makeWrapper() });
    expect(screen.getByTestId("tz-select")).toHaveValue("Asia/Tokyo");
  });

  it("falls back to system timezone when settings.locale is empty", () => {
    const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    useGetSettingsMock.mockReturnValue({ data: { locale: "", kubeconfigPaths: [] } });
    render(<AppContent />, { wrapper: makeWrapper() });
    expect(screen.getByTestId("tz-select")).toHaveValue(systemTz);
  });

  it("falls back to system timezone when settings is undefined", () => {
    const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    useGetSettingsMock.mockReturnValue({ data: undefined });
    render(<AppContent />, { wrapper: makeWrapper() });
    expect(screen.getByTestId("tz-select")).toHaveValue(systemTz);
  });

  it("calls saveTimezone with selected timezone when changed", () => {
    render(<AppContent />, { wrapper: makeWrapper() });
    fireEvent.change(screen.getByTestId("tz-select"), {
      target: { value: "America/New_York" },
    });
    expect(saveTimezoneMock).toHaveBeenCalledWith("America/New_York", expect.any(Object));
  });

  it("shows success toast on timezone save success", () => {
    saveTimezoneMock.mockImplementation((_tz: string, opts: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });
    render(<AppContent />, { wrapper: makeWrapper() });
    fireEvent.change(screen.getByTestId("tz-select"), {
      target: { value: "America/New_York" },
    });
    expect(renderSuccessToastMock).toHaveBeenCalledTimes(1);
  });
});
