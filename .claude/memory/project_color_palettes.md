---
name: project-color-palettes
description: "Primary color is green-500 (positive/active); secondary color is red-500 (destructive/remove); amber=stop/pause"
metadata:
  node_type: memory
  type: project
  originSessionId: ca938e36-433b-4044-98d9-214543c0d4c5
---

The primary color of the galacius app is **green-500** (`text-green-500`, `border-green-600`, `bg-green-500/10` for hover). The secondary color is **red-500** (`text-red-500`, `border-red-500`, `bg-red-500/10`).

**Why:** User confirmed green-500 when styling `PortForwardCtaButton`; red-500 confirmed as secondary color by user.

**How to apply:**

- **green-500** — primary CTA buttons, active/positive states
- **red-500** — secondary color; destructive/remove actions
- **amber** — stop/pause states
- Avoid teal for primary actions — it was replaced by green-500.
- 2026-07-16: all color tokens (the `@theme inline` `--color-*` mappings plus the `:root`/`.dark` value blocks) live in `design-system/src/styles.palette.css`, imported into `style.css` via `@import "./styles.palette.css";`. `style.css` itself now only keeps non-color tokens (`--font-*`, `--radius-*` scale, base `--radius` value) plus the `@layer base`/`@layer utilities` rules. `design-system/tsup.config.ts`'s `onSuccess` copy hook includes `styles.palette.css` in its `cssFiles` array — any new palette entries just edit this file, no build config change needed.
- `design-system/src/styles.palette.css` tokens (both `:root` and `.dark`) are set to match `PodQoSBadge` QoS colors exactly — keep these in sync if either changes:
  - `--destructive` = Tailwind `red-500` (`oklch(0.637 0.237 25.331)`) ↔ `BestEffort`
  - `--success` = Tailwind `green-500` (`oklch(0.723 0.219 149.579)`) ↔ `Guaranteed`
  - `--warning` = Tailwind `amber-500` (`oklch(0.769 0.188 70.08)`) ↔ `Burstable`
- 2026-07-14: `Badge` atom (`design-system/src/atoms/badge.tsx`) now exposes these as first-class `cva` variants (`destructive`/`success`/`warning`), each `bg-{name}/15 text-{name} border-transparent`-shaped. All 16 status/condition/QoS badges across the frontend were migrated from `variant="outline"` + hardcoded `bg-{red,green,amber}-500/15` classNames to these variants. See [[component_guidelines]] for the updated status-badge helper pattern.
- 2026-07-15: added `--info` = Tailwind `blue-500` (`oklch(0.623 0.214 259.815)`), with `--info-soft` companion (mirrors `--destructive`'s single-soft pattern, no `-foreground`). New `info` Badge variant added same-shaped as destructive/success/warning. Migrated 4 Badge consumers off ad-hoc `bg-blue-500/15` outline classNames: `DeploymentConditionBadge` ("Progressing"), `PodStatusBadge` ("pending"), `PersistentVolumeStatusBadge` ("Available" — this one previously used `text-blue-400` not `-500`, deliberately normalized to `text-info`/blue-500 for consistency), `HelmReleaseStatusBadge` ("superseded"). `EndpointSliceDetailDrawer`'s blue-500 span is a plain element, not a Badge — left untouched, out of scope.
