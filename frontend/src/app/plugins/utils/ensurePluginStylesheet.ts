/**
 * Injects (or updates) a <style> tag containing a plugin's precompiled CSS,
 * concatenated from one or more dynamic import promises registered via
 * appWideAPI.registerStylesheets (plugins that import "./style.css"
 * directly). Must run once the plugin's dynamic import() resolves, or its
 * Tailwind classes render unstyled.
 *
 * Idempotent per pluginId: re-calling with the same text is a no-op; a
 * changed text (reinstall/update) replaces the tag's contents.
 *
 * No-ops when stylesheets is empty/undefined — older plugin bundles built
 * before plugins shipped their own CSS simply have nothing to inject here.
 * If any promise rejects or resolves to a non-string, logs an error and
 * returns (never throws — stylesheet failure must not block the plugin's
 * component from mounting).
 */
export const ensurePluginStylesheet = async (
  pluginId: string,
  stylesheets: Array<Promise<{ default: string }>> | undefined
): Promise<void> => {
  if (!stylesheets || stylesheets.length === 0) return;

  let cssText: string;

  try {
    const resolved = await Promise.all(stylesheets);
    const invalid = resolved.find((r) => !r || typeof r.default !== "string");
    if (invalid !== undefined) {
      console.error(
        `Plugin stylesheet promise for ${pluginId} resolved to invalid value:`,
        invalid
      );
      return;
    }
    cssText = resolved.map((r) => r.default).join("\n");
  } catch (err) {
    console.error(`Failed to load stylesheet for plugin ${pluginId}:`, err);
    return;
  }

  const styleId = `plugin-style-${pluginId}`;
  const existing = document.getElementById(styleId) as HTMLStyleElement | null;
  if (existing) {
    if (existing.textContent !== cssText) {
      existing.textContent = cssText;
    }
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = cssText;
  document.head.appendChild(style);
};
