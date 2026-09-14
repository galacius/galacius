import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React, { type FC } from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

// Same @base-ui/react/dialog mock as design-system/src/atoms/__tests__/dialog.test.tsx,
// so the real Dialog/DialogContent components render their children directly in jsdom.
vi.mock("@base-ui/react/dialog", () => ({
  Dialog: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({ children, "data-slot": dataSlot }: any) => (
      <button data-slot={dataSlot}>{children}</button>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Backdrop: ({ children, className, "data-slot": dataSlot }: any) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    Popup: ({ children, className, "data-slot": dataSlot }: any) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    Close: ({ children, "data-slot": dataSlot, render: renderProp, ...rest }: any) => {
      if (renderProp) {
        return React.cloneElement(renderProp, { "data-slot": dataSlot, ...rest }, children);
      }
      return (
        <button data-slot={dataSlot} {...rest}>
          {children}
        </button>
      );
    },
    Title: ({ children, className, "data-slot": dataSlot }: any) => (
      <h2 className={className} data-slot={dataSlot}>
        {children}
      </h2>
    ),
    Description: ({ children, className, "data-slot": dataSlot }: any) => (
      <p className={className} data-slot={dataSlot}>
        {children}
      </p>
    ),
  },
}));

vi.mock("@wailsjs/go/app/App", () => ({
  ClipboardGetText: vi.fn(() => Promise.resolve("")),
}));

vi.mock("../shared/components/NamespaceMultiSelect", () => ({
  NamespaceMultiSelect: () => <div data-testid="namespace-multi-select" />,
}));

const useGetContextKubeconfigPathMock = vi.hoisted(() => vi.fn());
const useGetClusterProxyMock = vi.hoisted(() => vi.fn());
const useGetDefaultNamespacesMock = vi.hoisted(() => vi.fn());
const useGetNamespacesForContextMock = vi.hoisted(() => vi.fn());
const useSaveClusterProxyMock = vi.hoisted(() => vi.fn());
const useSaveDefaultNamespacesMock = vi.hoisted(() => vi.fn());
const useGetSettingsMock = vi.hoisted(() => vi.fn());

