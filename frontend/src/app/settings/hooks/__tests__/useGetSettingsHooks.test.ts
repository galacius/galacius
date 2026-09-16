import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetSettings } from "../data-access/useGetSettings";
import { useGetActiveKubeconfigPaths } from "../data-access/useGetActiveKubeconfigPaths";
import { useGetDefaultShell } from "../data-access/useGetDefaultShell";
import {
  QUERY_KEY_SETTINGS,
  QUERY_KEY_ACTIVE_KUBECONFIG_PATHS,
  QUERY_KEY_DEFAULT_SHELL,
} from "../../api/api.const";

const getSettingsMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ kubeconfigPaths: [], locale: "UTC" })
);
const getActiveKubeconfigPathsMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue(["/home/.kube/config"])
);
const getDefaultShellMock = vi.hoisted(() => vi.fn().mockResolvedValue("/bin/zsh"));

vi.mock("@wailsjs/go/app/App", () => ({
  GetSettings: getSettingsMock,
  GetActiveKubeconfigPaths: getActiveKubeconfigPathsMock,
  GetDefaultShell: getDefaultShellMock,
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

describe("useGetSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and returns settings data", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetSettings(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getSettingsMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ kubeconfigPaths: [], locale: "UTC" });
  });

  it("uses correct query key", () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetSettings(), { wrapper });
    const cache = client.getQueryCache().findAll();
    expect(cache[0].queryKey).toEqual([QUERY_KEY_SETTINGS]);
  });

  it("applies select callback when provided", async () => {
    const { wrapper } = makeWrapper();
    const select = ((d: any) => ({
      kubeconfigPaths: d?.kubeconfigPaths ?? [],
      locale: "transformed",
    })) as any;
    const { result } = renderHook(() => useGetSettings({ select }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.locale).toBe("transformed");
  });
});

describe("useGetActiveKubeconfigPaths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and returns active kubeconfig paths", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetActiveKubeconfigPaths(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getActiveKubeconfigPathsMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(["/home/.kube/config"]);
  });

  it("uses correct query key", () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetActiveKubeconfigPaths(), { wrapper });
    const cache = client.getQueryCache().findAll();
    expect(cache[0].queryKey).toEqual([QUERY_KEY_ACTIVE_KUBECONFIG_PATHS]);
  });

  it("applies select callback when provided", async () => {
    const { wrapper } = makeWrapper();
    const select = (paths?: string[]) => (paths ?? []).slice(0, 1);
    const { result } = renderHook(() => useGetActiveKubeconfigPaths({ select }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(["/home/.kube/config"]);
  });
});

describe("useGetDefaultShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and returns default shell", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetDefaultShell(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getDefaultShellMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe("/bin/zsh");
  });

  it("uses correct query key", () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetDefaultShell(), { wrapper });
    const cache = client.getQueryCache().findAll();
    expect(cache[0].queryKey).toEqual([QUERY_KEY_DEFAULT_SHELL]);
  });
});
