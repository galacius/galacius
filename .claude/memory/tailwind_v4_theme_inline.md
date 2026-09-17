---
name: tailwind-v4-theme-inline
description: How Tailwind v4 @theme inline works — critical rules for CSS variable tokens and computed values like color-mix()
metadata:
  node_type: memory
  type: feedback
  originSessionId: 642418d0-cf23-4659-b3a9-a93c79df357a
---

`@theme inline` suppresses `--color-*` variables from being emitted to the browser's stylesheet. Tailwind inlines the token's value expression directly into each generated utility rule. The browser evaluates `var()` references inside those expressions at runtime.

**Why:** Spent multiple debugging cycles due to incorrect mental model. `var(--color-muted-solid)` was undefined at browser runtime because `@theme inline` never emits `--color-*` to `:root`.

**How to apply:**

- `color-mix(in oklch, var(--muted) 50%, var(--background) 50%)` placed DIRECTLY in `@theme inline` is correct and dark-mode-safe. Tailwind emits it verbatim into `.bg-muted-solid { background-color: color-mix(...) }`. Browser evaluates `var(--muted)` / `var(--background)` at used-value time from the cascade (`:root` light, `.dark` dark).
- DO NOT use `--color-muted-solid: var(--muted-solid)` in `@theme inline` where `--muted-solid` is a `color-mix()` defined in `:root` — this generates `.bg-muted-solid { background-color: var(--color-muted-solid) }` with `--color-muted-solid` undefined at runtime.
- All other `--color-*: var(--x)` entries work because Tailwind emits `var(--x)` directly into the rule, and `--x` IS defined (in `:root` or `.dark`) and accessible by the browser.

**Sticky column pattern (PodsView):**

```css
/* style.css — @theme inline block */
--color-muted-solid: color-mix(in oklch, var(--muted) 50%, var(--background) 50%);
```

```tsx
/* TableRow */
className = "group cursor-pointer";

/* sticky <td> className */
("bg-background group-hover:bg-muted-solid group-has-aria-expanded:bg-muted-solid w-75 max-w-75 sticky left-0 z-10 transition-colors");
```

- `bg-background` provides opaque default (scroll occlusion)
- `group-hover:bg-muted-solid` on hover = opaque pre-composited equivalent of `muted/50` over `background` (no double-compositing, no bleed-through)
- Use `group-hover:` NOT `[tr:hover_&]:` — the `&` in arbitrary variant class names may not be reliably extracted by Tailwind v4's content scanner
- `group-has-aria-expanded:` checks `aria-expanded="true"` (value, not presence) — canonical Tailwind form
