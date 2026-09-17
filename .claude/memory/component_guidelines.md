---
name: component-guidelines
description: Always check shadcn before building a custom primitive UI component; any selector/labels field must use AnnotationBadge; status badge components follow a strict pattern; Namespace fields must use ResourceLink with onClick→onToggleNamespaceDetail; ResourceLink uses shadcn Button variant=link when interactive.
metadata:
  node_type: memory
  type: project
  originSessionId: 4c9d20f2-fae5-4639-a340-3b791fa9bae3
---

## shadcn vs `@base-ui/react` — not competing

`shadcn` is not a runtime dependency here — it's the code-gen CLI/registry only (a `design-system` devDependency). `@base-ui/react` is the actual headless-primitives runtime dependency (`design-system/package.json`). `design-system/components.json` sets `"style": "base-nova"`, shadcn v4's Base UI–flavored style (not the classic Radix style), so every generated atom in `design-system/src/atoms/*.tsx` imports directly from `@base-ui/react/*` (e.g. `Tabs as TabsPrimitive from "@base-ui/react/tabs"`) and wraps it with Tailwind classes + `cva` variants. shadcn's role: (1) scaffold new components pre-wired to Base UI + this repo's theme via `ui:add`, (2) keep generated files consistent via `components.json` conventions (baseColor, CSS vars, `@/atoms` etc. aliases). The generated code is copied into the repo and owned/edited directly — `@base-ui/react` alone would only give unstyled accessible primitives.

Before building any new primitive UI component (button, input, select, dialog, tooltip, etc.), always check shadcn first:

```bash
cd design-system && pnpm run ui:add <component>
```

Only build a custom component if shadcn does not offer an equivalent. Installed shadcn components live in `design-system/src/atoms/`. `shadcn` is now a `design-system` devDependency and `design-system/components.json` (moved there 2026-07-14, see [[features_design_system_package]]) has `aliases.ui: "@/atoms"` so `ui:add` installs to the right place. Generated files use `@/...` imports — convert them to relative imports before committing, per [[feedback_no_self_alias_imports]].

## Status badge components

**2026-07-14 update:** `Badge` (`design-system/src/atoms/badge.tsx`) gained two new `cva` variants — `success` and `warning` — alongside the revised `destructive`. All three are `bg-{name}/15 text-{name} border-transparent`-shaped, driven by the `--success`/`--warning`/`--destructive` CSS tokens (see [[project_color_palettes]]). Status badges must use these named variants instead of hand-rolled `variant="outline"` + `bg-{red,green,amber}-500/15` className for red/green/amber states specifically.

**2026-07-15 update:** `ghost` variant redefined to bake in the resting "muted" look — `bg-muted text-muted-foreground border-transparent [a]:hover:bg-muted/70` (was hover-only: `hover:bg-muted hover:text-muted-foreground`). Badge's `ghost` was unused by any consumer before this change, so redefining it was safe — it's a separate `cva` from `Button`'s own `ghost` variant in `button.tsx`, unaffected. All muted/default-fallback status badges (`variant="outline"` + `bg-muted text-muted-foreground border-transparent` className) were replaced with `variant="ghost"` across the same 9 files. Colors outside the destructive/success/warning/ghost set (blue, yellow, orange) still use `variant="outline"` + manual className — there is no variant for them yet.

Status badge components (e.g. `ServiceStatusBadge`, `HPAStatusBadge`) must follow this pattern:

1. Private named helper function returning either a `variant` string, or `{ variant, className? }` when the status set mixes in-scope (red/green/amber → destructive/success/warning) and out-of-scope (blue/yellow/orange/muted → outline + manual className) colors
2. Inline props type on the component — `FC<{ status: string }>`, no named interface
3. Expression body where possible; a small destructure (`const result = ...; const variantProps = typeof result === "string" ? { variant: result } : result;`) is acceptable when the helper returns the mixed shape

