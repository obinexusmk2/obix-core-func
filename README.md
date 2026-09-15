# @obinexusltd/obix-core-func

**The Functional projection — pure `reduce` / `replay` + a `create()` closure.**
Zero dependencies. Vendors its own DOP artifact types and reducer
(`src/types.ts`, `src/dop.ts`), the same way every
`@obinexusltd/obix-adapter-*` sibling package does, instead of importing
`@obinexusltd/obix-spec`/`@obinexusltd/obix-ir`.

```bash
npm install @obinexusltd/obix-core-func
```

## Where this package came from

This package merges two prior implementations that had diverged:

- An earlier, dependency-based version (published as
  `@obinexusltd/obix-adapter-functional` v0.2.1, depending on
  `@obinexusltd/obix-spec` + `@obinexusltd/obix-ir`'s `applyAction`) — its
  `reduce`/`replay` were also exposed under a `pure` namespace.
- A separate, zero-dependency rewrite (living at
  `obix/adapters/obix-adapter-func`, v0.3.0) — vendors its own reducer, and
  its `DOPComponent` artifact type additionally supports `derived` and
  `effects`, which the dependency-based version's `DOPArtifact` type did
  not expose.

This package adopts the zero-dependency implementation as its base and
**also** exposes `reduce`/`replay` under `.pure` for code written against
the older API shape — see [docs/pure-compatibility-layer.md](docs/pure-compatibility-layer.md)
for exactly what that alias does and doesn't guarantee.
`obix/adapters/obix-adapter-func` is a separate package and was not
modified as part of this merge.

## The DOP artifact

The plain object this (and every `@obinexusltd/obix-adapter-*`) package
consumes:

```ts
interface DOPComponent<S, P = {}> {
  name: string;
  state: S;
  actions: Record<string, (ctx, payload?) => void>;   // mutate ctx.state
  derived?: Record<string, (state, props) => unknown>;
  effects?: Record<string, EffectDescriptor<S, P>>;
  render?: (view: { state; props; derived }) => string;
  validate?: (state, props) => { valid: boolean; violations: string[] };
}
```

## API

```ts
import { toFunctional } from "@obinexusltd/obix-core-func";

const F = toFunctional(Counter);

// pure
F.reduce({ count: 0 }, "inc");                 // => { count: 1 }
F.replay([["inc"], ["inc"], ["dec"]]);         // fold a trace

// same functions, exposed under .pure for callers migrating from the
// obix-spec/obix-ir-based API — not a second implementation
F.pure.reduce({ count: 0 }, "inc");            // === F.reduce
F.pure.replay([["inc"], ["inc"]]);             // === F.replay

// closure instance
const inst = F.create({ props: { max: 10 } });
inst.dispatch("inc");
inst.getState();     // { count: 1 }
inst.render();        // '<button aria-label="count: 1">1</button>'
inst.validate();      // { valid: true, violations: [] }
```

| Export | Shape |
|---|---|
| `toFunctional(c)` | `{ artifact, reduce, replay, create, pure: { reduce, replay } }` |
| `.reduce(state, action, payload?, props?)` | one transition → new state |
| `.replay(trace, from?, props?)` | fold `[["inc"], ["dec", 2]]` |
| `.pure.reduce` / `.pure.replay` | aliases of the two above |
| `.create(opts?)` | `{ getState, dispatch, render, validate }` — closure-held state |

See [docs/api-reference.md](docs/api-reference.md) for the full type
reference.

## Docs

- [docs/api-reference.md](docs/api-reference.md) — full type reference for `DOPComponent`, `FunctionalProjection`, `FunctionalInstance`, and the vendored `dop.ts` functions
- [docs/reduce-and-replay.md](docs/reduce-and-replay.md) — the single action path: `reduce`'s clone-per-call semantics, action-lookup dispatch, and `replay`'s fold
- [docs/create-closure-instance.md](docs/create-closure-instance.md) — `create()`'s closure-held state, `render`/`validate` wiring, and props merging
- [docs/pure-compatibility-layer.md](docs/pure-compatibility-layer.md) — exactly what `.pure` does and doesn't preserve from the old obix-spec/obix-ir API
- [docs/zero-dependency-vendoring.md](docs/zero-dependency-vendoring.md) — why `types.ts`/`dop.ts`/`env.d.ts` are duplicated rather than imported, and what "byte-identical across the family" means in practice

## Compliance

`@obinexusltd/obix-adapter-ssr` is the reference: for any trace, this
projection should render the **identical** HTML string that `data`, `oop`,
`reactive` and `ssr` render for the same `DOPComponent`. This package
doesn't verify that itself — see
[docs/zero-dependency-vendoring.md](docs/zero-dependency-vendoring.md) for
what "byte-identical" is actually asserting and what would need to check
it.

## Boundary

- **Actions mutate a clone, not the original.** `reduce` deep-clones
  `state` (via `structuredClone`, falling back to `JSON.parse(JSON.stringify(...))`)
  before running the action against it — so action functions read as
  "mutate `ctx.state`" but never touch the state object you passed in. See
  [reduce-and-replay.md](docs/reduce-and-replay.md).
- **An unknown action name throws**, both from `reduce` directly and from
  inside `replay`'s fold — there's no "no-op for unrecognized action"
  fallback.
- **`.pure` is a compatibility alias, not a distinct code path.**
  `F.pure.reduce === F.reduce` — see
  [docs/pure-compatibility-layer.md](docs/pure-compatibility-layer.md) for
  what didn't carry over from the old API (its `Payload`/`State`/`Props`
  types from `@obinexusltd/obix-spec`, and the `initialState` field name —
  this package's artifacts use `state`, not `initialState`).
- **No `effects` runner.** `DOPComponent.effects` (`EffectDescriptor`) is
  typed and exported but nothing in this package schedules or executes
  them — same "typed but unused" pattern as several other OBIX packages in
  this monorepo. If you need `everyMs`/`while`/`dispatch`-driven effects to
  actually run, that has to be implemented by the caller.

MIT — OBINexus Computing
