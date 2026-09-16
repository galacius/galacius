import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetDeployments } from "../modules/workloads/deployments/hooks/data-access/useGetDeployments";
import { useGetNodes } from "../modules/base/nodes/hooks/data-access/useGetNodes";
import { useGetPods } from "../modules/workloads/pods/hooks/data-access/useGetPods";

type EventCallback = (...args: unknown[]) => void;

const { eventsOnMock, resetRegistry, triggerEvent } = vi.hoisted(() => {
  const registry: Record<string, EventCallback> = {};
  const unsubRegistry: Record<string, ReturnType<typeof vi.fn>> = {};
  const mock = vi.fn((event: string, cb: EventCallback) => {
    registry[event] = cb;
    const unsub = vi.fn(() => {
      delete registry[event];
    });
    unsubRegistry[event] = unsub;
    return unsub;
  });
  return {
    eventsOnMock: mock,
    resetRegistry: () => {
      for (const k of Object.keys(registry)) delete registry[k];
      for (const k of Object.keys(unsubRegistry)) delete unsubRegistry[k];
    },
    triggerEvent: (event: string, data: unknown) => {
      const cb = registry[event];
      if (cb) cb(data);
    },
  };
});

vi.mock("@wailsjs/runtime/runtime", () => ({
  EventsOn: eventsOnMock,
}));

const listDeploymentsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listNodesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listPodsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("../modules/base/nodes/api/resources", () => ({
  ListNodes: listNodesMock,
}));

vi.mock("../modules/workloads/deployments/api/resources", () => ({
  ListDeployments: listDeploymentsMock,
}));

vi.mock("../modules/workloads/pods/api/resources", () => ({
  ListPods: listPodsMock,
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

describe("useGetDeployments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRegistry();
  });

  it("is disabled when context is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useGetDeployments({ context: "", namespaces: ["default"] }),
      {
        wrapper,
      }
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(listDeploymentsMock).not.toHaveBeenCalled();
  });

  it("fetches when context is provided", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useGetDeployments({ context: "my-ctx", namespaces: ["default"] }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listDeploymentsMock).toHaveBeenCalledWith();
  });

  it("uses correct queryKey", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useGetDeployments({ context: "ctx1", namespaces: ["ns1"] }),
      {
        wrapper,
      }
    );
    expect(result.current).toBeDefined();
    expect(listDeploymentsMock).toHaveBeenCalled();
    const callArgs = listDeploymentsMock.mock.calls[0];
    expect(callArgs).toEqual([]);
  });

  it("passes callback.select to useQuery", async () => {
    const { wrapper } = makeWrapper();
    const selectFn = vi.fn((data) => data);
    listDeploymentsMock.mockResolvedValue([{ name: "d1" }]);

    const { result } = renderHook(
      () => useGetDeployments({ context: "ctx1", namespaces: ["ns1"] }, { select: selectFn }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(selectFn).toHaveBeenCalled();
  });
});

describe("useGetNodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRegistry();
  });

  it("is disabled when context is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetNodes(""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(listNodesMock).not.toHaveBeenCalled();
  });

  it("fetches when context is provided", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetNodes("my-ctx"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listNodesMock).toHaveBeenCalled();
  });

  // EventsOn subscription now handled globally by useListenAllResourceEvents (Batch 4)
});

describe("useGetPods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRegistry();
  });

  it("is disabled when context is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetPods({ context: "", namespaces: ["default"] }), {
      wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(listPodsMock).not.toHaveBeenCalled();
  });

  it("fetches when context is provided", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useGetPods({ context: "ctx1", namespaces: ["kube-system"] }),
      {
        wrapper,
      }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listPodsMock).toHaveBeenCalledWith();
  });

  it("returns isLoading=false when event-driven latestPods is populated even if query is refetching", async () => {
    const { wrapper } = makeWrapper();

    // Keep query pending by returning a promise that never resolves
    const neverResolvesPromise = new Promise<any[]>(() => {
      /* never resolves */
    });
    listPodsMock.mockReturnValue(neverResolvesPromise);

    const { result } = renderHook(
      () => useGetPods({ context: "ctx1", namespaces: ["kube-system"] }),
      {
        wrapper,
      }
    );

    // Query starts loading, no event data yet → hook.isLoading = true
    expect(result.current.isLoading).toBe(true);

    // Simulate event-driven pods update (e.g., from large ~500-pod cluster)
    triggerEvent("pods:update", [
      { Name: "pod-1", Namespace: "kube-system" },
      { Name: "pod-2", Namespace: "kube-system" },
    ]);

    // After event fires, even though query is still "loading" (never resolved),
    // hook.isLoading should be false because latestPods is now populated
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toHaveLength(2);
  });
});
