# Contributing to Galacius's Plugin Core SDK

## Testing local changes against a consumer project

Use a local [Verdaccio](https://github.com/verdaccio/verdaccio) registry to publish your in-progress `@galacius/core` changes and install them in a consumer project (e.g. a plugin in `galacius-plugins`), without touching the real npm registry.

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

4. From `packages/core/frontend/`, bump the version to a `1.0.0-local.<N>` prerelease (never a version that looks like a real release — `@galacius/core` real releases are tagged `packages/core/vX.Y.Z`, and a real-looking local version risks colliding with that scheme), build, then publish

```bash
cd packages/core/frontend
# edit package.json: "version": "1.0.0-local.<N>" (bump N if that version is already published, check with:
#   npm view @galacius/core versions --registry http://localhost:4873)
pnpm run build
npm publish --no-git-checks --access public --tag local --registry http://localhost:4873
```

`--tag local` is required — npm refuses to publish a prerelease version without an explicit dist-tag.

5. Revert `packages/core/frontend/package.json`'s version back to `1.0.0` right after publishing — don't leave a `-local.N` version sitting in the file while you test the consumer.

6. In the consumer project (e.g. a plugin under `galacius-plugins`), point its `@galacius` scope at the local registry too and install the version you just published (adjust to the consumer's package manager — `npm`/`pnpm`/`yarn`)

```bash
npm config set @galacius:registry http://localhost:4873
pnpm add @galacius/core@1.0.0-local.<N> --registry http://localhost:4873
```

Verify your change there (build, typecheck, `wails dev` smoke test, etc.) before continuing.

7. When done testing, unset the scoped registry override so `@galacius` resolves from the real registry again

```bash
npm config delete @galacius:registry
```

8. Revert the consumer's dependency on `@galacius/core` back to its original pinned version (don't commit a `1.0.0-local.N` dependency), and regenerate its lockfile.

## Publishing a real release

Once the change is reviewed and merged, cut an actual release by tagging `packages/core/vX.Y.Z` on `main` — CI builds and publishes `@galacius/core` to the real npm registry from there. Don't publish manually from a local machine for real releases.