```tsx
import { Badge } from "@/components/atoms/badge";
import type { VariantProps } from "class-variance-authority";
import { FC } from "react";

function statusVariant(
  status: string
): VariantProps<typeof Badge>["variant"] | { variant: VariantProps<typeof Badge>["variant"]; className?: string } {
  switch (status) {
    case "Active":
      return "success";
    case "Inactive":
      return { variant: "outline", className: "bg-orange-500/15 text-orange-500 border-transparent" };
    default:
      return { variant: "outline", className: "bg-muted text-muted-foreground border-transparent" };
  }
}

export const XStatusBadge: FC<{ status: string }> = ({ status }) => {
  const result = statusVariant(status);
  const variantProps = typeof result === "string" ? { variant: result } : result;
  return <Badge {...variantProps}>{status}</Badge>;
};
```

If a badge's status set is 100% red/green/amber (e.g. `NodeSchedulableBadge`), skip the helper entirely and use a direct ternary: `<Badge variant={schedulable ? "success" : "destructive"}>`.

Place each badge in its view folder (e.g. `views/services/ServiceStatusBadge.tsx`). Rolled out 2026-07-14 to all 16 status/condition/QoS badges via `/agent-team --feature-dev` (solution-architect + developer, no designer phase — pure token consolidation, no new visual design). Tests for these badges should assert on rendered text/variant presence, not hardcoded color className substrings (e.g. `bg-green-500`), since those are gone.

## Selector and Labels fields

Any selector field (`Selector`, `NodeSelector`, or similar) and any `Labels` field must render each entry as an `<AnnotationBadge label={s} />` inside a `flex flex-wrap gap-1` container. Show `<span className="text-muted-foreground text-xs">—</span>` when empty or `"-"`.

```tsx
import { AnnotationBadge } from "../../components/AnnotationBadge";

// in list view (TableCell)
<TableCell>
  {value === "-" ? (
    <span className="text-muted-foreground text-xs">—</span>
  ) : (
    <div className="flex flex-wrap gap-1">
      {value.split(",").map((s) => (
        <AnnotationBadge key={s} label={s} />
      ))}
    </div>
  )}
</TableCell>;
```

## Namespace Labels type

`Namespace.Labels` is `map[string]string` (not `[]string`). Render in views and drawers with `Object.entries(ns.Labels ?? {}).map(([k, v]) => <AnnotationBadge key={k} label={\`${k}=${v}\`} />)` — same as ClusterRole.

## ResourceLink `e.stopPropagation()` — when to use

**Only add `e.stopPropagation()` when the `ResourceLink` is inside a `TableRow` that has its own `onClick`** (e.g. list views where clicking the row opens a drawer). Without it, the row's handler fires too.

**Never add it inside `SheetContent` (detail drawers)** — clicks inside a drawer don't bubble to the sheet's backdrop close handler. `onOpenChange` fires only on outside-click or Escape.

```tsx
// ✅ View — TableRow has onClick, stopPropagation needed
<TableRow onClick={() => openDrawer(row.Name)}>
  <TableCell>
    <ResourceLink onClick={(e) => { e.stopPropagation(); onToggleNamespaceDetail(ns) }}>
      {ns}
    </ResourceLink>
  </TableCell>
</TableRow>

// ✅ Drawer — no parent onClick, stopPropagation NOT needed
<ResourceLink onClick={() => onToggleNamespaceDetail(namespace)}>
  {namespace}
</ResourceLink>
```

## Namespace fields in detail drawers

Any `Namespace` value rendered inside a detail drawer or view must use `<ResourceLink>`. Pass an `onClick` to make it open `NamespaceDetailDrawer` via `MainLayoutContext`.

```tsx
import { ResourceLink } from "../../components/ResourceLink";
import { useMainLayoutContext } from "../../context/MainLayoutContext";

const { onToggleNamespaceDetail } = useMainLayoutContext();

// Inside a drawer (no stopPropagation needed):
<ResourceLink onClick={() => onToggleNamespaceDetail(namespace)}>{namespace}</ResourceLink>;
```

