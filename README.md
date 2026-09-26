<p align="center">
  <img src="frontend/src/assets/images/logo-universal.png" width="128" height="128" alt="Galacius">
</p>

<h1 align="center">Galacius</h1>

<p align="center">
  A lightweight, native desktop dashboard for Kubernetes clusters.<br>
  Built with Wails — Go backend, React webview, no Electron.
</p>

<p align="center">
  <a href="https://galacius.github.io/"><img src="https://img.shields.io/badge/🏘️-galacius.github.io-1abc9c" alt="homepage"></a>
  <a href="https://unikorn.vn/p/galacius" target="_blank" rel="noopener noreferrer"><img alt="Galacius on Unikorn" src="https://img.shields.io/badge/Unikorn-galacius-6c5ce7"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/galacius/galacius.svg" alt="license"></a>
  <a href="https://github.com/galacius/galacius/releases/latest"><img src="https://img.shields.io/github/v/release/galacius/galacius?display_name=tag&sort=semver" alt="release"></a>
</p>

<p align="center">
  <a href="https://www.producthunt.com/products/galacius?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-galacius" target="_blank" rel="noopener noreferrer"><img alt="Galacius - A native desktop dashboard for Kubernetes | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1258934&amp;theme=light&amp;t=1790260418077"></a>
</p>

---

https://github.com/user-attachments/assets/97f02acb-d5e5-488a-a65a-610a897c4130

## Installation

See [docs/installation.md](docs/installation.md), or https://galacius.github.io/#installation for Homebrew/APT.

## Uninstallation

See [docs/uninstallation.md](docs/uninstallation.md).

## Architecture

Galacius has no HTTP/REST layer between its frontend and backend. Wails
auto-generates TypeScript bindings for every exported Go method, so the React
frontend calls Go directly as if it were a local async function; Go, in turn,
watches the Kubernetes API via informers and pushes live updates back to the
frontend as Wails events, rather than the frontend polling for changes.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/architecture/architecture-dark.svg" />
  <img src="docs/architecture/architecture-light.svg" alt="Galacius frontend / backend IPC architecture diagram" />
</picture>

- **Request/response**: the frontend calls a bound Go method (e.g.
  `GetPods(namespace)`) through the Wails-generated bindings; Go runs it and
  returns the result over the same call, same as awaiting a local function.
- **Push updates**: Go's informers watch the cluster in the background and
  emit Wails events (e.g. `pods:update`) whenever cluster state changes; the
  frontend's per-resource event hooks subscribe to these events and merge the
  pushed payload into the existing TanStack Query cache, so views stay live
  without re-polling.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup,
testing, and PR guidelines. Please also review our
[Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md).

## License

Galacius is licensed under the [Apache License 2.0](LICENSE).
