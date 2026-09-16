import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetInstalledPlugin } from "../useGetInstalledPlugin";

const getInstalledPluginMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ status: "NOT_INSTALLED", progress: 0 })
);

vi.mock("@wailsjs/go/app/App", () => ({
  GetInstalledPlugin: getInstalledPluginMock,
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

describe("useGetInstalledPlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("should return NOT_INSTALLED status initially", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetInstalledPlugin("test-plugin"), { wrapper });

    expect(result.current.status).toBe("NOT_INSTALLED");
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeUndefined();
  });

  it("should mask CRASHED status as NOT_INSTALLED when no install has been attempted", async () => {
    getInstalledPluginMock.mockResolvedValueOnce({
      status: "CRASHED",
      error: "Some error",
      progress: 0,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetInstalledPlugin("test-plugin"), { wrapper });

    // Before any install attempt is reported, CRASHED should be masked
    await waitFor(() => {
      expect(result.current.status).toBe("NOT_INSTALLED");
    });
  });

  it("should surface the real status once hasAttemptedInstall is true", async () => {
    getInstalledPluginMock.mockResolvedValueOnce({
      status: "CRASHED",
      error: "Some error",
      progress: 0,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useGetInstalledPlugin("test-plugin", { hasAttemptedInstall: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.status).toBe("CRASHED");
    });
  });

  it("should pass through installedVersion", async () => {
    getInstalledPluginMock.mockResolvedValueOnce({
      status: "CRASHED",
      progress: 0,
      bundleChecksum: "0000000000000000000000000000000000000000000000000000000000000000",
      installedVersion: "v0.15.0",
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetInstalledPlugin("test-plugin"), { wrapper });

    await waitFor(() => {
      expect(result.current.installedVersion).toBe("v0.15.0");
    });
  });
});