## ClusterRole fields in views/drawers

Any `ClusterRole` reference (e.g. `RoleRefName` in ClusterRoleBindingsView) must use `<ResourceLink>` with `onClick→onToggleClusterRoleDetail` via `MainLayoutContext`.

```tsx
const { onToggleClusterRoleDetail } = useMainLayoutContext();

// Inside a drawer (no stopPropagation needed):
<ResourceLink truncate onClick={() => onToggleClusterRoleDetail(crb.RoleRefName)}>
  {crb.RoleRefName}
</ResourceLink>;
```

## Namespace-scoped resource links in detail drawers (Pod, Job, Role, ServiceAccount)

When a detail drawer lists related namespace-scoped resources (e.g. pods in a deployment drawer, jobs in a cron job drawer), each name cell must use `<ResourceLink>` with `onToggle<Resource>Detail(namespace, name)` from `MainLayoutContext`. Use `truncate` + `truncateTextClassName` for cells that may overflow:

```tsx
const { onToggleJobDetail } = useMainLayoutContext()

<TableCell className="max-w-40 truncate font-mono text-xs">
  <ResourceLink
    truncate
    truncateTextClassName="max-w-40"
    onClick={() => onToggleJobDetail(j.Namespace, j.Name)}
  >
    {j.Name}
  </ResourceLink>
</TableCell>
```

Applies to: job names in `CronJobJobsTab`, pod names in `JobPodsTab`, `DeploymentPodsTab`, etc.

## List view empty state

All list-view tables must render an empty state row when the data array is empty. Use a ternary inside `<TableBody>`:

```tsx
<TableBody>
  {items.length === 0 ? (
    <TableRow>
      <TableCell colSpan={N} className="text-muted-foreground py-12 text-center text-sm">
        Item list is empty
      </TableCell>
    </TableRow>
  ) : (
    items.map((item) => <TableRow key={item.Name}>...</TableRow>)
  )}
</TableBody>
```

`colSpan` must match the exact header column count. For views with conditional columns (e.g. Namespace only shown when `!namespace` prop), use a dynamic value: `colSpan={!namespace ? 11 : 10}`.

## Shared toast components

Custom toast UI lives in `design-system/src/components/Toast.tsx`. Currently exports:

- `TOAST_STYLE` — `{ "--width": "450px" } as CSSProperties`; import this for every `toast.custom()` call
- `SuccessToastProps` — `{ title: string; description: string; action? }`
- `renderSuccessToast(props)` — green (`bg-green-600`) success toast with `CircleCheckIcon`
- `ErrorToastProps` — `{ title: string; description?: string; action? }`
- `renderErrorToast(props)` — red (`bg-red-500`) error toast with `CircleXIcon`; `description` is optional

**Never use `toast.error()`** — replace with `toast.custom(() => renderErrorToast({ title, description }), { style: TOAST_STYLE })`.
**Never use `toast.success()`** — replace with `toast.custom(() => renderSuccessToast({ title, description }), { style: TOAST_STYLE })`.

## CTA buttons on resource tables and drawers

Every Kubernetes resource view has two CTA surfaces: a table dropdown and a drawer icon toolbar. Use `ComingSoonTooltip` from `@/components/ComingSoonTooltip` for any action that is not yet implemented.

### `@base-ui/react/tooltip` — `render` prop, NOT `asChild`

The project uses `@base-ui/react/tooltip` (NOT Radix UI). `TooltipTrigger` does **not** accept `asChild` — passing it causes a TS error (`Property 'asChild' does not exist`). Use the `render` prop instead:

```tsx
// ✅ correct — base-ui pattern
<TooltipTrigger render={<Button onClick={...}><Star /></Button>} />

// ❌ wrong — Radix pattern, TS error in this project
<TooltipTrigger asChild><Button>...</Button></TooltipTrigger>
```

