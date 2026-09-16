import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureAppWidePluginSnapshot,
  restoreAppWidePluginSnapshot,
} from "../pluginAppWideAssetSnapshot";

const getStylesheetsMock = vi.hoisted(() => vi.fn());
const registerStylesheetsMock = vi.hoisted(() => vi.fn());
const getSettingsTabMock = vi.hoisted(() => vi.fn());
const registerSettingsTabMock = vi.hoisted(() => vi.fn());

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

describe("pluginAppWideAssetSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
