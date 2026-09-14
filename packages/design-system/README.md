# @galacius/design-system

React 19 component library for galacius — atoms, components, utilities, and hooks for the galacius application and external integrations.

## Table of Contents

- [Version Compatible](#version-compatible)
- [Installation](#installation)
- [Tailwind CSS v4 Setup](#tailwind-css-v4-setup)
- [Usage](#usage)
- [Publishing](#publishing)
- [Contributing](#contributing)

## Version Compatible

| @galacius/design-system | react | tailwindcss |   module   |                remark                |
| :---------------------: | :---: | :---------: | :--------: | :----------------------------------: |
|          v0.x           | ^19.x |    ^4.x     | ECMAScript | TS supported (full `.d.ts` included) |

## Installation

This package is published to [GitHub Packages](https://github.com/orgs/galacius/packages), not the public npm registry. GitHub Packages requires the npm scope to match the owning GitHub org, so the package is published there as **`@galacius/design-system`** (the source package is `@galacius/design-system` internally, but external consumers install and import it under the `@galacius` scope).

### 1. Authenticate to GitHub Packages

Create a GitHub [personal access token](https://github.com/settings/tokens) with at least `read:packages` scope, then add a `.npmrc` in your project root (or `~/.npmrc` for a global config):

```
@galacius:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Set `GITHUB_TOKEN` in your shell environment (or replace `${GITHUB_TOKEN}` with the token directly, though an env var is recommended so the token isn't committed).

### 2. Install

```bash
npm install @galacius/design-system
# or
pnpm add @galacius/design-system
```

## Tailwind CSS v4 Setup

Tailwind CSS v4 is required, via the `@tailwindcss/vite` plugin. After installing the package, `@import` the design system's stylesheet **once** from your app's own CSS entry point (not from JS):

```css
/* src/style.css */
@import "@galacius/design-system/styles.css";

/* your app's own styles below */
```

```tsx
// src/main.tsx or src/index.tsx
import App from "./App";
import "./style.css";

ReactDOM.render(<App />, document.getElementById("root"));
```

This pulls in Tailwind's base layer, `tw-animate-css`, the `shadcn` theme, the Geist Variable font, and all design tokens (`@theme inline` colors, radii, sidebar/chart/success/warning/destructive variables) defined by the design system, so every Tailwind utility class works throughout your app.

## Usage

The package exports from multiple entrypoints for granular imports:

### Atoms (`.`)

Low-level primitive components (buttons, inputs, dialogs, etc.):

```tsx
import { Button } from "@galacius/design-system";
import { Input } from "@galacius/design-system";
import { Badge } from "@galacius/design-system";
```

### Atoms subpath (`./atoms`)

Directly reference the atoms barrel export:

```tsx
import { Button, Checkbox, Select } from "@galacius/design-system/atoms";
```

### Components (`./components`)

Higher-level domain-specific components (resource cells, drawers, modals, etc.):

```tsx
import {
  AnnotationBadge,
  ResourceDetailDrawer,
  ResourceDeletionButton,
} from "@galacius/design-system/components";
```

### Hooks (`./hooks`)

React hooks for common operations:

```tsx
import { useCopyToClipboard } from "@galacius/design-system/hooks";
```

### Utils (`./utils`)

Utility functions for formatting, transformation, and common operations:

```tsx
import { formatRelativeTime, formatTs, cn } from "@galacius/design-system/utils";
```

### Libs (`./libs`)

Advanced libraries and utilities (full-text search, etc.):

```tsx
import { FullTextSearchInput, useFullTextSearch } from "@galacius/design-system/libs";
```

## Publishing

Version bumps and publishing are automated:

1. Bump the version in `package.json`
2. Commit and push to the main branch
3. Create a git tag: `git tag design-system/vX.Y.Z` and push it
4. The `.github/workflows/job-publish-design-system.yml` workflow (invoked from `cd.yml`) automatically:
   - Builds the package using `tsup`
   - Publishes to [GitHub Packages](https://github.com/orgs/galacius/packages) as `@galacius/design-system`

## Contributing

For contribution guidelines and setup instructions, see the [main repository](/).
