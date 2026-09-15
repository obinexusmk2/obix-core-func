# Zero-dependency vendoring

This package has no `dependencies` in `package.json` at all — not
`@obinexusltd/obix-spec`, not `@obinexusltd/obix-ir`, nothing. This page
explains the vendoring strategy that makes that possible, and what it
means for how you should (and shouldn't) modify `src/types.ts`, `src/dop.ts`,
or `src/env.d.ts`.

## Why vendor instead of depend

The comments at the top of `types.ts` and `dop.ts` both say the same
thing: these files are meant to be **byte-identical across every
`@obinexusltd/obix-adapter-*` package** (`obix-adapter-data`,
`obix-adapter-oop`, `obix-adapter-reactive`, `obix-adapter-ssr`, and this
package's functional projection). Rather than every adapter importing a
shared `@obinexusltd/obix-spec`-style package for the `DOPComponent` type
and the reducer, each adapter carries its own copy. TypeScript's
structural typing means this works transparently: a single `DOPComponent`
object literal you write satisfies every adapter's `DOPComponent<S, P>`
type simultaneously, as long as the vendored type shapes actually stay
identical across packages — there's no shared nominal type tying them
together, just "shaped the same."

The tradeoff being made: **zero install-time dependency resolution, zero
version-skew risk between an adapter and a shared spec package, at the
cost of the vendored files being duplicated source, not a single source of
truth.** If the canonical `DOPComponent` shape changes, every adapter
package's `types.ts` needs the same edit applied by hand (or by tooling
external to this package) — there is nothing in this package that checks
its `types.ts`/`dop.ts` still match any other adapter's copy.

## The three vendored files

| File | Vendors |
|---|---|
| `src/types.ts` | `DOPComponent`, `ActionContext`, `ActionFn`, `RenderView`, `EffectDescriptor`, `ValidationResult`, `ActionTrace` — pure type declarations, erased at compile time; no runtime cost. |
| `src/dop.ts` | `reduce`, `replay`, `view`, `renderHtml`, `validate`, `changedKeys` — the actual reducer logic. This *is* runtime code, compiled into `dist/dop.js` and imported by `index.ts`. |
| `src/env.d.ts` | Ambient declarations for `structuredClone`, `setInterval`, `clearInterval` — so this package doesn't need `@types/node` or a DOM lib reference to type-check `dop.ts`'s use of `structuredClone`. Purely a type-checking aid; it emits nothing (`.d.ts` files aren't compiled to JS). |

## What "byte-identical" means for you, practically

If you ever need to change the DOP artifact shape or reducer behavior for
this package specifically (not as part of a coordinated change across the
whole adapter family), you're intentionally diverging from that
convention — that's a valid thing to do, but it means this package's
`DOPComponent` may stop being structurally interchangeable with the other
adapters' component types, and the "renders identical HTML to `data`/
`oop`/`reactive`/`ssr` for the same artifact" compliance claim in the
[README](../README.md) would need re-verifying against whatever you
changed.

Conversely, if you're fixing a bug in `dop.ts`'s `reduce` (e.g. something
about the cloning fallback, or the `ctx[otherAction]` wiring — see
[reduce-and-replay.md](reduce-and-replay.md)), the byte-identical
convention means the same fix likely needs porting to the sibling adapter
packages' own `dop.ts` copies too, if you want the family to stay in sync
— this package's own test suite (`__tests__/functional.test.mjs`) only
exercises this package's copy, not the others.

## `changedKeys` ships but isn't used by this package's public API

`dop.ts` exports `changedKeys(prev, next): string[]` — a shallow
changed-key diff between two state objects — but `src/index.ts` never
imports or calls it (see [api-reference.md](api-reference.md)). It's
still compiled to `dist/dop.js` and reachable if you import from
`@obinexusltd/obix-core-func/src` directly (see the `"./src"` export
in `package.json`) or from the compiled `dist/dop.js` path, but there's no
public entry point on `FunctionalProjection`/`FunctionalInstance` that
exposes it. If you want a "what changed since the last dispatch" signal
from a `create()` instance, you'd need to call `changedKeys` yourself
between two `getState()` snapshots — this package doesn't wire that up for
you.
