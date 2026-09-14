import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PluginResourceView } from "../PluginResourceView";
import { pluginViewRegistry } from "../hooks/registry/view/pluginViewRegistry";

const useGetInstalledPluginMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useGetInstalledPlugin", () => ({
  useGetInstalledPlugin: useGetInstalledPluginMock,
}));

// PluginResourceView computes its dynamic import URL deterministically from
// pluginId + bundleChecksum.substring(0, 8); mocking that exact literal URL
// simulates the plugin bundle module executing (and calling registerViews()
// as its own module-level side effect, same as a real plugin would).
vi.mock("/api/plugins/well-behaved-plugin/dist/index.js?v=def456", () => {
  pluginViewRegistry.registerViews("well-behaved-plugin", [
    {
      name: "well-behaved-view",
      component: () => <div data-testid="plugin-view">Hello from plugin</div>,
    },
  ]);
  return {};
});

vi.mock("/api/plugins/multi-view-plugin/dist/index.js?v=abc123", () => {
  pluginViewRegistry.registerViews("multi-view-plugin", [
    { name: "resource-a", component: () => <div data-testid="view-a">View A</div> },
    { name: "resource-b", component: () => <div data-testid="view-b">View B</div> },
  ]);
  return {};
});

vi.mock("/api/plugins/malformed-plugin/dist/index.js?v=abc123", () => {
  // Malformed bundle: module loads successfully but never calls registerViews().
  return {};
});

describe("PluginResourceView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginViewRegistry.clearViewRegistry();
  });

  afterEach(() => {
    pluginViewRegistry.clearViewRegistry();
  });

  it("throws and is caught by the error boundary when the plugin bundle never calls registerViews", async () => {
    useGetInstalledPluginMock.mockReturnValue({
      status: "READY",
      bundleChecksum: "abc123",
    });

    render(
      <PluginResourceView
        pluginId="malformed-plugin"
        pluginName="Malformed Plugin"
        isActive={true}
        activeResource="malformed-plugin-view"
        onGoToMarketplace={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId("plugin-view")).toBeNull();
      expect(document.body.textContent).not.toBe("");
    });
  });

  it("renders the registered component when the plugin bundle calls registerViews", async () => {
    useGetInstalledPluginMock.mockReturnValue({
      status: "READY",
      bundleChecksum: "def456",
    });

    render(
      <PluginResourceView
        pluginId="well-behaved-plugin"
        pluginName="Well Behaved Plugin"
        isActive={true}
        activeResource="well-behaved-view"
        onGoToMarketplace={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("plugin-view")).toBeTruthy();
    });
  });

  it("mounts every registered view but only shows the one matching activeResource", async () => {
    useGetInstalledPluginMock.mockReturnValue({
      status: "READY",
      bundleChecksum: "abc123",
    });

    render(
      <PluginResourceView
        pluginId="multi-view-plugin"
        pluginName="Multi View Plugin"
        isActive={true}
        activeResource="resource-b"
        onGoToMarketplace={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("view-a")).toBeTruthy();
      expect(screen.getByTestId("view-b")).toBeTruthy();
    });

    expect(screen.getByTestId("view-a").closest("div.hidden")).toBeTruthy();
    expect(screen.getByTestId("view-b").closest("div.contents")).toBeTruthy();
  });
});
