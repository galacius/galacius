import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetNamespaceNames } from "../modules/base/namespaces/hooks/data-access/useGetNamespaceNames";
import { QUERY_KEY_NAMESPACE_NAMES } from "../modules/base/namespaces/api/api.const";

type NamespaceEventCallback = (namespaces: { Name: string }[]) => void;

const { eventsOnMock, triggerEvent, resetRegistry } = vi.hoisted(() => {
  const registry: Record<string, NamespaceEventCallback> = {};
  const mock = vi.fn((event: string, cb: NamespaceEventCallback) => {
    registry[event] = cb;
    return vi.fn(() => {
      delete registry[event];
    });
  });
  return {
    eventsOnMock: mock,
    triggerEvent: (key: string, data: { Name: string }[]) => registry[key]?.(data),
    resetRegistry: () => {
      for (const k of Object.keys(registry)) delete registry[k];
    },
  };
});

vi.mock("@wailsjs/runtime/runtime", () => ({
  EventsOn: eventsOnMock,
}));

const getNamespacesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("../modules/base/namespaces/api/resources", () => ({
  GetNamespaces: getNamespacesMock,
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

describe("useGetNamespaceNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRegistry();
  });

  it("is disabled when context is empty", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetNamespaceNames(""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getNamespacesMock).not.toHaveBeenCalled();
  });

  it("fetches when context is provided", async () => {
    getNamespacesMock.mockResolvedValue(["default", "kube-system"]);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetNamespaceNames("ctx1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getNamespacesMock).toHaveBeenCalled();
    expect(result.current.data).toEqual(["default", "kube-system"]);
  });

  it("uses correct queryKey structure", () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useGetNamespaceNames("ctx1"), { wrapper });
    const cache = client.getQueryCache().findAll();
    expect(cache[0].queryKey).toEqual([QUERY_KEY_NAMESPACE_NAMES, "ctx1"]);
  });

  it("EventsOn handler maps Namespace objects to name strings via setQueryData", async () => {
    const { wrapper, client } = makeWrapper();
    const setQueryDataSpy = vi.spyOn(client, "setQueryData");

    renderHook(() => useGetNamespaceNames("ctx1"), { wrapper });

    const namespaceObjects = [{ Name: "default" }, { Name: "kube-system" }, { Name: "monitoring" }];
    triggerEvent("namespaces:update", namespaceObjects);

    expect(setQueryDataSpy).toHaveBeenCalledWith(
      [QUERY_KEY_NAMESPACE_NAMES, "ctx1"],
      ["default", "kube-system", "monitoring"]
    );
  });

  it("EventsOn handler plucks only the Name field, ignoring other properties", async () => {
    const { wrapper, client } = makeWrapper();
    const setQueryDataSpy = vi.spyOn(client, "setQueryData");

    renderHook(() => useGetNamespaceNames("ctx2"), { wrapper });

    const richObjects = [
      { Name: "ns-a", Labels: { env: "prod" }, Status: "Active" },
      { Name: "ns-b", Labels: {}, Status: "Terminating" },
    ];
    triggerEvent("namespaces:update", richObjects as { Name: string }[]);

    const [, data] = setQueryDataSpy.mock.calls[0];
    expect(data).toEqual(["ns-a", "ns-b"]);
  });

  it("calls unsub on unmount", () => {
    const { wrapper } = makeWrapper();
    const { unmount } = renderHook(() => useGetNamespaceNames("ctx1"), { wrapper });
    unmount();
    expect(eventsOnMock.mock.results[0]?.value).toHaveBeenCalled();
  });

  it("passes callback.select to useQuery", async () => {
    getNamespacesMock.mockResolvedValue(["default", "kube-system"]);
    const { wrapper } = makeWrapper();
    const selectFn = vi.fn((data: string[] | undefined) =>
      (data ?? []).filter((n) => n !== "kube-system")
    );

    const { result } = renderHook(() => useGetNamespaceNames("ctx1", { select: selectFn }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(selectFn).toHaveBeenCalled();
    expect(result.current.data).toEqual(["default"]);
  });
});
