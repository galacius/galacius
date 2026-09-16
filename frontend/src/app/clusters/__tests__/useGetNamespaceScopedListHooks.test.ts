import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUERY_KEY_ROLE_BINDINGS } from "../modules/accessControls/rolebindings/api/api.const";
import { useGetRoleBindings } from "../modules/accessControls/rolebindings/hooks/data-access/useGetRoleBindings";
import { QUERY_KEY_ROLES } from "../modules/accessControls/roles/api/api.const";
import { useGetRoles } from "../modules/accessControls/roles/hooks/data-access/useGetRoles";
import { QUERY_KEY_SERVICE_ACCOUNTS } from "../modules/accessControls/serviceaccounts/api/api.const";
import { useGetServiceAccounts } from "../modules/accessControls/serviceaccounts/hooks/data-access/useGetServiceAccounts";
import { useGetEvents } from "../modules/base/events/hooks/data-access/useGetEvents";
import { useGetWarningEvents } from "../modules/base/events/hooks/data-access/useGetWarningEvents";
import { QUERY_KEY_CONFIGMAPS } from "../modules/configs/configmaps/api/api.const";
import { useGetConfigMaps } from "../modules/configs/configmaps/hooks/data-access/useGetConfigMaps";
import { QUERY_KEY_HPAS } from "../modules/configs/hpas/api/api.const";
import { useGetHPAs } from "../modules/configs/hpas/hooks/data-access/useGetHPAs";
import { QUERY_KEY_LEASES } from "../modules/configs/leases/api/api.const";
import { useGetLeases } from "../modules/configs/leases/hooks/data-access/useGetLeases";
import { QUERY_KEY_LIMIT_RANGES } from "../modules/configs/limitranges/api/api.const";
import { useGetLimitRanges } from "../modules/configs/limitranges/hooks/data-access/useGetLimitRanges";
import { QUERY_KEY_PDBS } from "../modules/configs/pdbs/api/api.const";
import { useGetPodDisruptionBudgets } from "../modules/configs/pdbs/hooks/data-access/useGetPodDisruptionBudgets";
import { QUERY_KEY_RESOURCE_QUOTAS } from "../modules/configs/resourcequotas/api/api.const";
import { useGetResourceQuotas } from "../modules/configs/resourcequotas/hooks/data-access/useGetResourceQuotas";
import { QUERY_KEY_SECRETS } from "../modules/configs/secrets/api/api.const";
import { useGetSecrets } from "../modules/configs/secrets/hooks/data-access/useGetSecrets";
import { QUERY_KEY_ENDPOINTS } from "../modules/networks/endpoints/api/api.const";
import { useGetEndpoints } from "../modules/networks/endpoints/hooks/data-access/useGetEndpoints";
import { QUERY_KEY_ENDPOINT_SLICES } from "../modules/networks/endpointslices/api/api.const";
import { useGetEndpointSlices } from "../modules/networks/endpointslices/hooks/data-access/useGetEndpointSlices";
import { QUERY_KEY_INGRESSES } from "../modules/networks/ingresses/api/api.const";
import { useGetIngresses } from "../modules/networks/ingresses/hooks/data-access/useGetIngresses";
import { QUERY_KEY_NETWORK_POLICIES } from "../modules/networks/networkpolicies/api/api.const";
import { useGetNetworkPolicies } from "../modules/networks/networkpolicies/hooks/data-access/useGetNetworkPolicies";
import { QUERY_KEY_SERVICES } from "../modules/networks/services/api/api.const";
import { useGetServices } from "../modules/networks/services/hooks/data-access/useGetServices";
import { QUERY_KEY_PVCS } from "../modules/storages/pvcs/api/api.const";
import { useGetPersistentVolumeClaims } from "../modules/storages/pvcs/hooks/data-access/useGetPersistentVolumeClaims";
import { QUERY_KEY_CRONJOBS } from "../modules/workloads/cronjobs/api/api.const";
import { useGetCronJobs } from "../modules/workloads/cronjobs/hooks/data-access/useGetCronJobs";
import { QUERY_KEY_DAEMONSETS } from "../modules/workloads/daemonsets/api/api.const";
import { useGetDaemonSets } from "../modules/workloads/daemonsets/hooks/data-access/useGetDaemonSets";
import { QUERY_KEY_DEPLOYMENTS } from "../modules/workloads/deployments/api/api.const";
import { useGetDeployments } from "../modules/workloads/deployments/hooks/data-access/useGetDeployments";
import { QUERY_KEY_JOBS } from "../modules/workloads/jobs/api/api.const";
import { useGetJobs } from "../modules/workloads/jobs/hooks/data-access/useGetJobs";
import { QUERY_KEY_PODS } from "../modules/workloads/pods/api/api.const";
import { useGetPods } from "../modules/workloads/pods/hooks/data-access/useGetPods";
import { QUERY_KEY_REPLICASETS } from "../modules/workloads/replicasets/api/api.const";
import { useGetReplicaSets } from "../modules/workloads/replicasets/hooks/data-access/useGetReplicaSets";
import { QUERY_KEY_STATEFULSETS } from "../modules/workloads/statefulsets/api/api.const";
import { useGetStatefulSets } from "../modules/workloads/statefulsets/hooks/data-access/useGetStatefulSets";