`ComingSoonTooltip` demonstrates this: `<TooltipTrigger render={<span>{children}</span>} />`.

### `ComingSoonTooltip`

Wraps any child in a `TooltipProvider > Tooltip > TooltipTrigger render={<span>}` that shows "Coming soon". Accepts an optional `side` prop (default `"left"`).

```tsx
import { ComingSoonTooltip } from "@/components/ComingSoonTooltip";
<ComingSoonTooltip side="left">
  <DropdownMenuItem disabled>...</DropdownMenuItem>
</ComingSoonTooltip>;
```

### `XXXTableCtaButtons` (DropdownMenu pattern)

Place before the `XXXView` export in the view file. Props receive `name` (all resources) and `namespace` (namespace-scoped only), even if currently unused — they're stubs for future actions.

```tsx
const FooTableCtaButtons: FC<{ namespace: string; name: string }> = ({ namespace, name }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      aria-label="Actions"
      className="hover:bg-accent flex size-6 cursor-pointer items-center justify-center rounded-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <MoreVertical className="size-3.5" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {/* existing actions (Scale, Restart, etc.) */}
      <ComingSoonTooltip>
        <DropdownMenuItem disabled>
          <Pencil className="mr-2 size-3.5" />
          Edit
        </DropdownMenuItem>
      </ComingSoonTooltip>
      <ComingSoonTooltip>
        <DropdownMenuItem disabled>
          <Trash2 className="mr-2 size-3.5" />
          Delete
        </DropdownMenuItem>
      </ComingSoonTooltip>
    </DropdownMenuContent>
  </DropdownMenu>
);
```

Add `<TableHead className="w-8" />` to the header row and `<TableCell onClick={(e) => e.stopPropagation()}><FooTableCtaButtons .../></TableCell>` to each data row. Update `colSpan` on the empty-state row accordingly.

### `XXXDrawerCtaButtons` (icon toolbar pattern)

Place before the `XXXDrawerBody` component in the drawer file. All buttons share one `TooltipProvider`. For existing action buttons (Scale, Restart), keep them inside the shared `TooltipProvider` using the inline `<Tooltip>` pattern. For "coming soon" buttons, use `<ComingSoonTooltip side="bottom">`.

Edit = first button, Delete = last button. Existing actions go between.

```tsx
const FooDrawerCtaButtons: FC = () => (
  <TooltipProvider>
    <div className="flex items-center gap-1">
      <ComingSoonTooltip side="bottom">
        <Button aria-label="Edit Foo" variant="ghost" size="icon-sm" disabled>
          <Pencil />
        </Button>
      </ComingSoonTooltip>
      {/* existing action buttons via <Tooltip> ... */}
      <ComingSoonTooltip side="bottom">
        <Button aria-label="Delete Foo" variant="ghost" size="icon-sm" disabled>
          <Trash2 />
        </Button>
      </ComingSoonTooltip>
    </div>
  </TooltipProvider>
);
```

Update the drawer's primary `SheetHeader` (the one with real data, not the `?? "—"` fallback) to:

```tsx
<SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
  <SheetTitle className="text-sm">Foo: {foo.Name}</SheetTitle>
  <FooDrawerCtaButtons />
</SheetHeader>
```

## Reusable `ResourceScaleButton` (scale CTA)

`design-system/src/components/button/ResourceScaleButton.tsx` — shared scale button following the same dual-mode pattern as `ResourceModificationButton`. Use instead of inlining `Scaling` + `DropdownMenuItem`/`Tooltip`+`Button` markup.

Props: `onClick: () => void`, `mode?: "menu-item" | "icon-button"` (default `"menu-item"`), `ariaLabel?` (default `"Scale"`), `disabled?`.

