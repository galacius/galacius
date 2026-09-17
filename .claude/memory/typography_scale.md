---
name: typography-scale
description: Typography utility classes in design-system/src/styles.typography.css (imported into style.css) and which UI element category each maps to
metadata: 
  node_type: memory
  type: project
  originSessionId: c2d95148-22aa-491f-873d-81f90d48950f
---

FIX 1 from `.claude/tasks/2026-07-14_redesign-audit-frontend-design-system.md` added a 7-level typography scale as CSS utilities (not a React component) in `design-system/src/style.css`, in a new `@layer utilities` block after the existing `@layer base`.

Scale:
- `.text-display` → `text-2xl font-bold` — rare, major app title only (e.g. WelcomeView branding)
- `.text-h1` → `text-lg font-bold` — view/drawer main title (e.g. DeploymentsView "Deployments" span)
- `.text-h2` → `text-base font-semibold` — subsection headers (e.g. "Containers", "Events" tab sections)
- `.text-h3` → `text-sm font-semibold` — field labels in drawer grids (e.g. "Image", "Environment" in PodDetailDrawer)
- `.text-body` → `text-sm font-normal` — default body/value text
- `.text-caption` → `text-xs font-normal` — secondary/muted text
- `.text-label` → `text-xs font-medium` — form labels, badge text

Semantic aliases exist 1:1 with the same CSS: `.headline-display/-1/-2/-3`, `.body-text`, `.caption-text`, `.label-text`. Either naming works; no enforced convention yet.

Validated first at two call sites (`DeploymentsView.tsx` view title, `PodDetailDrawer.tsx` field-label grid), then rolled out codebase-wide the same day (2026-07-15), ~75 files touched:

- **All 33 view titles** (`frontend/src/app/clusters/modules/*/*View.tsx`, plus the now-removed Helm plugin's own view titles) — `text-sm font-medium` → `.text-h1`, done via uniform `sed` since the pattern was 100% consistent (verified via grep count before/after).
- **All 34 drawer titles** (`SheetTitle`) — `text-sm` → `.text-h1`, same sed approach; one exception kept `font-mono` alongside (`PortForwardDetailDrawer.tsx`: `text-h1 font-mono`).
- **All ~40 confirmation/creation/scale modal titles** — collapsed into 2 shared-component edits instead of per-file changes: `design-system/src/components/modal/ConfirmationModal.tsx` (`DialogTitle` → `.text-h2`, description `<p>` → `.text-body`) and the `DialogTitle` atom default in `design-system/src/atoms/dialog.tsx` (→ `.text-h2 leading-none`). Two modals with custom titles were edited directly: `DeploymentScaleModal.tsx`, `ReplicaSetScaleModal.tsx` (`DialogTitle className="text-h2 flex gap-2"`).
- **`frontend/src/app/clusters/shared/details/SectionDivider.tsx`** — shared component, one edit covers all section dividers app-wide: `"bg-muted/40 text-muted-foreground text-h3 border-y px-4 py-2"`.
- **All 34 detail drawers' field-label/value grids** — `<span className="text-muted-foreground">Label</span>` → `.text-h3 text-muted-foreground` (labels), values → `.text-body` (keeping `font-mono`/`break-all` where present). Done via 4 parallel developer subagents batched by domain (workloads, config/storage, network/RBAC, cluster/admin). Placeholder/empty-state text intentionally left as `.text-caption` or untouched, not bolded to `.text-h3` — label-vs-value is a judgment call, not mechanical.

**Why:** Galacius is a data-dense Kubernetes admin app, not marketing content — the audit's proposed `text-xl` h1 was intentionally scaled down to `text-lg` to avoid oversized headers eating vertical space in drawers/sidebars.

**How to apply:** These utilities are now the codebase-wide standard for view titles, drawer titles, modal titles, section headers, and field-label grids. Any new view/drawer/modal should use `.text-h1`/`.text-h2`/`.text-h3`/`.text-body`/`.text-caption`/`.text-label` from the start rather than ad-hoc `text-sm font-medium`-style combos. Full rollout verified via `pnpm lint` (0 errors) and `pnpm format` (clean) on 2026-07-15.

**2026-07-16 file split:** The `@layer utilities` block containing the Typography Scale + Semantic Aliases classes was extracted from `design-system/src/style.css` into a new `design-system/src/styles.typography.css`, re-imported via `@import "./styles.typography.css";` near the top of `style.css` (alongside the other `@import`s, before `@source`). Gotcha: `design-system/tsup.config.ts`'s `onSuccess` hook does a manual `fs.copyFileSync` for each file in a `cssFiles` array (no CSS bundler runs at this stage — Tailwind resolves `@import`s later during the consuming app's Vite build). Any new CSS partial split out of `style.css` must be added to that array or the published package's `@import` will 404 at consumer build time. All other utilities (focus-ring, shadow, z-index) remain in `style.css` itself; transitions moved to `styles.animation.css` and colors to `styles.palette.css` (same day, see [[ui_transition_duration]] and [[project_color_palettes]]).

**Same-day follow-up:** the font tokens (`@import "@fontsource-variable/geist";` plus the `--font-heading`/`--font-sans` entries from `style.css`'s `@theme inline` block) were also moved into `styles.typography.css` — it now owns both the font-loading/`@theme` font vars AND the typography-scale utility classes, since both are "font parts." `style.css`'s `@theme inline` block is left with only the `--radius-*` scale.

## Font Weight Token Backing

Tailwind v4's built-in `--font-weight-*` namespace is the single source of truth for this codebase. No custom font-weight token layer is defined; the utilities rely entirely on Tailwind's shipped defaults:
- light: 300 (currently unused)
- normal: 400
- medium: 500
- semibold: 600
- bold: 700

These weights are applied via Tailwind's `font-*` classes (e.g., `font-bold`, `font-semibold`, `font-medium`) in the `.text-h1`/`.text-h2`/`.text-body`/etc. rule definitions.

**Guidance:** New components should use the semantic utility classes (`.text-h1`, `.text-h2`, `.text-body`, `.text-caption`, `.text-label`) rather than raw `font-*` Tailwind classes. This preserves the semantic hierarchy and ensures consistent sizing + weight across the app.

**Rationale:** Redeclaring a Tailwind-reserved `@theme inline` namespace (e.g., `--font-weight-*`) is redundant with the built-in defaults and mirrors the risk documented in `gotcha_spacing_container_collision.md`, where redeclaring `--spacing-*` silently broke unrelated utilities. By deferring to Tailwind's built-in tokens, we avoid that gotcha entirely.