vi.mock("../../settings/hooks/data-access/useGetSettings", () => ({
  useGetSettings: useGetSettingsMock,
}));
vi.mock("../shared/hooks/data-access/useGetContextKubeconfigPath", () => ({
  useGetContextKubeconfigPath: useGetContextKubeconfigPathMock,
}));
vi.mock("../shared/hooks/data-access/useGetClusterProxy", () => ({
  useGetClusterProxy: useGetClusterProxyMock,
}));
vi.mock("../modules/base/namespaces/hooks/data-access/useGetDefaultNamespaces", () => ({
  useGetDefaultNamespaces: useGetDefaultNamespacesMock,
}));
vi.mock("../modules/base/namespaces/hooks/data-access/useGetNamespacesForContext", () => ({
  useGetNamespacesForContext: useGetNamespacesForContextMock,
}));
vi.mock("../shared/hooks/data-mutation/useSaveClusterProxy", () => ({
  useSaveClusterProxy: useSaveClusterProxyMock,
}));
vi.mock("../modules/base/namespaces/hooks/data-mutation/useSaveDefaultNamespaces", () => ({
  useSaveDefaultNamespaces: useSaveDefaultNamespacesMock,
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { ClusterSettingsModal } from "../ClusterSettingsModal";

// ─── fixtures ─────────────────────────────────────────────────────────────────

interface ClusterFixture {
  kubeconfigPath: string;
  httpProxy: string;
  defaultNamespaces: string[];
}

const MINIKUBE: ClusterFixture = {
  kubeconfigPath: "/Users/dev/.kube/config",
  httpProxy: "http://minikube-proxy.example.com:8080",
  defaultNamespaces: ["test", "test-galacius"],
};

const DOCKER_DESKTOP: ClusterFixture = {
  kubeconfigPath: "/Users/dev/.kube/config",
  httpProxy: "",
  defaultNamespaces: [],
};

/**
 * Simulates the fixture data TanStack Query would return for `contextName`,
 * mirroring how the real hooks resolve to per-context data via a query key
 * that includes `{ contextName }`.
 */
function mockHooksForContext(contextName: string | null, fixture: ClusterFixture) {
  useGetContextKubeconfigPathMock.mockImplementation((ctx: string | null) => ({
    data: ctx === contextName ? fixture.kubeconfigPath : undefined,
  }));
  useGetClusterProxyMock.mockImplementation((ctx: string | null) => ({
    data: ctx === contextName ? { httpProxy: fixture.httpProxy } : undefined,
  }));
  useGetDefaultNamespacesMock.mockImplementation((ctx: string | null) => ({
    data: ctx === contextName ? fixture.defaultNamespaces : undefined,
  }));
  useGetNamespacesForContextMock.mockImplementation(() => ({
    data: [],
    isLoading: false,
    error: null,
  }));
  useSaveClusterProxyMock.mockReturnValue({ mutate: vi.fn() });
  useSaveDefaultNamespacesMock.mockReturnValue({ mutate: vi.fn() });
  useGetSettingsMock.mockReturnValue({ data: { proxySetupEnabled: true } });
}

function getProxyInput() {
  return screen.getByLabelText("HTTP Proxy") as HTMLInputElement;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("ClusterSettingsModal", () => {
  it("shows the connected cluster's own proxy and default namespaces", () => {
    mockHooksForContext("minikube", MINIKUBE);
    render(<ClusterSettingsModal contextName="minikube" onClose={vi.fn()} />);

    expect(screen.getByText("Cluster Settings — minikube")).toBeInTheDocument();
    expect(getProxyInput().value).toBe(MINIKUBE.httpProxy);
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("test-galacius")).toBeInTheDocument();
  });

  // Regression test for the bug where switching clusters left the modal
  // showing the *previous* cluster's proxy/default-namespaces values.
  //
  // The App only fixes this by remounting ClusterSettingsModal itself
  // (`key={clusterSettingsCtx ?? "closed"}` on its usage site in App.tsx) —
  // a `key` prop only resets state belonging to the element it's attached to,
  // so this must key the *ClusterSettingsModal instance*, not something
  // inside its own render tree. This test simulates that remount the same
  // way App.tsx does: a wrapper component re-keyed by `contextName`.
  describe("switching clusters (regression: stale values must not carry over)", () => {
    const Wrapper: FC<{ contextName: string | null }> = ({ contextName }) => (
      <ClusterSettingsModal
        key={contextName ?? "closed"}
        contextName={contextName}
        onClose={vi.fn()}
      />
    );

    it("does not show the previous cluster's default namespaces after switching (bug repro)", () => {
      mockHooksForContext("minikube", MINIKUBE);
      const { rerender } = render(<Wrapper contextName="minikube" />);
      expect(screen.getByText("test")).toBeInTheDocument();
      expect(screen.getByText("test-galacius")).toBeInTheDocument();

      mockHooksForContext("docker-desktop", DOCKER_DESKTOP);
      rerender(<Wrapper contextName="docker-desktop" />);

      expect(screen.getByText("Cluster Settings — docker-desktop")).toBeInTheDocument();
      expect(screen.queryByText("test")).not.toBeInTheDocument();
      expect(screen.queryByText("test-galacius")).not.toBeInTheDocument();
    });

    it("does not show the previous cluster's proxy value after switching (bug repro)", () => {
      mockHooksForContext("minikube", MINIKUBE);
      const { rerender } = render(<Wrapper contextName="minikube" />);
      expect(getProxyInput().value).toBe(MINIKUBE.httpProxy);

      mockHooksForContext("docker-desktop", DOCKER_DESKTOP);
      rerender(<Wrapper contextName="docker-desktop" />);

      expect(getProxyInput().value).toBe("");
    });

    it("resets to the new cluster's own values when reopened for a different cluster after closing", () => {
      mockHooksForContext("minikube", MINIKUBE);
      const { rerender } = render(<Wrapper contextName="minikube" />);
      expect(getProxyInput().value).toBe(MINIKUBE.httpProxy);

      // close
      mockHooksForContext(null, DOCKER_DESKTOP);
      rerender(<Wrapper contextName={null} />);

      // reopen for a different cluster
      mockHooksForContext("docker-desktop", DOCKER_DESKTOP);
      rerender(<Wrapper contextName="docker-desktop" />);

      expect(getProxyInput().value).toBe("");
      expect(screen.queryByText("test")).not.toBeInTheDocument();
    });
  });

  // Documents the actual root cause: without a remount forced by a changing
  // `key` at the usage site, ClusterSettingsModal's own local state sync
  // (guarded by `loadedContextName`) locks in stale data. In production,
  // TanStack Query's `placeholderData: keepPreviousData` (frontend/src/app/
  // shared/api/api.ts) means the proxy/namespaces queries still resolve to
  // the *previous* cluster's cached data for one or more renders right after
  // `contextName` changes, before the fresh data for the new cluster loads —
  // this test models exactly that two-phase resolution on the *same*
  // component instance (mirroring what would happen if App.tsx's
  // `key={clusterSettingsCtx ?? "closed"}` were removed).
  it("root cause: sync guard locks in placeholder (previous cluster) data before fresh data ever arrives", () => {
    mockHooksForContext("minikube", MINIKUBE);
    const { rerender } = render(<ClusterSettingsModal contextName="minikube" onClose={vi.fn()} />);
    expect(getProxyInput().value).toBe(MINIKUBE.httpProxy);

    // contextName switches to docker-desktop, but the queries still resolve
    // with minikube's cached data as a `keepPreviousData` placeholder.
    useGetClusterProxyMock.mockImplementation((ctx: string | null) => ({
      data: ctx === "docker-desktop" ? { httpProxy: MINIKUBE.httpProxy } : undefined,
    }));
    useGetDefaultNamespacesMock.mockImplementation((ctx: string | null) => ({
      data: ctx === "docker-desktop" ? MINIKUBE.defaultNamespaces : undefined,
    }));
    rerender(<ClusterSettingsModal contextName="docker-desktop" onClose={vi.fn()} />);

    // The sync guard fires (contextName !== loadedContextName) on the
    // placeholder data, locking minikube's stale proxy value in under the
    // docker-desktop label and marking loadedContextName as "docker-desktop".
    expect(screen.getByText("Cluster Settings — docker-desktop")).toBeInTheDocument();
    expect(getProxyInput().value).toBe(MINIKUBE.httpProxy);

    // The real docker-desktop data eventually resolves...
    mockHooksForContext("docker-desktop", DOCKER_DESKTOP);
    rerender(<ClusterSettingsModal contextName="docker-desktop" onClose={vi.fn()} />);

    // ...but loadedContextName already equals "docker-desktop", so the guard
    // blocks re-sync — the stale value from the placeholder render sticks.
    expect(getProxyInput().value).toBe(MINIKUBE.httpProxy);
  });
});