```tsx
// Table dropdown (menu-item mode, default)
<ResourceScaleButton onClick={() => { setScaleKey((k) => k + 1); setScaleOpen(true) }} />

// Drawer icon toolbar (icon-button mode)
<ResourceScaleButton mode="icon-button" ariaLabel="Scale Deployment" disabled={isPending || isScalePending} onClick={() => { setScaleKey((k) => k + 1); setScaleOpen(true) }} />
```

Rolled out 2026-07-11 to Deployments (table + drawer CTA) and ReplicaSets (table + drawer CTA). Note: ReplicaSet scale must pass `disabled={isOwned}` (where `isOwned = rs.OwnerKind !== ""`) to disable the button when the ReplicaSet is owned by a Deployment. Any new resource with a scale action should use this component rather than inlining the markup.

**2026-07-15 fix:** `ResourceModificationButton`/`ResourceDeletionButton` icon-button mode previously nested `<Button>` as a *child* of `<TooltipTrigger>` instead of using the `render` prop. Since base-ui's `TooltipTrigger` renders its own `<button>` by default (see the `render` vs `asChild` note earlier in this file), this produced an invalid nested `<button><button>...` DOM where the outer (unstyled) button was the actual direct child seen by parent CSS selectors — breaking `ButtonGroup`'s `[&>button]` rounding/border rules (and any other direct-child button selector) on every drawer using these two shared components. Fixed by switching both to `<TooltipTrigger render={<Button ...>...} />`, matching the correct pattern already used elsewhere (Logs/Exec buttons in `PodDrawerCtaButtons`, `ComingSoonTooltip`). Always use the `render` prop form when wrapping a `<Button>` in `TooltipTrigger` — never pass it as children.

## Reusable `ResourceRestartButton` (restart CTA)

`design-system/src/components/button/ResourceRestartButton.tsx` — shared restart button following the same dual-mode pattern as `ResourceModificationButton`. Use instead of inlining `RefreshCw` + `DropdownMenuItem`/`Tooltip`+`Button` markup.

Props: `onClick: () => void`, `mode?: "menu-item" | "icon-button"` (default `"menu-item"`), `ariaLabel?` (default `"Restart"`), `disabled?`.

```tsx
// Table dropdown (menu-item mode, default)
<ResourceRestartButton onClick={() => setConfirmOpen(true)} />

// Drawer icon toolbar (icon-button mode)
<ResourceRestartButton mode="icon-button" ariaLabel="Restart Deployment" disabled={isPending} onClick={onRestart} />
```

Rolled out 2026-07-11 to DaemonSets (table + drawer CTA) and Deployments (table + drawer CTA). Any new resource with a restart action should use this component rather than inlining the markup.

## Reusable `ResourceModificationButton` / `ResourceDeletionButton` (edit & delete CTAs)

Edit and delete actions on `XXXTableCtaButtons` (dropdown) and `XXXDrawerCtaButtons` (icon toolbar) must reuse these shared components instead of inlining `Pencil`/`Trash2` markup — do NOT create per-resource one-off edit/delete buttons:

- `design-system/src/components/button/ResourceModificationButton.tsx` (was `ResourceEditButton`, renamed)
- `design-system/src/components/button/ResourceDeletionButton.tsx`

Both share the same shape: a `mode` prop selects rendering —

- `mode="menu-item"` (default) → renders `<DropdownMenuItem>` with icon + label, for table CTA dropdowns
- `mode="icon-button"` → renders `<Tooltip><Button variant="ghost" size="icon-sm"><Icon /></Button></Tooltip>`, for drawer icon toolbars

