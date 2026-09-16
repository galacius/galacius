import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetEventDetail } from "../modules/base/events/hooks/data-access/useGetEventDetail";
import { useGetJobDetail } from "../modules/workloads/jobs/hooks/data-access/useGetJobDetail";
import { useGetReplicaSetDetail } from "../modules/workloads/replicasets/hooks/data-access/useGetReplicaSetDetail";
import { useGetRoleDetail } from "../modules/accessControls/roles/hooks/data-access/useGetRoleDetail";
import { useGetServiceAccountDetail } from "../modules/accessControls/serviceaccounts/hooks/data-access/useGetServiceAccountDetail";
import { useGetServiceDetail } from "../modules/networks/services/hooks/data-access/useGetServiceDetail";
import { useGetClusterRoleDetail } from "../modules/accessControls/clusterroles/hooks/data-access/useGetClusterRoleDetail";
import { useGetNamespaceDetail } from "../modules/base/namespaces/hooks/data-access/useGetNamespaceDetail";
import { QUERY_KEY_EVENT_DETAIL } from "../modules/base/events/api/api.const";
import { QUERY_KEY_NAMESPACE_DETAIL } from "../modules/base/namespaces/api/api.const";
import { QUERY_KEY_ROLE_DETAIL } from "../modules/accessControls/roles/api/api.const";
import { QUERY_KEY_SERVICE_ACCOUNT_DETAIL } from "../modules/accessControls/serviceaccounts/api/api.const";
import { QUERY_KEY_CLUSTER_ROLE_DETAIL } from "../modules/accessControls/clusterroles/api/api.const";
import { QUERY_KEY_JOB_DETAIL } from "../modules/workloads/jobs/api/api.const";
import { QUERY_KEY_REPLICASET_DETAIL } from "../modules/workloads/replicasets/api/api.const";
import { QUERY_KEY_SERVICE_DETAIL } from "../modules/networks/services/api/api.const";

const getEventByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getJobByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getReplicaSetByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getRoleByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getServiceAccountByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getServiceByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getClusterRoleByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getNamespaceByNameMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("../modules/base/events/api/resources", () => ({
  GetEventByName: getEventByNameMock,
  WatchEventDetail: vi.fn(),
  UnwatchEventDetail: vi.fn(),
}));

vi.mock("../modules/base/namespaces/api/resources", () => ({
  GetNamespaceByName: getNamespaceByNameMock,
  WatchNamespaceDetail: vi.fn(),
  UnwatchNamespaceDetail: vi.fn(),
}));

vi.mock("../modules/accessControls/roles/api/resources", () => ({
  GetRoleByName: getRoleByNameMock,
  WatchRoleDetail: vi.fn(),
  UnwatchRoleDetail: vi.fn(),
}));

vi.mock("../modules/accessControls/serviceaccounts/api/resources", () => ({
  GetServiceAccountByName: getServiceAccountByNameMock,
  WatchServiceAccountDetail: vi.fn(),
  UnwatchServiceAccountDetail: vi.fn(),
}));

vi.mock("../modules/accessControls/clusterroles/api/resources", () => ({
  GetClusterRoleByName: getClusterRoleByNameMock,
  WatchClusterRoleDetail: vi.fn(),
  UnwatchClusterRoleDetail: vi.fn(),
}));

vi.mock("../modules/workloads/jobs/api/resources", () => ({
  GetJobByName: getJobByNameMock,
  WatchJobDetail: vi.fn(),
  UnwatchJobDetail: vi.fn(),
}));

vi.mock("../modules/workloads/replicasets/api/resources", () => ({
  GetReplicaSetByName: getReplicaSetByNameMock,
  WatchReplicaSetDetail: vi.fn(),
  UnwatchReplicaSetDetail: vi.fn(),
}));

