// Once a plugin is installed, its logo is a real file inside the plugin's
// install directory (alongside dist/ and the binary), served over the same
// /api/plugins/{pluginId}/* route the plugin's own frontend bundle loads
// through (see loadPluginModule.ts). Before install, that file doesn't exist
// on disk yet — manifest.assets.logo is set either way (it's part of the
// manifest, not install-specific), so `isInstalled` decides which URL is
// actually servable: the local route once installed, otherwise a proxied
// fetch of logoURL, the direct GitHub release asset URL the backend
// resolves for display purposes only (GetPluginsFromMarketplace). It's
// proxied rather than used as-is because GitHub serves release assets with
// Content-Disposition: attachment, which browsers refuse to render inline
// as an <img> — /api/marketplace/logo (NewMarketplaceLogoHandler) fetches
// it server-side and re-serves it without that header. Returns undefined
// when the plugin has no logo at all; PluginLogo already falls back to a
// placeholder icon then.
export const pluginLogoUrl = (
  pluginId: string,
  isInstalled: boolean,
  logoFile?: string,
  logoURL?: string
): string | undefined => {
  if (isInstalled) return logoFile ? `/api/plugins/${pluginId}/${logoFile}` : undefined;
  return logoURL ? `/api/marketplace/logo?url=${encodeURIComponent(logoURL)}` : undefined;
};
