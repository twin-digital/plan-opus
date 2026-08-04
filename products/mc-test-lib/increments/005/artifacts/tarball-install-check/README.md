# The packed-tarball install check

Follows the shim's documented install in a consumer project that resolves
`@twin-digital/minecraft-test-lib` as a real `node_modules` package rather than a workspace
symlink, and asserts that class identity and fake recognition survive `loadPack`'s module-registry
reset there.

The distinction matters because a runner externalizes a real install and inlines a linked workspace
dependency by different rules. A workspace-symlinked pass is not evidence about a consumer's
install.

## Steps

```sh
# 1. build and pack, from nodejs/minecraft/test-lib in the opus repository
pnpm build
npm pack --pack-destination "$EXP"          # → twin-digital-minecraft-test-lib-0.2.0.tgz

# 2. install the tarball into a scratch consumer outside the package's worktree
cd "$EXP/consumer" && npm install --no-audit --no-fund

# 3. confirm the install shape
test -L node_modules/@twin-digital/minecraft-test-lib && echo SYMLINK || echo "REAL DIRECTORY"

# 4. run the suites
npx vitest run --reporter=verbose
```

`consumer/` holds the whole project the steps install into: `package.json` taking the library from
the tarball, `vitest.config.ts` carrying the one plugin entry and nothing else, `src/pack.ts`
standing in for an unmodified behavior pack, and the two suites.

## What it checks

- the one-entry install, followed as the README documents it, with no setup file written
  (`r-uobnqsfg`)
- an unmodified pack's value imports from `@minecraft/server` resolving under the plugin alone
  (`r-vzz9rnrc`)
- `instanceof` against a statically imported surface class, and a statically imported error class
  caught, both after `loadPack` reset the module registry (`d-c9mjn8o5`, `d-kxlf8c66`)
- the install completing with no peer warning for the package (`d-vjeple9k`, `d-yv1yensc`)

## Captured run

`OUTPUT.txt` — 9 passed, against `REAL DIRECTORY`. node v24.16.0, npm 11.13.0, vitest 4.1.10,
vite 8.2.0; library 0.2.0 from the tarball.

The tarball is installed through a `file:` spec pointing at the tarball, which npm unpacks into a
real `node_modules` directory — the shape a registry install takes. A registry fetch itself was not
exercised, and a consumer calling `vi.resetModules()` by hand outside `loadPack` was not measured.