const { eventsOnMock, resetRegistry } = vi.hoisted(() => {
  const registry: Record<string, (...args: unknown[]) => void> = {};
  const mock = vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    registry[event] = cb;
    return vi.fn(() => {
      delete registry[event];
    });
  });
  return {
    eventsOnMock: mock,
    resetRegistry: () => {
      for (const k of Object.keys(registry)) delete registry[k];
    },
  };
});

vi.mock("@wailsjs/runtime/runtime", () => ({ EventsOn: eventsOnMock }));

const listConfigMapsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listCronJobsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listDaemonSetsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listDeploymentsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listEndpointSlicesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listEndpointsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listEventsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listWarningEventsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listHPAsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listIngressesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listJobsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listLeasesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listLimitRangesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listNetworkPoliciesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listPersistentVolumeClaimsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listPodDisruptionBudgetsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listPodsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listReplicaSetsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listResourceQuotasMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listRoleBindingsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listRolesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listSecretsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listServiceAccountsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listServicesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listStatefulSetsMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("../modules/base/events/api/resources", () => ({
  ListEvents: listEventsMock,
  ListWarningEvents: listWarningEventsMock,
}));

vi.mock("../modules/accessControls/rolebindings/api/resources", () => ({
  ListRoleBindings: listRoleBindingsMock,
}));

vi.mock("../modules/accessControls/roles/api/resources", () => ({
  ListRoles: listRolesMock,
}));

vi.mock("../modules/accessControls/serviceaccounts/api/resources", () => ({
  ListServiceAccounts: listServiceAccountsMock,
}));

vi.mock("../modules/storages/pvcs/api/resources", () => ({
  ListPersistentVolumeClaims: listPersistentVolumeClaimsMock,
}));

vi.mock("../modules/networks/endpointslices/api/resources", () => ({
  ListEndpointSlices: listEndpointSlicesMock,
}));

vi.mock("../modules/networks/endpoints/api/resources", () => ({
  ListEndpoints: listEndpointsMock,
}));

vi.mock("../modules/networks/ingresses/api/resources", () => ({
  ListIngresses: listIngressesMock,
}));

vi.mock("../modules/networks/networkpolicies/api/resources", () => ({
  ListNetworkPolicies: listNetworkPoliciesMock,
}));

vi.mock("../modules/networks/services/api/resources", () => ({
  ListServices: listServicesMock,
}));

vi.mock("../modules/configs/configmaps/api/resources", () => ({
  ListConfigMaps: listConfigMapsMock,
}));

vi.mock("../modules/configs/hpas/api/resources", () => ({
  ListHPAs: listHPAsMock,
}));

vi.mock("../modules/configs/leases/api/resources", () => ({
  ListLeases: listLeasesMock,
}));

vi.mock("../modules/configs/limitranges/api/resources", () => ({
  ListLimitRanges: listLimitRangesMock,
}));

vi.mock("../modules/configs/pdbs/api/resources", () => ({
  ListPodDisruptionBudgets: listPodDisruptionBudgetsMock,
}));

