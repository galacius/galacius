import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useGetDeploymentDetail } from "../modules/workloads/deployments/hooks/data-access/useGetDeploymentDetail";
import { useGetNodeDetail } from "../modules/base/nodes/hooks/data-access/useGetNodeDetail";
import { QUERY_KEY_NODE_DETAIL } from "../modules/base/nodes/api/api.const";
import { QUERY_KEY_DEPLOYMENT_DETAIL } from "../modules/workloads/deployments/api/api.const";

const getDeploymentByNameMock = vi.hoisted(() => vi.fn());
const getNodeByNameMock = vi.hoisted(() => vi.fn());

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

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children),
  };
}

beforeEach(() => {
  getDeploymentByNameMock.mockResolvedValue({ name: "deploy-x" });
  getNodeByNameMock.mockResolvedValue({ name: "node-x" });
});

describe("Detail hook edge cases", () => {
  describe("1. empty namespace only — hook disabled", () => {
    it("does not call queryFn when namespace is empty", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetDeploymentDetail("ctx", "", "my-deploy"), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(getDeploymentByNameMock).not.toHaveBeenCalled();
    });
  });

  describe("2. empty name only — hook disabled", () => {
    it("does not call queryFn when name is empty", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetDeploymentDetail("ctx", "default", ""), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(getDeploymentByNameMock).not.toHaveBeenCalled();
    });
  });

  describe("3. Both empty — hook disabled", () => {
    it("does not call queryFn when namespace and name are both empty", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetDeploymentDetail("ctx", "", ""), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(getDeploymentByNameMock).not.toHaveBeenCalled();
    });
  });

  describe("4. Context empty string — hook disabled", () => {
    it("does not call queryFn when context is empty string", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetDeploymentDetail("", "default", "my-deploy"), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(getDeploymentByNameMock).not.toHaveBeenCalled();
    });

    it("node detail also disabled when context is empty", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetNodeDetail("", "my-node"), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(getNodeByNameMock).not.toHaveBeenCalled();
    });
  });

  describe("5. All present — queryFn fires with correct args", () => {
    it("calls GetDeploymentByName with namespace! and name! when all params present", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetDeploymentDetail("ctx", "default", "my-deploy"), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(getDeploymentByNameMock).toHaveBeenCalledWith("default", "my-deploy");
    });

    it("calls GetNodeByName with name! when context and name are present", async () => {
      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetNodeDetail("ctx", "node-1"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(getNodeByNameMock).toHaveBeenCalledWith("node-1");
    });
  });

  describe("6. queryKey correctness — empty string values preserved", () => {
    it("queryKey contains empty string for namespace when empty passed", async () => {
      const { client, wrapper } = makeWrapper();
      renderHook(() => useGetDeploymentDetail("ctx", "", "my-deploy"), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      const state = client.getQueryState([
        QUERY_KEY_DEPLOYMENT_DETAIL,
        { context: "ctx", namespace: "", name: "my-deploy" },
      ]);
      expect(state).toBeDefined();
    });

    it("queryKey contains empty string for name when empty passed", async () => {
      const { client, wrapper } = makeWrapper();
      renderHook(() => useGetDeploymentDetail("ctx", "default", ""), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      const state = client.getQueryState([
        QUERY_KEY_DEPLOYMENT_DETAIL,
        { context: "ctx", namespace: "default", name: "" },
      ]);
      expect(state).toBeDefined();
    });

    it("node detail queryKey contains empty string for name when empty passed", async () => {
      const { client, wrapper } = makeWrapper();
      renderHook(() => useGetNodeDetail("ctx", ""), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      const state = client.getQueryState([QUERY_KEY_NODE_DETAIL, { context: "ctx", name: "" }]);
      expect(state).toBeDefined();
    });
  });
});
