import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetContextKubeconfigPath } from "../useGetContextKubeconfigPath";
import { QUERY_KEY_CONTEXT_KUBECONFIG_PATH } from "../../../api/api.const";

const getContextKubeconfigPathMock = vi.hoisted(() => vi.fn().mockResolvedValue("/custom/config"));

vi.mock("@wailsjs/go/app/App", () => ({
  GetContextKubeconfigPath: getContextKubeconfigPathMock,
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

describe("useGetContextKubeconfigPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is disabled when contextName is null", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetContextKubeconfigPath(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getContextKubeconfigPathMock).not.toHaveBeenCalled();
  });

  it("fetches when contextName is provided", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetContextKubeconfigPath("my-cluster"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getContextKubeconfigPathMock).toHaveBeenCalledWith("my-cluster");
    expect(result.current.data).toBe("/custom/config");
  });

  it("uses correct query key with contextName", () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetContextKubeconfigPath("my-cluster"), { wrapper });
    const cache = client.getQueryCache().findAll();
    expect(cache[0].queryKey).toEqual([
      QUERY_KEY_CONTEXT_KUBECONFIG_PATH,
      { contextName: "my-cluster" },
    ]);
  });
});
