export type BuiltinSection = "welcome" | "sandbox" | "kubernetes" | "app" | "proxy" | "marketplace";

export type Section = BuiltinSection | (string & {});

export const SECTION_HEADER: Record<BuiltinSection, string> = {
  welcome: "Welcome",
  sandbox: "Sandbox (beta)",
  kubernetes: "Kubernetes",
  app: "App",
  proxy: "Proxy",
  marketplace: "Marketplace",
};

export function isBuiltinSection(s: Section): s is BuiltinSection {
  return typeof s === "string" && s in SECTION_HEADER;
}
