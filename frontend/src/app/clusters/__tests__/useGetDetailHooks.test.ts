import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetDeploymentDetail } from "../modules/workloads/deployments/hooks/data-access/useGetDeploymentDetail";
import { useGetNodeDetail } from "../modules/base/nodes/hooks/data-access/useGetNodeDetail";
import { useGetPodDetail } from "../modules/workloads/pods/hooks/data-access/useGetPodDetail";
import { QUERY_KEY_NODE_DETAIL } from "../modules/base/nodes/api/api.const";
import { QUERY_KEY_DEPLOYMENT_DETAIL } from "../modules/workloads/deployments/api/api.const";
import { QUERY_KEY_POD_DETAIL } from "../modules/workloads/pods/api/api.const";

const getDeploymentByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getNodeByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getPodByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("../modules/base/nodes/api/resources", () => ({
  GetNodeByName: getNodeByNameMock,
  WatchNodeDetail: vi.fn(),
  UnwatchNodeDetail: vi.fn(),
}));

vi.mock("../modules/workloads/deployments/api/resources", () => ({
  GetDeploymentByName: getDeploymentByNameMock,
  WatchDeploymentDetail: vi.fn(),
  UnwatchDeploymentDetail: vi.fn(),
}));

vi.mock("../modules/workloads/pods/api/resources", () => ({
  GetPodByName: getPodByNameMock,
  WatchPodDetail: vi.fn(),
  UnwatchPodDetail: vi.fn(),
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

describe("useGetDeploymentDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is disabled when context is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetDeploymentDetail("", "default", "my-deploy"), {
      wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getDeploymentByNameMock).not.toHaveBeenCalled();
  });

  it("is disabled when namespace is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetDeploymentDetail("ctx1", "", "my-deploy"), {
      wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getDeploymentByNameMock).not.toHaveBeenCalled();
  });

  it("is disabled when name is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetDeploymentDetail("ctx1", "default", ""), {
      wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getDeploymentByNameMock).not.toHaveBeenCalled();
  });

  it("fetches when all three params are present", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetDeploymentDetail("ctx1", "default", "my-deploy"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getDeploymentByNameMock).toHaveBeenCalledWith("default", "my-deploy");
  });

  it("uses correct queryKey structure", () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetDeploymentDetail("ctx1", "default", "my-deploy"), { wrapper });
    const cache = client.getQueryCache().findAll();
    expect(cache[0].queryKey).toEqual([
      QUERY_KEY_DEPLOYMENT_DETAIL,
      { context: "ctx1", namespace: "default", name: "my-deploy" },
    ]);
  });
});

describe("useGetNodeDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is disabled when context is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetNodeDetail("", "my-node"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getNodeByNameMock).not.toHaveBeenCalled();
  });

  it("is disabled when name is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetNodeDetail("ctx1", ""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getNodeByNameMock).not.toHaveBeenCalled();
  });

  it("fetches when both params are present", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetNodeDetail("ctx1", "my-node"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getNodeByNameMock).toHaveBeenCalledWith("my-node");
  });

  it("uses correct queryKey structure", () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetNodeDetail("ctx1", "my-node"), { wrapper });
    const cache = client.getQueryCache().findAll();
    expect(cache[0].queryKey).toEqual([
      QUERY_KEY_NODE_DETAIL,
      { context: "ctx1", name: "my-node" },
    ]);
  });
});

describe("useGetPodDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is disabled when context is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetPodDetail("", "default", "my-pod"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getPodByNameMock).not.toHaveBeenCalled();
  });

  it("is disabled when namespace is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetPodDetail("ctx1", "", "my-pod"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getPodByNameMock).not.toHaveBeenCalled();
  });

  it("is disabled when name is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetPodDetail("ctx1", "default", ""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getPodByNameMock).not.toHaveBeenCalled();
  });

  it("fetches when all three params are present", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetPodDetail("ctx1", "default", "my-pod"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getPodByNameMock).toHaveBeenCalledWith("default", "my-pod");
  });

  it("uses correct queryKey structure", () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetPodDetail("ctx1", "default", "my-pod"), { wrapper });
    const cache = client.getQueryCache().findAll();
    expect(cache[0].queryKey).toEqual([
      QUERY_KEY_POD_DETAIL,
      { context: "ctx1", namespace: "default", name: "my-pod" },
    ]);
  });
});