Props: `onClick: () => void`, `mode?`, `ariaLabel?` (default `"Edit"`/`"Delete"`), and `ResourceDeletionButton` also takes `disabled?` (wire to the mutation's `isPending`).

```tsx
// Table dropdown (menu-item mode, default)
<ResourceModificationButton onClick={() => openTab("modification", { kind: "Namespace", name })} />
<ResourceDeletionButton disabled={isDeletePending} onClick={() => setShowDeleteModal(true)} />

// Drawer icon toolbar (icon-button mode)
<ResourceModificationButton mode="icon-button" ariaLabel="Edit Namespace" onClick={...} />
<ResourceDeletionButton mode="icon-button" ariaLabel="Delete Namespace" disabled={isDeletePending} onClick={...} />
```

When adding these to a new resource's CTA buttons, remove the now-unused `Pencil`/`Trash2`/`DropdownMenuItem`/`Tooltip`/`Button` imports from the consuming file if nothing else references them — check with `grep` before deleting.

Established while refactoring `NamespaceTableCtaButtons`/`NamespaceDrawerCtaButtons` (2026-07-11), then rolled out to all other 32 resource pairs (2026-07-11) via 8 batched developer subagents. `ResourceModificationButton` gained a `disabled?: boolean` prop (mirroring `ResourceDeletionButton`) as part of this rollout, so both buttons can render inside `ComingSoonTooltip` for not-yet-implemented actions: `<ResourceModificationButton disabled onClick={() => {}} />`. Resources with real wired actions (LimitRange delete, ResourceQuota delete, Deployment/DaemonSet/ReplicaSet scale/restart, HelmRelease install/delete, SecretDetailDrawer edit) had those preserved untouched — only the disabled stub markup was componentized. `PortForwardingView`/`PortForwardDetailDrawer` were intentionally excluded — their Edit/Delete are already fully wired to real dialogs/mutations (`onEdit`, `RemovePortForward`), not coming-soon stubs, so they don't fit this pattern.

## Reusable `ResourceBulkDeletionButton` (toolbar bulk-delete CTA)

`design-system/src/components/button/ResourceBulkDeletionButton.tsx` — the destructive circular icon button with a count badge shown in list-view toolbars when a multi-select bulk delete is available. Extracted from `NamespacesView` (2026-07-11), then rolled out the same day to all other views with this pattern: `ResourceQuotasView`, `LimitRangesView`, `PodsView`, `ReplicaSetsView`, `DaemonSetsView`, `DeploymentsView`. Any new list view with multi-select bulk delete should use this component from the start rather than inlining the markup.

Props: `count: number` (selection size — disables button and hides badge at 0), `ariaLabel: string`, `tooltip: string`, `onClick: () => void`.

```tsx
<ResourceBulkDeletionButton
  count={selectedNamespaceNames.size}
  ariaLabel="Delete selected namespaces"
  tooltip="Delete selected Namespaces"
  onClick={() => setShowBulkDeleteModal(true)}
/>
```

Place in the `ml-auto flex items-center gap-4` toolbar div, before the `+` create button.

## Reusable `ResourceCreationButton` (`+` button in list views)

`design-system/src/components/button/ResourceCreationButton.tsx` — the circular `+` button that opens a creation modal. Extracted from `NamespacesView`, then rolled out to `ResourceQuotasView` and `LimitRangesView` the same day (2026-07-11). Reuse this instead of inlining the `Button`/`Plus`/`Tooltip` markup in any new list view with a create modal.

Props: `ariaLabel: string`, `tooltip: string`, `onClick: () => void`.

```tsx
<ResourceCreationButton
  ariaLabel="Create Namespace"
  tooltip="Create Namespace"
  onClick={() => setIsCreateOpen(true)}
/>
```

- **No `variant` prop** — uses the default (solid) variant, not `ghost`
- **`className="rounded-full"`** — circular shape (baked into the component)
- **Placement:** BEFORE the search input inside the `ml-auto flex items-center gap-4` toolbar div, AFTER `ResourceBulkDeletionButton` if present
- State: `const [isCreateOpen, setIsCreateOpen] = useState(false)`

## Generic ConfirmationModal

For any destructive or irreversible action that requires user confirmation, use `ConfirmationModal` from `@/components/ConfirmationModal`. Do **not** create one-off `XxxConfirmationModal` files.

```tsx
import { ConfirmationModal } from "@/components/ConfirmationModal"

<ConfirmationModal
  open={confirmOpen}
  title={
    <>
      Restart Deployment:{" "}
      <span className="text-muted-foreground font-mono font-normal">{name}</span>
    </>
  }
  description={
    <>
      This will trigger a rolling restart of{" "}
      <span className="text-foreground font-mono font-medium">{name}</span>. All pods will be
      replaced progressively.
    </>
  }
  confirmLabel="Restart"
  isPending={isPending}
  onClose={() => setConfirmOpen(false)}
  onConfirm={() => { mutate(...); setConfirmOpen(false) }}
/>
```

Props: `open`, `title: ReactNode`, `description: ReactNode`, `confirmLabel?: string` (default `"Confirm"`), `isPending`, `onClose`, `onConfirm`.

## Tooltip z-index in fixed/portal contexts

`TooltipContent` in `design-system/src/atoms/tooltip.tsx` accepts a `positionerClassName` prop applied to `TooltipPrimitive.Positioner` (the element that actually stacks in the DOM, hardcoded `z-50`). The Popup's `className` does not affect stacking order.

When a tooltip inside a fixed/portal element (e.g. a tray with `z-60`) appears behind the tray, pass `positionerClassName` with a higher z-index:

```tsx
// tooltip.tsx already supports this:
<TooltipContent positionerClassName="z-70">...</TooltipContent>

// TruncatedText forwards it:
<TruncatedText text={label} positionerClassName="z-70" />
```

z-index reference: trays use `z-50`–`z-60`; dropdowns/popovers inside trays use `z-70`; tooltip positioners in tray context should use `z-70`.

## Input `ghost` variant

`design-system/src/atoms/input.tsx` now uses `cva` with two variants:

- `default` — standard bordered rounded input (unchanged behavior)
- `ghost` — underline-only input: no box border, blue bottom border (`border-b border-b-blue-400`), `rounded-none`, `bg-transparent`, `px-0 py-0.5 shadow-none focus-visible:ring-0`

Use `variant="ghost"` for inline key-name inputs inside forms where a full border would feel heavy (e.g. new secret key entry in `SecretDetailDrawer`). Additional utility classes (font-mono, text-xs, etc.) can still be passed via `className`.

```tsx
<Input variant="ghost" placeholder="key name" className="font-mono text-xs font-semibold" />
```

## Full-text search (`lib/full-text-search/`)

Two co-located modules — use both together for any new full-text search feature:

- **`useFullTextSearch`** hook at `design-system/src/libs/full-text-search/useFullTextSearch.ts` — three overloads: no-args (base state+setters), `{ text }` (DOM text-based with char-index matches), `{ onSearch, onSearchNext }` (custom backend e.g. xterm). Returns `searchTerm`, `matchCount`, `currentMatchIdx`, `handleSearch`, `handleSearchNext`, `matches`, `activeMatchCharIdx`, `contentRef`. Tests at `src/design-system/libs/full-text-search/__tests__/useFullTextSearch.test.ts`.
- **`FullTextSearchInput`** component at `design-system/src/libs/full-text-search/FullTextSearchInput.tsx` — search input with match counter overlay.

Props: `searchTerm`, `matchCount`, `currentMatchIdx`, `onSearch(term)`, `onSearchNext()`, `ariaLabel?` (default `"Search"`).

Used by `TrayToolbar` in `PodTray` (`ariaLabel="Search logs"`) and formerly the (now-removed) Helm plugin's YAML tray. Shows "0" when `searchTerm` set but no matches; shows `N/M` counter when matches found; empty when no search term. Includes `aria-live="polite" role="status"` on counter span. Enter key triggers `onSearchNext`.

## `ButtonGroup` (visual button grouping)

`design-system/src/components/ButtonGroup.tsx` — wraps a row of adjacent `<Button>`s so they read as one grouped control instead of separate floating buttons. Added 2026-07-15 (redesign audit FIX 11), wired into all 34 `XXXDrawerCtaButtons` components.

Props: `children: ReactNode`, `className?: string`.

```tsx
<ButtonGroup>
  <Button variant="outline" size="icon-sm"><Scaling /></Button>
  <Button variant="outline" size="icon-sm"><RefreshCw /></Button>
  <Button variant="outline" size="icon-sm"><Pencil /></Button>
</ButtonGroup>
```

Sets `data-slot="button-group"` (activates the pre-existing `in-data-[slot=button-group]:rounded-lg` override already baked into `button.variants.ts` for `xs`/`sm`/`icon-xs`/`icon-sm` sizes) plus its own `[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg` so `default`/`lg`/`icon`/`icon-lg` sizes (which have no such escape hatch) are handled too. Uses `-space-x-px` (not `gap`) to collapse the double border between adjacent bordered buttons, plus `[&>button:focus-visible]:z-10` so a focused button's ring isn't clipped by its overlapping neighbor.

Wired 2026-07-15 into `PodDrawerCtaButtons` (`PodDetailDrawer.tsx`) first — replaced the `<div className="flex items-center gap-0.5">` wrapping Logs/Exec/Edit/Delete icon buttons with `<ButtonGroup>`. Then rolled out to all remaining 33 `XXXDrawerCtaButtons` components (34 total) via 4 parallel `developer` subagents — same pattern: swap the `flex items-center gap-*` div wrapping the icon-button row for `<ButtonGroup>`, drop the div's className, keep all `TooltipProvider`/`Tooltip` structure untouched. `PodTableCtaButtons` (and any other table-row CTA using `DropdownMenu` only) remains out of scope — `ButtonGroup` only applies where there are 2+ adjacent standalone buttons. If a new resource's drawer toolbar adds adjacent standalone icon buttons, wrap them in `ButtonGroup` the same way.

## ResourceLink `truncate` + hover underline

`ResourceLink` with `truncate` prop: the hover underline uses `box-shadow` on the inner span, NOT `text-decoration`. `overflow: hidden` (from `truncate`) clips `text-decoration` ink overflow, and `border-b` adds 1px layout height. `box-shadow` is drawn in the element's own ink overflow and is not clipped by the element's own `overflow: hidden`.

Implemented in `ResourceLink.tsx`:

```tsx
className = "max-w-65 inline-block truncate group-hover/button:[box-shadow:0_1px_0_0_currentColor]";
```

`ResourceLink` renders a shadcn `Button variant="link"` (`w-fit h-auto p-0 text-blue-400`) when `onClick` is provided, a plain `span` otherwise.

## Icon-only Buttons require aria-label (WCAG 2.1 Level A)

Any `<Button>` with `size="icon"` | `"icon-xs"` | `"icon-sm"` | `"icon-lg"` and **no visible text child** must have either:

- `aria-label="description"` (preferred), or
- `aria-labelledby="id"` (when labeling via another element), or
- Visible text (including `<span className="sr-only">`)

Screen readers announce only the button's semantic role without a label, violating WCAG 2.1 Level A (4.1.2 Name, Role, Value).

**Right:**

```tsx
// aria-label approach (preferred for icon buttons)
<Button aria-label="Delete pod" variant="ghost" size="icon-sm" onClick={onDelete}>
  <Trash2 />
</Button>

// or sr-only text (also accessible)
<Button variant="ghost" size="icon-sm" onClick={onClose}>
  <XIcon />
  <span className="sr-only">Close</span>
</Button>
```

**Wrong:**

```tsx
// No label → screen readers announce "button" only
<Button variant="ghost" size="icon-sm" onClick={onDelete}>
  <Trash2 />
</Button>
```

**Note:** Buttons with visible text (e.g., `<Button>Edit <PencilIcon /></Button>`) are already accessible and don't need `aria-label`. ESLint rule `icon-button-aria-label/check` enforces this across design-system and frontend source.
