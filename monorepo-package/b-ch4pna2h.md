# Generated configuration for a package that holds no TypeScript

A Minecraft pack package that declares no script module holds no `src/`, and two repo-kit features do not
account for that:

- the `typescript` feature is unconditional and writes `tsconfig.json`, `tsconfig.build.json` and a
  `typecheck` script into the package, where `tsc --noEmit` has no inputs;
- the `test` feature keys on `src/**/*.test.ts`, so such a package gets no test script at all.

`@twin-digital/village-guard` sidesteps both by carrying a `src/` for its script module, which is not
available to a pack that deliberately has none — `mc-rpg-core`'s assets pack is the case, and its survey
raised it.

Also worth deciding together with those: such a package needs a `package-manifest: false` opt-out, which six
packages already carry with a comment. That part is settled practice; the question is whether a
no-TypeScript pack should need three opt-outs or whether the features should key on what the package holds.
