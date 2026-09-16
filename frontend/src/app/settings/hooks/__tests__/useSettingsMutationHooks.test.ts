import { vi, describe, it, expect, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useSaveKubeconfigPaths } from "../data-mutation/useSaveKubeconfigPaths";
import { useSaveLocaleTimezone } from "../data-mutation/useSaveLocaleTimezone";
import { QUERY_KEY_SETTINGS } from "../../api/api.const";

const saveKubeconfigPathsMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const saveLocaleTimezoneMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@wailsjs/go/app/App", () => ({
  SaveKubeconfigPaths: saveKubeconfigPathsMock,
  SaveLocaleTimezone: saveLocaleTimezoneMock,
}));

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
    client,
  };
}

describe("useSaveKubeconfigPaths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls SaveKubeconfigPaths with the provided paths", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSaveKubeconfigPaths(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(["/home/.kube/config", "/custom/config"]);
    });
    expect(saveKubeconfigPathsMock).toHaveBeenCalledWith(["/home/.kube/config", "/custom/config"]);
  });

  it("invalidates QUERY_KEY_SETTINGS on success", async () => {
    const { wrapper, client } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveKubeconfigPaths(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(["/home/.kube/config"]);
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [QUERY_KEY_SETTINGS] });
  });

  it("reports success after mutation completes", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSaveKubeconfigPaths(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(["/home/.kube/config"]);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useSaveLocaleTimezone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls SaveLocaleTimezone with the provided timezone", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSaveLocaleTimezone(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("America/New_York");
    });
    expect(saveLocaleTimezoneMock).toHaveBeenCalledWith("America/New_York");
  });

  it("invalidates QUERY_KEY_SETTINGS on success", async () => {
    const { wrapper, client } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveLocaleTimezone(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("Europe/London");
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [QUERY_KEY_SETTINGS] });
  });

  it("reports success after mutation completes", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSaveLocaleTimezone(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("Asia/Tokyo");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
