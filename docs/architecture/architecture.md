Rendered from [`architecture-light.mmd`](architecture-light.mmd) / [`architecture-dark.mmd`](architecture-dark.mmd)
with `mermaid-cli` — GitHub's mobile apps don't render `mermaid` code fences, so the diagram ships as static
SVGs that switch with the OS/browser color scheme. Regenerate after editing a source:

```
npx @mermaid-js/mermaid-cli -i docs/architecture/architecture-light.mmd -o docs/architecture/architecture-light.svg -b white
npx @mermaid-js/mermaid-cli -i docs/architecture/architecture-dark.mmd -o docs/architecture/architecture-dark.svg -b transparent
```

The `Indexer -->|"runtime.EventsEmit (e.g. pods:update)"| EventListeners` edge covers both push
variants used by the backend: the plural per-kind list topic (`"pods:update"`, fired on every
change to any item of that kind) and, for the 10 resources with a separate `Xxx`/`XxxDetail` DTO
(Secret, ResourceQuota, PersistentVolumeClaim, HPA, LimitRange, NetworkPolicy,
PodDisruptionBudget, Ingress, PersistentVolume, ValidatingWebhookConfig), a second singular topic
(`"secret:update"`) scoped to whichever single item is currently open in that kind's detail
drawer — registered via `App.WatchXxxDetail`/`UnwatchXxxDetail` (an `AppMethods` IPC call, same as
any other) and cleared on drawer close. Both variants share the same emit → `EventListeners` →
"merge over query cache" shape; the singular topic just narrows what gets broadcast and to whom.
See `.claude/memory/architecture_decisions.md`'s "Scoped Detail-Push Pattern" section for the full
backend/frontend implementation detail.
