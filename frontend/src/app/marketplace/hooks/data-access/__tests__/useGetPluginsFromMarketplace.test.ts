import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useGetPluginsFromMarketplace } from "../useGetPluginsFromMarketplace";

const GetPluginsFromMarketplaceMock = vi.hoisted(() => vi.fn());

vi.mock("@wailsjs/go/app/App", () => ({
  GetPluginsFromMarketplace: GetPluginsFromMarketplaceMock,
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

describe("useGetPluginsFromMarketplace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockManifest = {
    id: "helm",
    name: "Helm",
    description: "Helm plugin",
    version: "3.15.0",
    repository: "galacius/plugin-helm",
    minimumHostVersion: "0.1.0",
    maximumHostVersion: "99.99.99",
    os: { linux: ["x86_64"], darwin: ["x86_64"], windows: ["amd64"] },
    bundle: { sha256: "abc123", size: 50000000 },
    binary: { sha256: "def456", size: 10000000 },
    capabilities: [],
  };

  describe("Success cases", () => {
    it("should return manifests when fetch succeeds with no errors", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue({
        manifests: [mockManifest],
        errors: {},
      });

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([mockManifest]);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should return manifests when both manifests and errors exist (partial failure)", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue({
        manifests: [mockManifest],
        errors: { "some-other-plugin": "Failed to fetch" }, // different plugin errored
      });

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([mockManifest]);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should return empty array when manifests and errors are both empty (genuinely zero plugins)", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue({
        manifests: [],
        errors: {},
      });

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should return manifests when errors object is null/undefined", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue({
        manifests: [mockManifest],
        errors: undefined,
      });

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([mockManifest]);
      expect(result.current.isError).toBe(false);
    });

    it("should return manifests when manifests is null/undefined but no errors", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue({
        manifests: undefined,
        errors: {},
      });

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isError).toBe(false);
    });
  });

  describe("Error cases (original bug now fixed)", () => {
    it("should throw error when manifests empty AND errors non-empty (genuine fetch failure)", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue({
        manifests: [],
        errors: { helm: "401 Unauthorized: invalid GitHub Access Token" },
      });

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain("Failed to fetch plugin marketplace:");
      expect(result.current.error?.message).toContain("helm:");
      expect(result.current.error?.message).toContain("401 Unauthorized");
      expect(result.current.data).toBeUndefined();
    });

    it("should throw error with all error messages when multiple plugins fail", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue({
        manifests: [],
        errors: {
          helm: "Failed to fetch release",
          "other-plugin": "Manifest not found",
        },
      });

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toContain("helm: Failed to fetch release");
      expect(result.current.error?.message).toContain("other-plugin: Manifest not found");
    });

    it("should throw error when backend returns null", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue(null);

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toContain("no response from backend");
    });

    it("should throw error when backend throws exception", async () => {
      GetPluginsFromMarketplaceMock.mockRejectedValue(new Error("Network timeout"));

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toContain("Network timeout");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty error messages gracefully", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue({
        manifests: [],
        errors: { helm: "" },
      });

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toContain("Failed to fetch plugin marketplace:");
    });

    it("should correctly identify partial failure: 1 manifest + 1 error", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue({
        manifests: [mockManifest],
        errors: { "failed-plugin": "Some error" },
      });

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Partial success: should NOT throw, manifests.length > 0
      expect(result.current.isError).toBe(false);
      expect(result.current.data).toEqual([mockManifest]);
    });

    it("should not throw when only manifests are returned (backward compat)", async () => {
      GetPluginsFromMarketplaceMock.mockResolvedValue({
        manifests: [mockManifest],
      });

      const { wrapper } = makeWrapper();
      const { result } = renderHook(() => useGetPluginsFromMarketplace(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.data).toEqual([mockManifest]);
    });
  });
});
