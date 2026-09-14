import "@testing-library/jest-dom/vitest";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// ─── hoisted mocks ───────────────────────────────────────────────────────────

const useGetSettingsMock = vi.hoisted(() => vi.fn());
const useGetActiveKubeconfigPathsMock = vi.hoisted(() => vi.fn());
const saveKubeconfigPathsMock = vi.hoisted(() => vi.fn());
const pickKubeconfigPathMock = vi.hoisted(() => vi.fn());
const renderSuccessToastMock = vi.hoisted(() => vi.fn());

vi.mock("../../hooks/data-access/useGetSettings", () => ({
  useGetSettings: useGetSettingsMock,
}));

vi.mock("../../hooks/data-access/useGetActiveKubeconfigPaths", () => ({
  useGetActiveKubeconfigPaths: useGetActiveKubeconfigPathsMock,
}));

vi.mock("../../hooks/data-mutation/useSaveKubeconfigPaths", () => ({
  useSaveKubeconfigPaths: () => ({ mutate: saveKubeconfigPathsMock }),
}));

vi.mock("@wailsjs/go/app/App", () => ({
  PickKubeconfigPath: pickKubeconfigPathMock,
}));

vi.mock("@galacius/design-system", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    renderSuccessToast: renderSuccessToastMock,
  };
});

// ─── imports after mocks ──────────────────────────────────────────────────────

import { K8sContent } from "../K8sContent";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function renderK8s() {
  return render(<K8sContent />, { wrapper: makeWrapper() });
}

// ─── setup ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  useGetSettingsMock.mockReturnValue({
    data: { kubeconfigPaths: ["/home/.kube/config"], locale: "UTC" },
  });
  useGetActiveKubeconfigPathsMock.mockReturnValue({ data: ["/home/.kube/config"] });
  pickKubeconfigPathMock.mockResolvedValue("");
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe("K8sContent", () => {
  describe("empty state", () => {
    it('shows "No kubeconfig files synced." when paths list is empty', () => {
      useGetSettingsMock.mockReturnValue({ data: { kubeconfigPaths: [], locale: "UTC" } });
      renderK8s();
      expect(screen.getByText("No kubeconfig files synced.")).toBeInTheDocument();
    });
  });

  describe("paths list", () => {
    it("renders each saved kubeconfig path", () => {
      useGetSettingsMock.mockReturnValue({
        data: { kubeconfigPaths: ["/home/.kube/config", "/etc/kubeconfig"], locale: "UTC" },
      });
      useGetActiveKubeconfigPathsMock.mockReturnValue({
        data: ["/home/.kube/config", "/etc/kubeconfig"],
      });
      renderK8s();
      expect(screen.getByText("/home/.kube/config")).toBeInTheDocument();
      expect(screen.getByText("/etc/kubeconfig")).toBeInTheDocument();
    });

    it("shows remove button only for paths NOT in activePaths", () => {
      useGetSettingsMock.mockReturnValue({
        data: { kubeconfigPaths: ["/home/.kube/config", "/custom/config"], locale: "UTC" },
      });
      useGetActiveKubeconfigPathsMock.mockReturnValue({ data: ["/home/.kube/config"] });
      renderK8s();
      // /home/.kube/config is active → no remove button
      // /custom/config is not active → remove button shown
      expect(screen.getByRole("button", { name: /remove \/custom\/config/i })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /remove \/home\/.kube\/config/i })
      ).not.toBeInTheDocument();
    });

    it("calls saveKubeconfigPaths without the removed path on remove click", () => {
      useGetSettingsMock.mockReturnValue({
        data: { kubeconfigPaths: ["/home/.kube/config", "/custom/config"], locale: "UTC" },
      });
      useGetActiveKubeconfigPathsMock.mockReturnValue({ data: ["/home/.kube/config"] });
      renderK8s();
      fireEvent.click(screen.getByRole("button", { name: /remove \/custom\/config/i }));
      expect(saveKubeconfigPathsMock).toHaveBeenCalledWith(
        ["/home/.kube/config"],
        expect.any(Object)
      );
    });
  });

  describe("seeding behavior", () => {
    it("seeds with activePaths when settings.kubeconfigPaths is empty and activePaths is non-empty", async () => {
      useGetSettingsMock.mockReturnValue({ data: { kubeconfigPaths: [], locale: "UTC" } });
      useGetActiveKubeconfigPathsMock.mockReturnValue({ data: ["/active/path"] });
      renderK8s();
      await waitFor(() => expect(saveKubeconfigPathsMock).toHaveBeenCalledWith(["/active/path"]));
    });

    it("does not seed when settings.kubeconfigPaths already has paths", () => {
      useGetSettingsMock.mockReturnValue({
        data: { kubeconfigPaths: ["/existing/path"], locale: "UTC" },
      });
      useGetActiveKubeconfigPathsMock.mockReturnValue({ data: ["/active/path"] });
      renderK8s();
      expect(saveKubeconfigPathsMock).not.toHaveBeenCalled();
    });

    it("does not seed when activePaths is empty", () => {
      useGetSettingsMock.mockReturnValue({ data: { kubeconfigPaths: [], locale: "UTC" } });
      useGetActiveKubeconfigPathsMock.mockReturnValue({ data: [] });
      renderK8s();
      expect(saveKubeconfigPathsMock).not.toHaveBeenCalled();
    });

    it("does not seed when settings is undefined", () => {
      useGetSettingsMock.mockReturnValue({ data: undefined });
      useGetActiveKubeconfigPathsMock.mockReturnValue({ data: ["/active/path"] });
      renderK8s();
      expect(saveKubeconfigPathsMock).not.toHaveBeenCalled();
    });
  });

  describe("Sync Files button", () => {
    it("calls PickKubeconfigPath when sync button is clicked", async () => {
      renderK8s();
      fireEvent.click(screen.getByRole("button", { name: /sync files/i }));
      await waitFor(() => expect(pickKubeconfigPathMock).toHaveBeenCalledTimes(1));
    });

    it("adds picked path to the list and saves", async () => {
      pickKubeconfigPathMock.mockResolvedValue("/picked/new.yaml");
      renderK8s();
      fireEvent.click(screen.getByRole("button", { name: /sync files/i }));
      await waitFor(() =>
        expect(saveKubeconfigPathsMock).toHaveBeenCalledWith(
          ["/home/.kube/config", "/picked/new.yaml"],
          expect.any(Object)
        )
      );
    });

    it("does not add path if picker returns empty string", async () => {
      pickKubeconfigPathMock.mockResolvedValue("");
      renderK8s();
      fireEvent.click(screen.getByRole("button", { name: /sync files/i }));
      await waitFor(() => expect(pickKubeconfigPathMock).toHaveBeenCalled());
      expect(saveKubeconfigPathsMock).not.toHaveBeenCalled();
    });

    it("does not add path if it already exists in the list", async () => {
      pickKubeconfigPathMock.mockResolvedValue("/home/.kube/config");
      renderK8s();
      fireEvent.click(screen.getByRole("button", { name: /sync files/i }));
      await waitFor(() => expect(pickKubeconfigPathMock).toHaveBeenCalled());
      expect(saveKubeconfigPathsMock).not.toHaveBeenCalled();
    });

    it("does not add path if picker throws", async () => {
      pickKubeconfigPathMock.mockRejectedValue(new Error("cancelled"));
      renderK8s();
      fireEvent.click(screen.getByRole("button", { name: /sync files/i }));
      await waitFor(() => expect(pickKubeconfigPathMock).toHaveBeenCalled());
      expect(saveKubeconfigPathsMock).not.toHaveBeenCalled();
    });
  });
});
