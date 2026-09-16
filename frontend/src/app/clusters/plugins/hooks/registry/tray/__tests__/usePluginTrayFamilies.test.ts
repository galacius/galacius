import type { SharedUnifiedTrayContentProps } from "@galacius/core";
import { act, renderHook } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { pluginTrayRegistry } from "../pluginTrayRegistry";
import { usePluginTrayFamilies } from "../usePluginTrayFamilies";

const HelmTrayComponent = (() => null) as ComponentType<SharedUnifiedTrayContentProps>;
const KubeTrayComponent = (() => null) as ComponentType<SharedUnifiedTrayContentProps>;

describe("usePluginTrayFamilies", () => {
  beforeEach(() => {
    pluginTrayRegistry.clearTrayRegistry();
  });

  it("returns an empty map when nothing is registered", () => {
    const { result } = renderHook(() => usePluginTrayFamilies());
    expect(result.current).toEqual({});
  });

  it("merges families from a single plugin", () => {
    act(() =>
      pluginTrayRegistry.registerTrayFamilies("helm", {
        "helm-chart": HelmTrayComponent,
        "helm-chart-upgrade": HelmTrayComponent,
      })
    );
    const { result } = renderHook(() => usePluginTrayFamilies());

    expect(result.current).toEqual({
      "helm-chart": HelmTrayComponent,
      "helm-chart-upgrade": HelmTrayComponent,
    });
  });

  it("merges families across multiple plugins", () => {
    act(() => pluginTrayRegistry.registerTrayFamilies("helm", { "helm-chart": HelmTrayComponent }));
    act(() => pluginTrayRegistry.registerTrayFamilies("kube", { "kube-shell": KubeTrayComponent }));
    const { result } = renderHook(() => usePluginTrayFamilies());

    expect(result.current).toEqual({
      "helm-chart": HelmTrayComponent,
      "kube-shell": KubeTrayComponent,
    });
  });

  it("re-renders reactively when a plugin registers or unregisters", () => {
    const { result } = renderHook(() => usePluginTrayFamilies());
    expect(result.current).toEqual({});

    act(() => pluginTrayRegistry.registerTrayFamilies("helm", { "helm-chart": HelmTrayComponent }));
    expect(result.current).toEqual({ "helm-chart": HelmTrayComponent });

    act(() => pluginTrayRegistry.unregisterTrayFamilies("helm"));
    expect(result.current).toEqual({});
  });
});
