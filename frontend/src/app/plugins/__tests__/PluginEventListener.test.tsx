import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { PluginEventListener } from "../PluginEventListener";

// Mock the hook
vi.mock("../hooks/registry/event/usePluginEventListener", () => ({
  usePluginEventListener: vi.fn(),
}));

describe("PluginEventListener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render without throwing", () => {
    expect(() => {
      render(<PluginEventListener />);
    }).not.toThrow();
  });

  it("should render null (no visual output)", () => {
    const { container } = render(<PluginEventListener />);
    expect(container.firstChild).toBeNull();
  });

  it("should mount before cluster connection (pre-cluster safety)", () => {
    // The component has no dependencies on cluster/tray providers,
    // so it can safely mount at the app root before MainLayout.
    // This test verifies it doesn't throw when those providers are missing.
    expect(() => {
      render(<PluginEventListener />);
    }).not.toThrow();
  });
});
