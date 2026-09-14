/**
 * Tests for useCatchForbiddenResources — the multi-resource variant used by
 * callers (e.g. OverviewView) that aggregate several resource kinds at once,
 * rather than a single active resource list view (see useCatchForbiddenResource
 * for that case).
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCatchForbiddenResources } from "../useCatchForbiddenResources";

// ─── Wails runtime mock ───────────────────────────────────────────────────────
type EventHandler = (payload: { resource: string; namespace: string }) => void;

const { getHandler, setHandler } = vi.hoisted(() => {
  let _handler: EventHandler | null = null;
  return {
    getHandler: () => _handler,
    setHandler: (h: EventHandler | null) => {
      _handler = h;
    },
  };
});

vi.mock("@wailsjs/runtime/runtime", () => ({
  EventsOn: vi.fn((_eventName: string, handler: EventHandler) => {
    setHandler(handler);
    return () => setHandler(null);
  }),
}));

// ─── Wails Go binding mock ────────────────────────────────────────────────────
const isResourceForbiddenMock = vi.hoisted(() => vi.fn().mockResolvedValue(false));
vi.mock("@wailsjs/go/app/App", () => ({
  IsResourceForbidden: isResourceForbiddenMock,
}));

// ─── Toast mocks ──────────────────────────────────────────────────────────────
const ErrorToastSpy = vi.hoisted(() => vi.fn(({ title }: { title: string }) => title));
vi.mock("@galacius/design-system", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    renderErrorToast: ErrorToastSpy,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fireForbiddenEvent(resource: string, namespace = "") {
  act(() => {
    getHandler()?.({ resource, namespace });
  });
}

const LABEL_MAP: Record<string, string> = {
  pods: "Pods",
  deployments: "Deployments",
  nodes: "Nodes",
  services: "Services",
  cronjobs: "CronJobs",
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("useCatchForbiddenResources", () => {
  beforeEach(() => {
    setHandler(null);
    ErrorToastSpy.mockClear();
    isResourceForbiddenMock.mockClear();
  });

  describe("live event handling", () => {
    it("shows a toast when the event resource is in the watched array", () => {
      renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments", "nodes"], {
          labelMap: LABEL_MAP,
        })
      );

      fireForbiddenEvent("deployments");

      expect(ErrorToastSpy).toHaveBeenCalledOnce();
      expect(ErrorToastSpy).toHaveBeenCalledWith({
        title: "Access denied: cannot list Deployments",
      });
    });

    it("toasts for multiple events in the array", () => {
      renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments"], {
          labelMap: LABEL_MAP,
        })
      );

      fireForbiddenEvent("pods");
      fireForbiddenEvent("deployments");

      expect(ErrorToastSpy).toHaveBeenCalledTimes(2);
      expect(ErrorToastSpy).toHaveBeenNthCalledWith(1, {
        title: "Access denied: cannot list Pods",
      });
      expect(ErrorToastSpy).toHaveBeenNthCalledWith(2, {
        title: "Access denied: cannot list Deployments",
      });
    });

    it("includes the namespace in the toast when the event carries one", () => {
      renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments", "nodes"], {
          labelMap: LABEL_MAP,
        })
      );

      fireForbiddenEvent("deployments", "ns-b");

      expect(ErrorToastSpy).toHaveBeenCalledWith({
        title: 'Access denied: cannot list Deployments in namespace "ns-b"',
      });
    });

    it("omits the namespace clause for a cluster-wide denial", () => {
      renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments", "nodes"], {
          labelMap: LABEL_MAP,
        })
      );

      fireForbiddenEvent("deployments", "");

      expect(ErrorToastSpy).toHaveBeenCalledWith({
        title: "Access denied: cannot list Deployments",
      });
    });

    it("does NOT toast for an event not in the array, but still records it", () => {
      const { result } = renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments"], {
          labelMap: LABEL_MAP,
        })
      );

      fireForbiddenEvent("services");

      expect(ErrorToastSpy).not.toHaveBeenCalled();
      expect(result.current.forbiddenResources.has("services")).toBe(true);
    });

    it("falls back to the raw resource name when the label is missing from labelMap", () => {
      renderHook(() => useCatchForbiddenResources(["unknown-kind"], { labelMap: LABEL_MAP }));

      fireForbiddenEvent("unknown-kind");

      expect(ErrorToastSpy).toHaveBeenCalledWith({
        title: "Access denied: cannot list unknown-kind",
      });
    });

    it("resets forbidden state when activeContext changes", () => {
      const { result, rerender } = renderHook(
        ({ context }: { context?: string }) =>
          useCatchForbiddenResources(["pods", "deployments"], {
            labelMap: LABEL_MAP,
            activeContext: context,
          }),
        { initialProps: { context: "cluster1" } }
      );

      fireForbiddenEvent("pods");
      expect(result.current.forbiddenResources.has("pods")).toBe(true);

      rerender({ context: "cluster2" });
      expect(result.current.forbiddenResources.size).toBe(0);
    });
  });

  describe("Namespace scoping (aggregated dashboard views)", () => {
    it("does not toast when a namespace outside the viewed set is forbidden", () => {
      renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments"], {
          labelMap: LABEL_MAP,
          namespaces: ["ns-a"],
        })
      );

      fireForbiddenEvent("deployments", "ns-b");

      expect(ErrorToastSpy).not.toHaveBeenCalled();
    });

    it("toasts when a namespace within the viewed set is forbidden", () => {
      renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments"], {
          labelMap: LABEL_MAP,
          namespaces: ["ns-a", "ns-b"],
        })
      );

      fireForbiddenEvent("deployments", "ns-b");

      expect(ErrorToastSpy).toHaveBeenCalledWith({
        title: 'Access denied: cannot list Deployments in namespace "ns-b"',
      });
    });

    it("toasts on a cluster-wide denial regardless of the viewed namespace set", () => {
      renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments"], {
          labelMap: LABEL_MAP,
          namespaces: ["ns-a"],
        })
      );

      fireForbiddenEvent("deployments", "");

      expect(ErrorToastSpy).toHaveBeenCalledWith({
        title: "Access denied: cannot list Deployments",
      });
    });

    it("polls each viewed namespace at mount and toasts only for the forbidden one", async () => {
      isResourceForbiddenMock.mockImplementation((resource: string, namespace: string) =>
        Promise.resolve(resource === "deployments" && namespace === "ns-b")
      );

      renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments"], {
          labelMap: LABEL_MAP,
          namespaces: ["ns-a", "ns-b"],
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(isResourceForbiddenMock).toHaveBeenCalledWith("deployments", "ns-a");
      expect(isResourceForbiddenMock).toHaveBeenCalledWith("deployments", "ns-b");
      expect(ErrorToastSpy).toHaveBeenCalledOnce();
      expect(ErrorToastSpy).toHaveBeenCalledWith({
        title: 'Access denied: cannot list Deployments in namespace "ns-b"',
      });
    });
  });

  describe("mount-time poll", () => {
    it("toasts for resources already forbidden at mount", async () => {
      isResourceForbiddenMock.mockImplementation((resource: string) => {
        return Promise.resolve(resource === "deployments");
      });

      const { result } = renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments", "cronjobs"], {
          labelMap: LABEL_MAP,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(ErrorToastSpy).toHaveBeenCalledOnce();
      expect(ErrorToastSpy).toHaveBeenCalledWith({
        title: "Access denied: cannot list Deployments",
      });
      expect(result.current.forbiddenResources.has("deployments")).toBe(true);
    });

    it("does not toast twice when both the mount-time poll and a live event find the same resource", async () => {
      isResourceForbiddenMock.mockImplementation((resource: string) =>
        Promise.resolve(resource === "pods")
      );

      renderHook(() =>
        useCatchForbiddenResources(["pods", "deployments"], {
          labelMap: LABEL_MAP,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(ErrorToastSpy).toHaveBeenCalledOnce();
      ErrorToastSpy.mockClear();

      fireForbiddenEvent("pods");

      expect(ErrorToastSpy).not.toHaveBeenCalled();
    });
  });
});
