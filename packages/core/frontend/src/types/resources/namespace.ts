import type { ManagedField } from "./shared";

// Shared boundary type between the main app and plugin frontends.
// Plugin bundles build standalone and cannot import from the
// main app's `@/app` module tree, so any type crossing that boundary lives
// here instead. Keep this to the minimal shape actually consumed across the
// boundary — `Namespace` below is a structural superset and extends this
// type directly.

export interface SharedNamespaceContext {
  Name: string;
}

export interface Namespace extends SharedNamespaceContext {
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  Age: string;
  CreatedAt: string;
  Status: string;
  ManagedFields: ManagedField[];
  ResourceQuotas: string[];
  LimitRanges: string[];
}
