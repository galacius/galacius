import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureAppWidePluginSnapshot,
  restoreAppWidePluginSnapshot,
} from "../pluginAppWideAssetSnapshot";

const getStylesheetsMock = vi.hoisted(() => vi.fn());
const registerStylesheetsMock = vi.hoisted(() => vi.fn());
const getSettingsTabMock = vi.hoisted(() => vi.fn());
const registerSettingsTabMock = vi.hoisted(() => vi.fn());
const getFooterWidgetMock = vi.hoisted(() => vi.fn());
const registerFooterWidgetMock = vi.hoisted(() => vi.fn());
const subscribeFooterWidgetUnregisterMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/registry/stylesheet/pluginStylesheetRegistry", () => ({
  pluginStylesheetRegistry: {
    getStylesheets: getStylesheetsMock,
    registerStylesheets: registerStylesheetsMock,
  },
}));

vi.mock("../hooks/registry/settings/pluginSettingsRegistry", () => ({
  pluginSettingsRegistry: {
    getSettingsTab: getSettingsTabMock,
    registerSettingsTab: registerSettingsTabMock,
  },
}));

vi.mock("../hooks/registry/footer/pluginFooterRegistry", () => ({
  pluginFooterRegistry: {
    getFooterWidget: getFooterWidgetMock,
    registerFooterWidget: registerFooterWidgetMock,
    subscribeFooterWidgetUnregister: subscribeFooterWidgetUnregisterMock,
  },
}));

describe("pluginAppWideAssetSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribeFooterWidgetUnregisterMock.mockReturnValue(() => {});
  });

  it("returns false when no snapshot has been captured for the plugin", () => {
    expect(restoreAppWidePluginSnapshot("helm", "abc123")).toBe(false);
    expect(registerStylesheetsMock).not.toHaveBeenCalled();
    expect(registerSettingsTabMock).not.toHaveBeenCalled();
  });

  it("returns false when the captured snapshot's checksum no longer matches (reinstall/update)", () => {
    getStylesheetsMock.mockReturnValue([]);
    getSettingsTabMock.mockReturnValue(undefined);
    captureAppWidePluginSnapshot("helm", "abc123");

    expect(restoreAppWidePluginSnapshot("helm", "def456")).toBe(false);
    expect(registerStylesheetsMock).not.toHaveBeenCalled();
    expect(registerSettingsTabMock).not.toHaveBeenCalled();
  });

  it("restores stylesheets and settings tab from a matching snapshot", () => {
    const stylesheets = [Promise.resolve({ default: ".helm {}" })];
    const settingsTab = { id: "helm", label: "Helm", component: () => null };
    getStylesheetsMock.mockReturnValue(stylesheets);
    getSettingsTabMock.mockReturnValue(settingsTab);

    captureAppWidePluginSnapshot("helm", "abc123");

    const restored = restoreAppWidePluginSnapshot("helm", "abc123");

    expect(restored).toBe(true);
    expect(registerStylesheetsMock).toHaveBeenCalledWith("helm", stylesheets);
    expect(registerSettingsTabMock).toHaveBeenCalledWith("helm", settingsTab);
  });

  it("does not re-register stylesheets or a settings tab that were never captured", () => {
    getStylesheetsMock.mockReturnValue([]);
    getSettingsTabMock.mockReturnValue(undefined);
    captureAppWidePluginSnapshot("helm", "abc123");

    const restored = restoreAppWidePluginSnapshot("helm", "abc123");

    expect(restored).toBe(true);
    expect(registerStylesheetsMock).not.toHaveBeenCalled();
    expect(registerSettingsTabMock).not.toHaveBeenCalled();
  });

  it("captures and restores footer widgets from a snapshot", () => {
    const stylesheet = Promise.resolve({ default: ".helm {}" });
    const settingsTab = { id: "helm", label: "Helm", component: () => null };
    const footerWidget = { id: "helm-footer", component: () => null };
    getStylesheetsMock.mockReturnValue([stylesheet]);
    getSettingsTabMock.mockReturnValue(settingsTab);
    getFooterWidgetMock.mockReturnValue(footerWidget);

    captureAppWidePluginSnapshot("helm", "abc123");

    const restored = restoreAppWidePluginSnapshot("helm", "abc123");

    expect(restored).toBe(true);
    expect(registerFooterWidgetMock).toHaveBeenCalledWith("helm", footerWidget);
  });

  it("does not re-register a footer widget that was never captured", () => {
    getStylesheetsMock.mockReturnValue([]);
    getSettingsTabMock.mockReturnValue(undefined);
    getFooterWidgetMock.mockReturnValue(undefined);
    captureAppWidePluginSnapshot("helm", "abc123");

    const restored = restoreAppWidePluginSnapshot("helm", "abc123");

    expect(restored).toBe(true);
    expect(registerFooterWidgetMock).not.toHaveBeenCalled();
  });
});
