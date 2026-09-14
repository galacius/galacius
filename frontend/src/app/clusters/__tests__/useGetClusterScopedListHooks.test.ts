import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetClusterRoleBindings } from "../modules/accessControls/clusterrolebindings/hooks/data-access/useGetClusterRoleBindings";
import { useGetClusterRoles } from "../modules/accessControls/clusterroles/hooks/data-access/useGetClusterRoles";
import { useGetNamespaces } from "../modules/base/namespaces/hooks/data-access/useGetNamespaces";
import { useGetPersistentVolumes } from "../modules/storages/pvs/hooks/data-access/useGetPersistentVolumes";
import { useGetPriorityClasses } from "../modules/configs/priorityclasses/hooks/data-access/useGetPriorityClasses";
import { useGetStorageClasses } from "../modules/storages/storageclasses/hooks/data-access/useGetStorageClasses";
import { useGetPortForwards } from "../modules/networks/portforwarding/hooks/data-access/useGetPortForwards";
import { QUERY_KEY_NAMESPACES } from "../modules/base/namespaces/api/api.const";
import { QUERY_KEY_CLUSTER_ROLE_BINDINGS } from "../modules/accessControls/clusterrolebindings/api/api.const";
import { QUERY_KEY_CLUSTER_ROLES } from "../modules/accessControls/clusterroles/api/api.const";
import { QUERY_KEY_PRIORITY_CLASSES } from "../modules/configs/priorityclasses/api/api.const";
import { QUERY_KEY_PORT_FORWARDS } from "../modules/networks/portforwarding/api/api.const";
import { QUERY_KEY_PVS } from "../modules/storages/pvs/api/api.const";
import { QUERY_KEY_STORAGE_CLASSES } from "../modules/storages/storageclasses/api/api.const";

const { eventsOnMock, triggerEvent, resetRegistry } = vi.hoisted(() => {
  const registry: Record<string, (...args: unknown[]) => void> = {};
  const mock = vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    registry[event] = cb;
    return vi.fn(() => {
      delete registry[event];
    });
  });
  return {
    eventsOnMock: mock,
    triggerEvent: (key: string, ...args: unknown[]) => registry[key]?.(...args),
    resetRegistry: () => {
      for (const k of Object.keys(registry)) delete registry[k];
    },
  };
});

vi.mock("@wailsjs/runtime/runtime", () => ({ EventsOn: eventsOnMock }));

const listClusterRoleBindingsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listClusterRolesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listNamespacesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listPersistentVolumesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listPriorityClassesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listStorageClassesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listPortForwardsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("../modules/base/namespaces/api/resources", () => ({
  ListNamespaces: listNamespacesMock,
}));

vi.mock("../modules/accessControls/clusterrolebindings/api/resources", () => ({
  ListClusterRoleBindings: listClusterRoleBindingsMock,
}));

vi.mock("../modules/accessControls/clusterroles/api/resources", () => ({
  ListClusterRoles: listClusterRolesMock,
}));

vi.mock("../modules/configs/priorityclasses/api/resources", () => ({
  ListPriorityClasses: listPriorityClassesMock,
}));

vi.mock("../modules/networks/portforwarding/api/resources", () => ({
  ListPortForwards: listPortForwardsMock,
}));

vi.mock("../modules/storages/pvs/api/resources", () => ({
  ListPersistentVolumes: listPersistentVolumesMock,
}));

