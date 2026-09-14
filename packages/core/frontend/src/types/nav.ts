import { ElementType } from "react";

export interface NavItem<T> {
  id: string;
  label: string;
  view?: T;
}

export interface NavGroup<T> {
  id: string;
  label: string;
  icon: ElementType;
  items: NavItem<T>[];
  /** Whether the sidebar should render this group expanded the first time it's registered. */
  defaultOpen?: boolean;
}

export type NavEntry<T> =
  { kind: "item"; icon: ElementType; item: NavItem<T> } | { kind: "group"; group: NavGroup<T> };