vi.mock("../modules/configs/resourcequotas/api/resources", () => ({
  ListResourceQuotas: listResourceQuotasMock,
}));

vi.mock("../modules/configs/secrets/api/resources", () => ({
  ListSecrets: listSecretsMock,
}));

vi.mock("../modules/workloads/cronjobs/api/resources", () => ({
  ListCronJobs: listCronJobsMock,
}));

vi.mock("../modules/workloads/daemonsets/api/resources", () => ({
  ListDaemonSets: listDaemonSetsMock,
}));

vi.mock("../modules/workloads/deployments/api/resources", () => ({
  ListDeployments: listDeploymentsMock,
}));

vi.mock("../modules/workloads/jobs/api/resources", () => ({
  ListJobs: listJobsMock,
}));

vi.mock("../modules/workloads/pods/api/resources", () => ({
  ListPods: listPodsMock,
}));

vi.mock("../modules/workloads/replicasets/api/resources", () => ({
  ListReplicaSets: listReplicaSetsMock,
}));

vi.mock("../modules/workloads/statefulsets/api/resources", () => ({
  ListStatefulSets: listStatefulSetsMock,
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

describe("Namespace-scoped list hooks", () => {
  // Events/WarningEvents no longer own their EventsOn subscriptions — those are now handled
  // globally by useListenAllResourceEvents (Batch 5), so only fetch-gating is covered here.
  describe("useGetEvents", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEvents({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listEventsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEvents({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listEventsMock).toHaveBeenCalledWith();
    });
  });

  describe("useGetWarningEvents", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      expect(result.current.fetchStatus).toBe("idle");
      expect(listWarningEventsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["ns1"] }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listWarningEventsMock).toHaveBeenCalledWith();
    });

    it("queryFn sorts descending by CreatedAt", async () => {
      const events = Array.from({ length: 8 }, (_, i) => ({
        Name: `ev-${i}`,
        CreatedAt: i,
        Type: "Warning",
      }));
      listWarningEventsMock.mockResolvedValue(events);
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetWarningEvents({ context: "ctx", namespaces: ["ns1"] }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(8);
      expect(result.current.data![0].CreatedAt).toBe(7);
      expect(result.current.data![7].CreatedAt).toBe(0);
    });
  });

  // The following hooks no longer own their EventsOn subscriptions — those are now handled
  // globally by useListenAllResourceEvents (see that hook's own test), so only fetch-gating
  // behavior is covered here.
  describe("useGetPods", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPods({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listPodsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPods({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listPodsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetPods({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_PODS, { context: "ctx", namespaces: ["ns1"] }]);
    });
  });

  describe("useGetDeployments", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetDeployments({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listDeploymentsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetDeployments({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listDeploymentsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetDeployments({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_DEPLOYMENTS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetStatefulSets", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetStatefulSets({ context: "", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      expect(result.current.fetchStatus).toBe("idle");
      expect(listStatefulSetsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetStatefulSets({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listStatefulSetsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetStatefulSets({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_STATEFULSETS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetDaemonSets", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetDaemonSets({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listDaemonSetsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetDaemonSets({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listDaemonSetsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetDaemonSets({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_DAEMONSETS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetReplicaSets", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetReplicaSets({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listReplicaSetsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetReplicaSets({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listReplicaSetsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetReplicaSets({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_REPLICASETS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetJobs", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetJobs({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listJobsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetJobs({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listJobsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetJobs({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_JOBS, { context: "ctx", namespaces: ["ns1"] }]);
    });
  });

  describe("useGetConfigMaps", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetConfigMaps({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listConfigMapsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetConfigMaps({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listConfigMapsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetConfigMaps({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_CONFIGMAPS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetSecrets", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetSecrets({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listSecretsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetSecrets({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listSecretsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetSecrets({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_SECRETS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetPersistentVolumeClaims", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetPersistentVolumeClaims({ context: "", namespaces: ["ns1"] }),
        { wrapper }
      );
      expect(result.current.fetchStatus).toBe("idle");
      expect(listPersistentVolumeClaimsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetPersistentVolumeClaims({ context: "ctx", namespaces: ["ns1"] }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listPersistentVolumeClaimsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetPersistentVolumeClaims({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_PVCS, { context: "ctx", namespaces: ["ns1"] }]);
    });
  });

  describe("useGetResourceQuotas", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetResourceQuotas({ context: "", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      expect(result.current.fetchStatus).toBe("idle");
      expect(listResourceQuotasMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetResourceQuotas({ context: "ctx", namespaces: ["ns1"] }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listResourceQuotasMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetResourceQuotas({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_RESOURCE_QUOTAS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetLimitRanges", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetLimitRanges({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listLimitRangesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetLimitRanges({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listLimitRangesMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetLimitRanges({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_LIMIT_RANGES,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetCronJobs", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetCronJobs({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listCronJobsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetCronJobs({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listCronJobsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetCronJobs({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_CRONJOBS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  // The following hooks have their EventsOn subscriptions managed globally by
  // useListenAllResourceEvents, so only fetch-gating and queryKey are tested here.
  describe("useGetServices", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetServices({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listServicesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetServices({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listServicesMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetServices({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_SERVICES,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetIngresses", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetIngresses({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listIngressesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetIngresses({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listIngressesMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetIngresses({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_INGRESSES,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetEndpoints", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetEndpoints({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listEndpointsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetEndpoints({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listEndpointsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetEndpoints({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_ENDPOINTS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetEndpointSlices", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetEndpointSlices({ context: "", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      expect(result.current.fetchStatus).toBe("idle");
      expect(listEndpointSlicesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetEndpointSlices({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listEndpointSlicesMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetEndpointSlices({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_ENDPOINT_SLICES,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetNetworkPolicies", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetNetworkPolicies({ context: "", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      expect(result.current.fetchStatus).toBe("idle");
      expect(listNetworkPoliciesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetNetworkPolicies({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listNetworkPoliciesMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetNetworkPolicies({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_NETWORK_POLICIES,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetServiceAccounts", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetServiceAccounts({ context: "", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      expect(result.current.fetchStatus).toBe("idle");
      expect(listServiceAccountsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetServiceAccounts({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listServiceAccountsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetServiceAccounts({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_SERVICE_ACCOUNTS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  // The following hooks have their EventsOn subscriptions managed globally by
  // useListenAllResourceEvents (Batch 4), so only fetch-gating and queryKey are tested here.
  describe("useGetLeases", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetLeases({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listLeasesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetLeases({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listLeasesMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetLeases({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_LEASES,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetRoles", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetRoles({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listRolesMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetRoles({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listRolesMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetRoles({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_ROLES, { context: "ctx", namespaces: ["ns1"] }]);
    });
  });

  describe("useGetRoleBindings", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetRoleBindings({ context: "", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      expect(result.current.fetchStatus).toBe("idle");
      expect(listRoleBindingsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetRoleBindings({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listRoleBindingsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetRoleBindings({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([
        QUERY_KEY_ROLE_BINDINGS,
        { context: "ctx", namespaces: ["ns1"] },
      ]);
    });
  });

  describe("useGetHPAs", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetHPAs({ context: "", namespaces: ["ns1"] }), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
      expect(listHPAsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetHPAs({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listHPAsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetHPAs({ context: "ctx", namespaces: ["ns1"] }), { wrapper });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_HPAS, { context: "ctx", namespaces: ["ns1"] }]);
    });
  });

  describe("useGetPodDisruptionBudgets", () => {
    it("is disabled when context is empty", () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetPodDisruptionBudgets({ context: "", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      expect(result.current.fetchStatus).toBe("idle");
      expect(listPodDisruptionBudgetsMock).not.toHaveBeenCalled();
    });

    it("fetches when context is provided", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () => useGetPodDisruptionBudgets({ context: "ctx", namespaces: ["ns1"] }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(listPodDisruptionBudgetsMock).toHaveBeenCalledWith();
    });

    it("queryKey uses [KEY, { context, namespace }]", () => {
      const { wrapper, client } = makeWrapper();
      renderHook(() => useGetPodDisruptionBudgets({ context: "ctx", namespaces: ["ns1"] }), {
        wrapper,
      });
      const cache = client.getQueryCache().findAll();
      expect(cache[0].queryKey).toEqual([QUERY_KEY_PDBS, { context: "ctx", namespaces: ["ns1"] }]);
    });
  });
});