vi.mock("../modules/networks/services/api/resources", () => ({
  GetServiceByName: getServiceByNameMock,
  WatchServiceDetail: vi.fn(),
  UnwatchServiceDetail: vi.fn(),
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
});

type QueryResult = { fetchStatus: string; isSuccess: boolean };
type SignatureAHook = (ctx: string, ns: string, name: string) => QueryResult;

const signatureACases: Array<{
  name: string;
  hook: SignatureAHook;
  queryKey: string;
  mock: ReturnType<typeof vi.fn>;
}> = [
  {
    name: "useGetEventDetail",
    hook: (ctx, ns, name) => useGetEventDetail(ctx, ns, name),
    queryKey: QUERY_KEY_EVENT_DETAIL,
    mock: getEventByNameMock,
  },
  {
    name: "useGetJobDetail",
    hook: (ctx, ns, name) => useGetJobDetail(ctx, ns, name),
    queryKey: QUERY_KEY_JOB_DETAIL,
    mock: getJobByNameMock,
  },
  {
    name: "useGetReplicaSetDetail",
    hook: (ctx, ns, name) => useGetReplicaSetDetail(ctx, ns, name),
    queryKey: QUERY_KEY_REPLICASET_DETAIL,
    mock: getReplicaSetByNameMock,
  },
  {
    name: "useGetRoleDetail",
    hook: (ctx, ns, name) => useGetRoleDetail(ctx, ns, name),
    queryKey: QUERY_KEY_ROLE_DETAIL,
    mock: getRoleByNameMock,
  },
  {
    name: "useGetServiceAccountDetail",
    hook: (ctx, ns, name) => useGetServiceAccountDetail(ctx, ns, name),
    queryKey: QUERY_KEY_SERVICE_ACCOUNT_DETAIL,
    mock: getServiceAccountByNameMock,
  },
  {
    name: "useGetServiceDetail",
    hook: (ctx, ns, name) => useGetServiceDetail(ctx, ns, name),
    queryKey: QUERY_KEY_SERVICE_DETAIL,
    mock: getServiceByNameMock,
  },
];

describe("Detail hooks — Signature A (context, namespace, name)", () => {
  signatureACases.forEach(({ name, hook, queryKey, mock }) => {
    describe(name, () => {
      it("is disabled when context is empty", () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => hook("", "default", "res-1"), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
        expect(mock).not.toHaveBeenCalled();
      });

      it("is disabled when namespace is empty", () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => hook("ctx", "", "res-1"), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
        expect(mock).not.toHaveBeenCalled();
      });

      it("is disabled when name is empty", () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => hook("ctx", "default", ""), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
        expect(mock).not.toHaveBeenCalled();
      });

      it("fetches and calls queryFn with (namespace, name) when all params present", async () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => hook("ctx", "default", "res-1"), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mock).toHaveBeenCalledWith("default", "res-1");
      });

      it("queryKey is [KEY, { context, namespace, name }]", () => {
        const { wrapper, client } = makeWrapper();
        renderHook(() => hook("ctx", "default", "res-1"), { wrapper });
        const cache = client.getQueryCache().findAll();
        expect(cache[0].queryKey).toEqual([
          queryKey,
          { context: "ctx", namespace: "default", name: "res-1" },
        ]);
      });
    });
  });
});

type SignatureBHook = (ctx: string, name: string) => QueryResult;

const signatureBCases: Array<{
  name: string;
  hook: SignatureBHook;
  queryKey: string;
  mock: ReturnType<typeof vi.fn>;
}> = [
  {
    name: "useGetClusterRoleDetail",
    hook: (ctx, name) => useGetClusterRoleDetail(ctx, name),
    queryKey: QUERY_KEY_CLUSTER_ROLE_DETAIL,
    mock: getClusterRoleByNameMock,
  },
  {
    name: "useGetNamespaceDetail",
    hook: (ctx, name) => useGetNamespaceDetail(ctx, name),
    queryKey: QUERY_KEY_NAMESPACE_DETAIL,
    mock: getNamespaceByNameMock,
  },
];

describe("Detail hooks — Signature B (context, name)", () => {
  signatureBCases.forEach(({ name, hook, queryKey, mock }) => {
    describe(name, () => {
      it("is disabled when context is empty", () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => hook("", "res-1"), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
        expect(mock).not.toHaveBeenCalled();
      });

      it("is disabled when name is empty", () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => hook("ctx", ""), { wrapper });
        expect(result.current.fetchStatus).toBe("idle");
        expect(mock).not.toHaveBeenCalled();
      });

      it("fetches and calls queryFn with (name) when both params present", async () => {
        const { wrapper } = makeWrapper();
        const { result } = renderHook(() => hook("ctx", "res-1"), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(mock).toHaveBeenCalledWith("res-1");
      });

      it("queryKey is [KEY, { context, name }]", () => {
        const { wrapper, client } = makeWrapper();
        renderHook(() => hook("ctx", "res-1"), { wrapper });
        const cache = client.getQueryCache().findAll();
        expect(cache[0].queryKey).toEqual([queryKey, { context: "ctx", name: "res-1" }]);
      });
    });
  });
});
