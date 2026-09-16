import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ensurePluginStylesheet } from "../ensurePluginStylesheet";

describe("ensurePluginStylesheet", () => {
  beforeEach(() => {
    // Clear all style tags created by tests
    document.querySelectorAll("style[id^='plugin-style-']").forEach((el) => el.remove());
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any style tags created during tests
    document.querySelectorAll("style[id^='plugin-style-']").forEach((el) => el.remove());
  });

  it("injects a style tag with the resolved CSS text", async () => {
    const pluginId = "test-plugin";
    const cssText = ".test-class { color: red; }";

    await ensurePluginStylesheet(pluginId, [Promise.resolve({ default: cssText })]);

    const style = document.getElementById(`plugin-style-${pluginId}`) as HTMLStyleElement;
    expect(style).toBeTruthy();
    expect(style.textContent).toBe(cssText);
  });

  it("concatenates multiple resolved stylesheets in order", async () => {
    const pluginId = "test-plugin";
    const cssText1 = ".a { color: red; }";
    const cssText2 = ".b { color: blue; }";

    await ensurePluginStylesheet(pluginId, [
      Promise.resolve({ default: cssText1 }),
      Promise.resolve({ default: cssText2 }),
    ]);

    const style = document.getElementById(`plugin-style-${pluginId}`) as HTMLStyleElement;
    expect(style.textContent).toBe(`${cssText1}\n${cssText2}`);
  });

  it("updates an existing style tag when CSS text changes", async () => {
    const pluginId = "test-plugin";
    const cssText1 = ".test-class { color: red; }";
    const cssText2 = ".test-class { color: blue; }";

    await ensurePluginStylesheet(pluginId, [Promise.resolve({ default: cssText1 })]);
    let style = document.getElementById(`plugin-style-${pluginId}`) as HTMLStyleElement;
    expect(style.textContent).toBe(cssText1);

    await ensurePluginStylesheet(pluginId, [Promise.resolve({ default: cssText2 })]);
    style = document.getElementById(`plugin-style-${pluginId}`) as HTMLStyleElement;
    expect(style.textContent).toBe(cssText2);
  });

  it("is idempotent when called with the same CSS text", async () => {
    const pluginId = "test-plugin";
    const cssText = ".test-class { color: red; }";

    await ensurePluginStylesheet(pluginId, [Promise.resolve({ default: cssText })]);
    const style1 = document.getElementById(`plugin-style-${pluginId}`);

    await ensurePluginStylesheet(pluginId, [Promise.resolve({ default: cssText })]);
    const style2 = document.getElementById(`plugin-style-${pluginId}`);

    expect(style1).toBe(style2);
  });

  it("resolves a promise that resolves to { default: string }", async () => {
    const pluginId = "test-plugin";
    const cssText = ".test-class { color: green; }";
    const stylePromise = Promise.resolve({ default: cssText });

    await ensurePluginStylesheet(pluginId, [stylePromise]);

    const style = document.getElementById(`plugin-style-${pluginId}`) as HTMLStyleElement;
    expect(style).toBeTruthy();
    expect(style.textContent).toBe(cssText);
  });

  it("handles promise rejection gracefully without throwing", async () => {
    const pluginId = "test-plugin";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const stylePromise = Promise.reject(new Error("Network error"));

    // Should not throw
    await expect(ensurePluginStylesheet(pluginId, [stylePromise])).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to load stylesheet for plugin ${pluginId}`),
      expect.any(Error)
    );

    // No style tag should be created
    const style = document.getElementById(`plugin-style-${pluginId}`);
    expect(style).toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it("logs error when a promise resolves to an invalid value", async () => {
    const pluginId = "test-plugin";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const stylePromise = Promise.resolve({ default: null });

    await ensurePluginStylesheet(pluginId, [stylePromise] as any);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Plugin stylesheet promise for ${pluginId} resolved to invalid value`
      ),
      expect.any(Object)
    );

    // No style tag should be created
    const style = document.getElementById(`plugin-style-${pluginId}`);
    expect(style).toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it("returns early when stylesheets is undefined", async () => {
    const pluginId = "test-plugin";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await ensurePluginStylesheet(pluginId, undefined);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    const style = document.getElementById(`plugin-style-${pluginId}`);
    expect(style).toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it("returns early when stylesheets is an empty array", async () => {
    const pluginId = "test-plugin";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await ensurePluginStylesheet(pluginId, []);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    const style = document.getElementById(`plugin-style-${pluginId}`);
    expect(style).toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it("returns early when stylesheets is null", async () => {
    const pluginId = "test-plugin";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await ensurePluginStylesheet(pluginId, null as any);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    const style = document.getElementById(`plugin-style-${pluginId}`);
    expect(style).toBeNull();

    consoleErrorSpy.mockRestore();
  });
});
