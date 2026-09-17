---
name: react-code-quality-patterns
description: "galacius React coding conventions — no inline render functions, useReducer for grouped state, timer cleanup via status-driven effects, accessible inputs, memoizing derived lists and context values"
metadata:
  node_type: memory
  type: project
  originSessionId: 4c9d20f2-fae5-4639-a340-3b791fa9bae3
---

### No inline render functions

Never call `renderX()` inside JSX — extract as a named component so React can reconcile by identity. Example: `AppContent` in `App.tsx` instead of `renderContent()`.

### Related state → useReducer

When 3+ state slices update together (load, save, reset), group them in a typed reducer. `SettingsView` uses `formReducer` for `{ varRows, secretRows, shellPath, terminalCopyPaste, status }`. Pure UI/nav state (`section`, `envOpen`) stays as `useState`.

### Timer cleanup via status-driven effect

Don't hold timer IDs in refs and clean them up in an unrelated effect. Instead, watch the state that drives the timer:

```tsx
useEffect(() => {
  if (form.status !== "saved") return;
  const t = setTimeout(() => dispatch({ type: "SAVE_RESET" }), 2000);
  return () => clearTimeout(t);
}, [form.status]);
```

This lets React own the lifecycle; the cleanup fires automatically on unmount or status change.

### Accessible inputs

Every `<input>` must have a visible `<label>` or `aria-label`. Don't rely on `placeholder` — it disappears when the user types. Never use `autoFocus` — it disorients screen reader and keyboard users. Custom Checkbox (base-ui renders `<button>`, not `<input>`) — use `<div>` wrapper, not `<label>`, and set `aria-label` on the Checkbox itself.

### React 19 ref-as-prop (no forwardRef)

In React 19 (`@types/react@19.2.17`), `ref` is a normal prop. Never use `forwardRef` — it's deprecated. Include `ref?: Ref<Handle>` in the props interface directly:

```tsx
export interface MyHandle { doSomething: () => void }
export interface MyProps { ...; ref?: Ref<MyHandle> }
const MyInner = ({ ref, ...props }: MyProps) => {
  useImperativeHandle(ref, () => ({ doSomething }), [doSomething])
  // ...
}
export const My = ({ ref, ...props }: MyProps) => <div><MyInner {...props} ref={ref} /></div>
```

Parent uses callback refs for dynamic instances: `ref={(handle) => { refs.current[id] = handle }}`.

### Imperative handles over prop callbacks for child→parent methods

When a parent needs to call a child function (clear, reconnect, search), expose it via `useImperativeHandle`, not via `onXxxReady` callbacks in `useEffect`. Parent holds `useRef<Record<string, Handle | null>>({})` for multiple dynamic instances. This eliminates `no-prop-callback-in-effect` and `no-pass-data-to-parent` violations.

### Never read/write `ref.current` during render

