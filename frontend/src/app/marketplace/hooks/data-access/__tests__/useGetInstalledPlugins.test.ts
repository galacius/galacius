import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetInstalledPlugins } from "../useGetInstalledPlugins";

const getInstalledPluginsMock = vi.hoisted(() => vi.fn());

vi.mock("@wailsjs/go/app/App", () => ({
  GetInstalledPlugins: getInstalledPluginsMock,
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

describe("useGetInstalledPlugins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call GetInstalledPlugins and return pluginStatuses", async () => {
    getInstalledPluginsMock.mockResolvedValue([
      { pluginId: "helm", status: "READY", progress: 100, bundleChecksum: "abc123" },
      { pluginId: "other", status: "NOT_INSTALLED", progress: 0 },
    ]);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetInstalledPlugins(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getInstalledPluginsMock).toHaveBeenCalled();
    expect(result.current.pluginStatuses).toHaveLength(2);
    expect(result.current.pluginStatuses[0].pluginId).toBe("helm");
  });

  it("should filter and return only READY plugins in readyPlugins", async () => {
    getInstalledPluginsMock.mockResolvedValue([
      { pluginId: "helm", status: "READY", progress: 100, bundleChecksum: "abc123" },
      { pluginId: "other", status: "NOT_INSTALLED", progress: 0 },
      { pluginId: "kube", status: "READY", progress: 100, bundleChecksum: "def456" },
    ]);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetInstalledPlugins(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.readyPlugins).toHaveLength(2);
    expect(result.current.readyPlugins[0].pluginId).toBe("helm");
    expect(result.current.readyPlugins[1].pluginId).toBe("kube");
    expect(result.current.readyPlugins.every((p) => p.status === "READY")).toBe(true);
  });

  it("should reflect isLoading state correctly", async () => {
    getInstalledPluginsMock.mockResolvedValue([
      { pluginId: "helm", status: "READY", progress: 100, bundleChecksum: "abc123" },
    ]);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetInstalledPlugins(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should return empty arrays when no plugins are installed", async () => {
    getInstalledPluginsMock.mockResolvedValue([]);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetInstalledPlugins(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pluginStatuses).toHaveLength(0);
    expect(result.current.readyPlugins).toHaveLength(0);
  });
});
