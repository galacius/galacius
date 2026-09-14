# Galacius

[![homepage](https://img.shields.io/badge/🏘️-galacius.github.io-1abc9c)](https://galacius.github.io/)
[![license](https://img.shields.io/github/license/galacius/galacius.svg)](LICENSE)
[![release](https://img.shields.io/github/v/release/galacius/galacius?display_name=tag&sort=semver)](https://github.com/galacius/galacius/releases/latest)

Galacius is a lightweight, native desktop dashboard for managing Kubernetes
clusters. It's built with [Wails](https://wails.io) (Go backend + React
webview, no Electron), so it stays small and fast while giving you a clean,
modern watch-based UI over your cluster.

https://github.com/user-attachments/assets/7afe5c08-fb14-4ca1-ac33-4a2cbe8d2849

## Installation

For step-by-step installation instructions, see https://galacius.github.io/#installation

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
