import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useGetDeployments } from "../modules/workloads/deployments/hooks/data-access/useGetDeployments";
import { useGetNodes } from "../modules/base/nodes/hooks/data-access/useGetNodes";
import { QUERY_KEY_DEPLOYMENTS } from "../modules/workloads/deployments/api/api.const";

type EventCallback = (...args: unknown[]) => void;

const { eventsOnMock, resetRegistry } = vi.hoisted(() => {
  const registry: Record<string, EventCallback> = {};
  const mock = vi.fn((event: string, cb: EventCallback) => {
    registry[event] = cb;
    return () => {
      delete registry[event];
    };
  });
  return {
    eventsOnMock: mock,
    resetRegistry: () => {
      for (const k of Object.keys(registry)) delete registry[k];
    },
  };
});

vi.mock("@wailsjs/runtime/runtime", () => ({
  EventsOn: eventsOnMock,
}));

const listDeploymentsMock = vi.hoisted(() => vi.fn());
const listNodesMock = vi.hoisted(() => vi.fn());

vi.mock("../modules/base/nodes/api/resources", () => ({
  ListNodes: listNodesMock,
}));

vi.mock("../modules/workloads/deployments/api/resources", () => ({
  ListDeployments: listDeploymentsMock,
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
  resetRegistry();
  eventsOnMock.mockClear();
  listDeploymentsMock.mockReset();
  listDeploymentsMock.mockResolvedValue([]);
  listNodesMock.mockReset();
  listNodesMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("List hook edge cases", () => {
  // NOTE: Deployments no longer manages EventsOn subscriptions at the data-access hook level.
  // EventsOn is now handled globally via useDeploymentsUpdateEvents — see
  // async-events/__tests__/useDeploymentsUpdateEvents.test.ts for that coverage.

  describe("2. Context change causes queryKey to change", () => {
    it("initialises a new query entry when context changes", async () => {
      const { client, wrapper } = makeWrapper();
      const { rerender } = renderHook(
        ({ ctx }: { ctx: string }) => useGetDeployments({ context: ctx, namespaces: ["ns"] }),
        { wrapper, initialProps: { ctx: "cluster-a" } }
      );
      await waitFor(() => {
        expect(
          client.getQueryState([
            QUERY_KEY_DEPLOYMENTS,
            { context: "cluster-a", namespaces: ["ns"] },
          ])
        ).toBeDefined();
      });
      rerender({ ctx: "cluster-b" });
      await waitFor(() => {
        expect(
          client.getQueryState([
            QUERY_KEY_DEPLOYMENTS,
            { context: "cluster-b", namespaces: ["ns"] },
          ])
        ).toBeDefined();
      });
    });
  });

  describe("5. Disabled state — queryFn not called when context is empty", () => {
    it("does not invoke ListDeployments when context is empty string", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetDeployments({ context: "", namespaces: ["ns"] }), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(listDeploymentsMock).not.toHaveBeenCalled();
    });

    it("does not invoke ListNodes when context is empty string", async () => {
      const { wrapper } = makeWrapper();
      renderHook(() => useGetNodes(""), { wrapper });
      await new Promise((r) => setTimeout(r, 20));
      expect(listNodesMock).not.toHaveBeenCalled();
    });
  });

  describe("6. Select transform applied to data", () => {
    it("returns only first item when select slices to length 1", async () => {
      listDeploymentsMock.mockResolvedValue([{ name: "d1" }, { name: "d2" }]);
      const { wrapper } = makeWrapper();
      const { result } = renderHook(
        () =>
          useGetDeployments(
            { context: "ctx", namespaces: [] },
            { select: (data) => (data ?? []).slice(0, 1) }
          ),
        { wrapper }
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([{ name: "d1" }]);
    });
  });

  // NOTE: Nodes hook no longer manages EventsOn subscriptions at the data-access hook level.
  // EventsOn is now handled globally via useNodesUpdateEvents (Batch 4) — see
  // async-events/__tests__/useNodesUpdateEvents.test.ts for that coverage.
});
