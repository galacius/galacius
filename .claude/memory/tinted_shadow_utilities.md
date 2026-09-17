---
name: tinted-shadow-utilities
description: Depth-shadow utility scale (.shadow-subtle/-depth-1/-depth-2) added 2026-07-15 for spatial depth on dialogs/drawers
metadata:
  node_type: memory
  type: project
  originSessionId: 3b76f4ab-39fb-4ed0-a66a-2fda9bf052a1
---

`design-system/src/style.css` (`@layer utilities`, after tabular-nums) defines three tinted-shadow utilities using `color-mix(in oklch, var(--foreground) N%, transparent)`:

- `.shadow-subtle` — `0 1px 3px` @ 5% (defined, not yet applied anywhere — available for future use)
- `.shadow-depth-1` — `0 2px 8px` @ 8% (applied to `SheetContent` in `sheet.tsx`, replacing `shadow-lg`)
- `.shadow-depth-2` — `0 4px 16px` @ 12% (applied to `DialogContent` in `dialog.tsx`, appended to existing classes)

**Why:** Redesign audit Fix 3 (`.claude/tasks/2026-07-14_redesign-audit-frontend-design-system.md`, Section 3) found zero `box-shadow` usage in the codebase — all depth was CSS borders. Using `var(--foreground)` as tint base (not `--primary`) because it's achromatic and already flips correctly between light (`oklch(0.145 0 0)`) and dark (`oklch(0.985 0 0)`) themes — one utility set works for both, no dark-mode override needed.

**How to apply:**

- Modal (Dialog) = depth-2 (most prominent, center-stage), Drawer (Sheet) = depth-1 (secondary, side-mounted) — established hierarchy, keep consistent when adding new modal/drawer-like surfaces.
- No card component exists in this codebase — `hover:shadow-depth-1` on cards from the original audit suggestion was deliberately dropped; revisit only if a `Card` atom is introduced.
- `.shadow-primary-sm` from the audit was dropped in favor of Tailwind's built-in `shadow-sm` for small-shadow needs — don't reintroduce it without cause.
