# Contributing to Galacius

Welcome to Galacius! We're excited you want to contribute.

## About Galacius

Galacius is a lightweight Kubernetes dashboard built with [Wails v2](https://wails.io). It combines a Go backend with a React/TypeScript frontend running in a native webview shell. The repository is structured around a pnpm workspace with the following key directories:

- **`internal/`** — Go backend implementation (Kubernetes client, business logic, app state)
- **`frontend/`** — React + TypeScript frontend application
- **`design-system/`** — Shared UI kit published as an npm package (`@galacius/design-system`)

## Development Setup

### Local environment

Install dependencies and prepare your environment:

```bash
# Install Node dependencies (pnpm workspace)
pnpm install

# Install Go dependencies
go mod download

# Build the packages plugins vendor against; build:core:fe also regenerates
# the vendor shims (frontend/public/vendor/**/*.js is gitignored — generated,
# not checked in)
pnpm build:ds && pnpm build:core:fe
```

### Running the app

For hot-reload development of the full desktop app (Go backend + React frontend):

```bash
wails dev
```

While `wails dev` is running, the app's dev build is also available at `http://localhost:34115` in a regular browser — useful for browser devtools (console, network, React devtools) that aren't accessible in the native webview shell.

For frontend-only development (Vite dev server, useful for pure UI work):

```bash
pnpm dev
```

### Local Plugin Development

To test a locally-built plugin with Galacius during development:

1. Build your plugin in its own repository (e.g. `galacius-plugins/plugins/helm/.output`).
2. In Galacius, go to **Settings → Marketplace → Plugins Directory**.
3. Set the path to the **parent directory** of your plugin's build output folder — for example, if your plugin produces `.output/.plugin-metadata.json`, set Plugins Directory to the parent folder containing `.output`.
4. The app will scan all immediate subdirectories (including dot-prefixed folders like `.output`) and load any valid plugin metadata it finds.

## Building

### Full application build

```bash
pnpm build:app
```

This runs the build script (`scripts/build.sh`), wraps `wails build`, and on macOS applies ad-hoc code signing.

### Design system only

```bash
pnpm build:ds
```

Builds the `@galacius/design-system` package — required before a frontend build if design-system code has changed.

### Frontend only (without Wails binary)

```bash
pnpm build:app:fe
```

Equivalent to `pnpm build:ds && pnpm build:core:fe && <frontend build>`.

### Plugin vendor shims

```bash
pnpm generate:vendor
```

Regenerates `frontend/public/vendor/**/*.js` (the import-map shims plugins resolve `react`/`react-dom`/`@galacius/design-system`/`@galacius/core`/`@tanstack/react-query` against) from the actual installed/built module each shim wraps, rather than a hand-maintained export list. `frontend/public/vendor/` is gitignored — it's build output, not source. `pnpm build:core:fe` runs this automatically as its last step (wired into `pnpm build:app:fe`, `pnpm build:core`, `job-build.yml` / `job-build-check.yml`), so you rarely need to invoke it directly — build the packages it wraps first (`pnpm build:ds` then `pnpm build:core:fe`) since the shim reads their `dist/`. Run it standalone only to refresh the shims without rebuilding `@galacius/core` itself (e.g. after bumping `react`/`react-dom`/`@tanstack/react-query`).

## Testing

### Go backend tests

```bash
# Run all Go tests with race detector
pnpm test:be

# With coverage
pnpm test:be:coverage

# Single test by name
go test -race -run TestName ./internal/app/...
```

### Frontend tests (Vitest)

```bash
# Run all frontend tests
pnpm test:fe

# With coverage
pnpm test:fe:coverage

# Single test file
pnpm --filter galacius-frontend exec vitest run path/to/File.test.tsx
```

### Design system tests

```bash
pnpm test:ds
```

## Lint & Format

These checks must pass before submitting a PR:

```bash
# Format all code (Prettier: TS, TSX, JS, JSON, CSS, Markdown, YAML)
pnpm format

# Lint TypeScript/React code
pnpm lint:fe

# Lint Go
pnpm lint:be
```

## Test cluster on local

### Minikube

```sh
minikube addons enable metrics-server
```

### Docker Desktop

```sh
kubectl config use-context docker-desktop
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch deployment metrics-server -n kube-system \
    --type=json \
    -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
kubectl rollout status deployment/metrics-server -n kube-system

kubectl top nodes
```

## Branching & Pull Requests

- Fork the repository or create a feature branch off `main`
- Keep PRs focused on a single feature or bug fix
- Describe what you changed and why in the PR description
- Reference any related GitHub Issues

## Developer Certificate of Origin

All commits must be signed off using:

```bash
git commit -s -m "Your commit message"
```

This appends a `Signed-off-by` trailer, certifying that you wrote the code and have the right to contribute it to the project. See the `DCO` file for the full Developer Certificate of Origin v1.1 text. We use DCO for contribution provenance tracking — no CLA required.

## Code Style

### TypeScript & React

Files in `frontend/src` and `design-system/src` use:

- **Imports:** Relative imports within the same top-level directory (`frontend` or `design-system`); `@/...` alias reserved for cross-top-level imports only
- **Icon buttons:** Must include `aria-label` attribute for WCAG 2.1 Level A compliance (enforced by the `icon-button-aria-label/check` ESLint rule)
- **Components:** Before writing custom UI, check if shadcn already has it:

  ```bash
  cd design-system && pnpm run ui:add <component>
  ```

- **Status badges:** Use `Badge`'s `success`/`warning`/`destructive`/`ghost` CVA variants; other colors use `variant="outline"` + className
- **Toasts:** Use `toast.custom(() => renderErrorToast/renderSuccessToast({...}), { style: TOAST_STYLE })` from `design-system/src/components/toasts`; never use `toast.error()` or `toast.success()`
- **CTA buttons:** Reuse shared components (`ResourceModificationButton`, `ResourceDeletionButton`, `ResourceRestartButton`, `ResourceScaleButton`, `ResourceBulkDeletionButton`, `ResourceCreationButton`) instead of inlining icon+dropdown markup

### Go

Files under `internal/` follow:

- Hexagonal + Onion architecture (dependency flows inward; `dto` is the leaf, no cycles)
- Watch-based updates, not polling (use `SharedInformerFactory` and listers for zero-copy reads from in-memory cache)
- Push updates via Wails events, not polling
- Detail reads use `GetXxxByName(namespace, name)` → `lister.Xxxs(ns).Get(name)`, never `ListXxx().find(...)`
- DTO fields use `string` for timestamps, never `time.Time` (Wails TS bindings limitation)

## Maintainer: APT Repository Bootstrap

One-time setup for the self-hosted APT repository (`galacius/galacius-apt`), only needed once per signing-key rotation or on initial setup — not part of the regular release flow.

1. **Generate the GPG signing key** (RSA 4096, no passphrase protection so CI can sign headlessly):

   ```sh
   gpg --batch --full-generate-key <<EOF
   %no-protection
   Key-Type: RSA
   Key-Length: 4096
   Name-Real: Galacius Packages
   Name-Email: packages@galacius.io
   Expire-Date: 0
   %commit
   EOF
   ```

2. **Export the private key** (for the `GPG_PRIVATE_KEY` secret) and the **public key** (committed to the apt repo):

   ```sh
   gpg --batch --armor --export-secret-keys packages@galacius.io > galacius-private.key
   gpg --batch --armor --export packages@galacius.io > galacius-keyring.gpg
   ```

   `galacius-private.key` must never be committed anywhere — copy its contents into the `GPG_PRIVATE_KEY` secret (below), then delete the local file.

3. **Create `galacius/galacius-apt`** and commit:
   - `conf/distributions` (see `.claude/plans/apt-distribution.md`'s Key Decisions section for the noble/jammy/focal stanzas)
   - `.gitignore` with `/pool/`, `/dists/`, `*.gpg`, `*.sig`
   - `keys/galacius-keyring.gpg` (force-added past the `*.gpg` ignore rule — `git add -f keys/galacius-keyring.gpg`)
   - Run `reprepro -b . export` locally to generate the initial (empty) `dists/` tree, commit, push
   - Enable **GitHub Pages** on the repo, serving from `main` (root) — this is what `https://galacius.github.io/galacius-apt` serves

4. **Add GitHub secrets** to `galacius/galacius` (Settings → Secrets and variables → Actions):
   - `GPG_PRIVATE_KEY` — contents of `galacius-private.key` from step 2
   - `GPG_PASSPHRASE` — empty string (the key has `%no-protection`, not unset)
   - `APT_REPO_GITHUB_TOKEN` — a fine-grained PAT scoped to **write-only access on `galacius-apt` alone**, used by `job-publish-apt.yml` to checkout-and-push

Once these are in place, every tagged release automatically builds, signs, and publishes `.deb`s via `job-publish-apt.yml` — no further manual steps.

## Reporting Issues

- **Bugs:** Use GitHub Issues with details about reproduction, expected vs. actual behavior, and your environment (OS, K8s version)
- **Features:** Use GitHub Issues to propose new capabilities

## License

Contributions to Galacius are licensed under the Apache License 2.0 (see `LICENSE` file). By contributing, you agree to license your contribution under the same terms.

---

Thanks for contributing! Please reach out with questions or feedback.