The `react-hooks/refs` ESLint rule (in `eslint.config.js`) hard-errors on any ref access in the render body — only inside effects/handlers is allowed. This rules out the common "useRef instead of useState to avoid a re-render" fix for values compared during render (e.g. the "derived state when a prop changes" pattern: `if (values !== prevValues) { ...; setEditedValues(...) }`). For that pattern, keep `prevValues` as real state — either its own `useState` (React's documented recipe) or folded into a `useReducer` alongside the derived value it gates, e.g. `HelmChartVersionTray.tsx`'s `valuesEditorReducer` combines `editedValues`+`prevValues` into one reducer so the raw `useState` count drops without touching a ref. Confirmed by hitting `Cannot access ref value during render` / `Cannot update ref during render` lint errors when attempting the ref conversion.

### Stable keys for add/remove form rows

For dynamically added/removed rows (LimitRange/ResourceQuota creation modals, ConfigMap/Secret new-entry editors), never key by array index — deletions/reorders remap index to the wrong row. Use a per-row `id: number` field seeded from a `useRef(0)` counter incremented in the add handler (ref mutation is fine here since it only happens in an event handler, not during render), and update/delete by `row.id` instead of index.

### status+error → useReducer in hooks

When a hook has both `status` (enum) and `error` (string|null) state that always update together, use `useReducer` not two `useStates`:

```ts
type State = { status: MyStatus; error: string | null }
type Action = { type: "connecting" | "active" | "closed" } | { type: "error"; error: string }
function reducer(_: State, action: Action): State { ... }
const [{ status, error }, dispatch] = useReducer(reducer, { status: "connecting", error: null })
```

Keep `onStatusChange` ref-synced so the callback never goes stale:

```ts
const onStatusChangeRef = useRef(onStatusChange);
useEffect(() => {
  onStatusChangeRef.current = onStatusChange;
}); // no dep array
```

### Memoize derived list computations (filter/sort/map)

Every resource list view follows the same shape: `const { data: raw = [] } = useGetXxx(...)`, then a client-side name-search filter + alphabetical sort before pagination. This derived array MUST be wrapped in `useMemo([raw, search])`, not recomputed inline on every render:

```tsx
const items = useMemo(
  () =>
    raw
      .filter((x) => !search || x.Name.toLowerCase().includes(search.toLowerCase()))
      .toSorted((a, b) => a.Name.localeCompare(b.Name)),
  [raw, search]
);
```

`CronJobsView`/`StatefulSetsView`/`DeploymentsView` always did this correctly; an audit (2026-09-12) found 8 views that didn't — `PersistentVolumeClaimsView`, `PersistentVolumesView`, `StorageClassesView`, `ClusterRoleBindingsView`, `ClusterRolesView`, `RoleBindingsView`, `RolesView`, `ServiceAccountsView` — all fixed to match. Without the `useMemo`, the new array reference on every render defeats downstream memoization (e.g. `usePagination`'s `visibleItems`) and can retrigger effects/child re-renders that depend on it.

### Context-selector scoping for large shared contexts

A single `useReducer`-backed context whose `Provider value={...}` is `useMemo`'d only on `[state]` re-renders **every** consumer on **any** state change, even ones subscribing to an unrelated slice — the "god context" anti-pattern. `DetailDrawerContext.tsx` hit this at scale: one context backs toggle state for ~40 resource kinds' detail drawers, so opening/closing any one drawer re-rendered every list view and every mounted drawer. Under StrictMode's doubled render/effect passes in dev, this repeated re-render fan-out felt like the app hanging when navigating list↔drawer rapidly.

Fix (keep the single context as source of truth — do not split it into per-kind contexts/providers): move state outside React into a closure-based external store, and let consumers subscribe via `useSyncExternalStoreWithSelector` (`use-sync-external-store/with-selector`) with a per-call selector + `shallowEqual`, so each consumer only re-renders when its selected slice actually changes:

```tsx
function createStore() {
  let state = initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
    dispatch: (action: Action) => {
      const next = reducer(state, action);
      if (next !== state) { state = next; listeners.forEach((l) => l()); }
    },
  };
}

// Provider: const [store] = useState(createStore);  // lazy init, no lint violation
// Hook: useDetailDrawerContext((v) => ({ onToggleXDetail: v.onToggleXDetail }))
//   -> useSyncExternalStoreWithSelector(store.subscribe, getSnapshot, getSnapshot, selector, shallowEqual)
```

Callers must pass a selector picking only the fields they use — `useDetailDrawerContext()` with no selector still returns everything (no slice narrowing).

Note why the store is a closure with methods (`getState`/`dispatch`/`subscribe`), not a plain mutable object (`{ state, listeners }`) held via `useState`: directly assigning `storeApi.state = next` trips the `react-hooks/immutability` ESLint rule ("Modifying a value returned from `useState()`"), even though the object is deliberately used as a non-reactive external-store container. Hiding the mutable field in a closure variable and exposing only method calls (never property assignment) on the `useState`-returned object satisfies both `react-hooks/immutability` and `react-hooks/refs` (which separately forbids the classic `useRef` + lazy-init-during-render idiom for holding this kind of container).
