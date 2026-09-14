# Contributing to Galacius's Design System

## Testing local changes against a consumer project

Use a local [Verdaccio](https://github.com/verdaccio/verdaccio) registry to publish your in-progress `@galacius/design-system` changes and install them in a consumer project, without touching the real npm registry.

1. Install Verdaccio globally

```bash
npm install -g verdaccio
```

2. Start the local registry (leave this running in its own terminal)

```bash
verdaccio
```

3. Point the `@galacius` scope at the local registry and log in (any username/password/email works for a local instance)

```bash
npm config set @galacius:registry http://localhost:4873
npm adduser --registry http://localhost:4873
```

4. From `design-system/`, bump the version so it's newer than what's already installed in the consumer project (Verdaccio, like npm, rejects re-publishing an existing version), build, then publish

```bash
cd design-system
npm version prerelease --preid local --no-git-tag-version
pnpm run build
pnpm publish --no-git-checks --access public --registry http://localhost:4873
```

5. In the consumer project, point its `@galacius` scope at the local registry too and install the version you just published (adjust to the consumer's package manager — `npm`/`pnpm`/`yarn`)

```bash
npm config set @galacius:registry http://localhost:4873
npm install @galacius/design-system@<version-you-published> --registry http://localhost:4873
```

Verify your fix there (dev server, type-check, etc.) before continuing.

6. When done testing, unset the scoped registry override so `@galacius` resolves from the real registry again

```bash
npm config delete @galacius:registry
```

7. Revert the local version bump in `design-system/package.json` (don't commit a `-local.N` prerelease version) before opening your PR.

## Publishing a real release

Once the change is reviewed and merged, cut an actual release by tagging `design-system/vX.Y.Z` on `main` — CI builds and publishes `@galacius/design-system` to the real npm registry from there. Don't publish manually from a local machine for real releases.