vi.mock("../modules/storages/storageclasses/api/resources", () => ({
  ListStorageClasses: listStorageClassesMock,
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRegistry();
});

const cases: Array<{
  name: string;
  hook: (ctx: string) => { fetchStatus: string; isSuccess: boolean };
  queryKey: string;
  eventKey: string;
  mock: ReturnType<typeof vi.fn>;
}> = [];

describe("Cluster-scoped list hooks", () => {
  cases.forEach(({ name, hook, queryKey, eventKey, mock }) => {
    describe(name, () => {
      it("is disabled when context is empty", () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => hook(""), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
        expect(mock).not.toHaveBeenCalled();
      });

      it("fetches when context is provided", async () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => hook("ctx"), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mock).toHaveBeenCalled();
      });

      it("EventsOn fires and calls setQueryData with [KEY, ctx]", () => {
        const { wrapper, client } = makeWrapper();
        const spy = vi.spyOn(client, "setQueryData");
        renderHook(() => hook("ctx"), { wrapper });
        const payload = [{ name: "item-1" }];
        triggerEvent(eventKey, payload);
        expect(spy).toHaveBeenCalledWith([queryKey, "ctx"], payload);
      });
    });
  });

  // The following hooks no longer own their EventsOn subscriptions — those are now handled
  // globally by useListenAllResourceEvents (see that hook's own test), so only fetch-gating
  // behavior is covered here.
  describe("useGetNamespaces", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetNamespaces(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listNamespacesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetNamespaces("ctx"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listNamespacesMock).toHaveBeenCalled();
    });

    it("queryKey uses [KEY, ctx]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetNamespaces("ctx"), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_NAMESPACES, "ctx"]);
    });
  });

  describe("useGetPersistentVolumes", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPersistentVolumes(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listPersistentVolumesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPersistentVolumes("ctx"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listPersistentVolumesMock).toHaveBeenCalled();
    });

    it("queryKey uses [KEY, ctx]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetPersistentVolumes("ctx"), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_PVS, "ctx"]);
    });
  });

  describe("useGetStorageClasses", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetStorageClasses(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listStorageClassesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetStorageClasses("ctx"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listStorageClassesMock).toHaveBeenCalled();
    });

    it("queryKey uses [KEY, ctx]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetStorageClasses("ctx"), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_STORAGE_CLASSES, "ctx"]);
    });
  });

  describe("useGetClusterRoleBindings", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetClusterRoleBindings(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listClusterRoleBindingsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetClusterRoleBindings("ctx"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listClusterRoleBindingsMock).toHaveBeenCalled();
    });

    it("queryKey uses [KEY, ctx]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetClusterRoleBindings("ctx"), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_CLUSTER_ROLE_BINDINGS, "ctx"]);
    });
  });

  describe("useGetPortForwards", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPortForwards({ context: "" }), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listPortForwardsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPortForwards({ context: "ctx" }), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listPortForwardsMock).toHaveBeenCalled();
    });

    it("queryKey uses full input object", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetPortForwards({ context: "ctx" }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_PORT_FORWARDS, { context: "ctx" }]);
    });

    it("EventsOn fires and setQueryData uses destructured { context } key", () => {
      const { wrapper, client } = makeWrapper();
      const spy = vi.spyOn(client, "setQueryData");
      renderHook(() => useGetPortForwards({ context: "ctx" }), { wrapper });
      const payload = [{ id: "pf-1" }];
      triggerEvent("portforwards:update", payload);
      // setQueryData key uses { context } destructured, not the full input object
      expect(spy).toHaveBeenCalledWith([QUERY_KEY_PORT_FORWARDS, { context: "ctx" }], payload);
    });
  });

  // The following hooks have their EventsOn subscriptions managed globally by
  // useListenAllResourceEvents (Batch 4), so only fetch-gating and queryKey are tested here.
  describe("useGetClusterRoles", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetClusterRoles(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listClusterRolesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetClusterRoles("ctx"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listClusterRolesMock).toHaveBeenCalled();
    });

    it("queryKey uses [KEY, ctx]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetClusterRoles("ctx"), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_CLUSTER_ROLES, "ctx"]);
    });
  });

  describe("useGetPriorityClasses", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPriorityClasses(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listPriorityClassesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPriorityClasses("ctx"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listPriorityClassesMock).toHaveBeenCalled();
    });

    it("queryKey uses [KEY, ctx]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetPriorityClasses("ctx"), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_PRIORITY_CLASSES, "ctx"]);
    });
  });
});
