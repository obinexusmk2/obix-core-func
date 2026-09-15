# The `.pure` compatibility layer

This package's `FunctionalProjection` exposes `reduce`/`replay` twice —
once at the top level, and again under `.pure`:

```ts
return {
  artifact,
  reduce: reduceOne,
  replay: replayTrace,
  create,
  pure: { reduce: reduceOne, replay: replayTrace },
};
```

This page explains why `.pure` exists, exactly what it preserves from the
package's history, and — just as importantly — what it does **not**
preserve.

## Why it exists

Before this package was `@obinexusltd/obix-core-func`, an earlier version
of this same "Functional projection" concept was published as
`@obinexusltd/obix-adapter-functional` (v0.2.1). That version depended on
`@obinexusltd/obix-spec` and `@obinexusltd/obix-ir`, and its
`FunctionalProjection` type exposed the same two functions under a `pure`
namespace:

```ts
// the OLD (v0.2.1) shape:
export function toFunctional<S, P>(artifact: DOPArtifact<S, P>): FunctionalProjection<S, P> {
  const reduce = (state, actionName, payload, props) => applyAction(artifact, state, actionName, payload, props);
  const replay = (trace, from, props) => { /* fold via reduce */ };
  // ...
  return { artifact, reduce, replay, create, pure: { reduce, replay } };
}
```

This package's current implementation is a from-scratch, zero-dependency
rewrite (see [zero-dependency-vendoring.md](zero-dependency-vendoring.md))
— it does not call `applyAction` from `@obinexusltd/obix-ir` at all, and
never did as shipped here. `.pure` was added specifically so that code
written against the old `F.pure.reduce(...)`/`F.pure.replay(...)` call
shape keeps working unmodified against this package.

## What `.pure` actually is: a plain alias, not a second implementation

```ts
F.pure.reduce === F.reduce; // true
F.pure.replay === F.replay; // true
```

`pure.reduce` and `pure.replay` are literally the same function
references as the top-level `reduce`/`replay` — not wrappers, not a
parallel code path with its own logic. There is exactly one reducer in
this package (`dop.ts`'s `reduce`), and both the top-level and `.pure`
entry points call into it identically. This is different from the old
package, where `pure.reduce`/`pure.replay` were *also* the same references
as its own top-level `reduce`/`replay` — so in that respect, the
compatibility is exact: whatever you called on `.pure` before behaves the
same as calling the un-prefixed version, then and now.

## What did **not** carry over

The call *shape* (`.pure.reduce(state, actionName, payload, props)`) is
preserved, but the **types and semantics around it changed** along with
the rest of this package's rewrite:

| Old (`obix-adapter-functional` v0.2.1) | This package |
|---|---|
| Artifact type: `DOPArtifact<S, P>` from `@obinexusltd/obix-spec`, with an `initialState` field | Artifact type: `DOPComponent<S, P>` (vendored in `src/types.ts`), with a `state` field — **not** `initialState`. A `DOPArtifact`-shaped object with `initialState` but no `state` will not work here; `reduce`/`replay`/`create` all read `component.state`. |
| `payload` typed as `Payload` from `@obinexusltd/obix-spec` | `payload` typed as plain `unknown` |
| Action dispatch: `applyAction(artifact, state, actionName, payload, props)` from `@obinexusltd/obix-ir` — implementation not vendored into this package, so its exact mutation/cloning strategy isn't reproduced here | Action dispatch: this package's own `dop.ts` `reduce` — clones via `structuredClone` (or a JSON fallback), attaches `ctx[otherAction]` self-dispatch helpers. See [reduce-and-replay.md](reduce-and-replay.md). If the old `applyAction` had different cloning behavior, edge cases (e.g. non-JSON-safe state shapes, or how sibling-action calls were supported) may differ. |
| No `derived`/`effects` on the artifact type | `DOPComponent` supports `derived` (read by `view`/`render`) and `effects` (typed, unused — see the [README](../README.md) Boundary section) |
| `render()`/`validate()` signature: `artifact.render(cur, props)` / `artifact.validate(cur, props)` — direct two-argument calls | `render()`/`validate()`: `component.render(view)` (a single `RenderView` object, not `(state, props)`) / `component.validate(state, props)` (unchanged shape) — **a component's `render` function written for the old API needs its signature updated** to accept one `RenderView` argument instead of two. |

## Practical migration note

If you're porting a `DOPArtifact`-shaped component from the old API: rename
`initialState` → `state`, and rewrite any `render(state, props)` function
to `render(view)` where `view.state`/`view.props`/`view.derived` (and,
per [reduce-and-replay.md](reduce-and-replay.md#view-and-renderhtml), the
flattened spread of all three) are available on the single `view`
argument. `validate(state, props)` needs no change — that signature is
identical in both versions.
