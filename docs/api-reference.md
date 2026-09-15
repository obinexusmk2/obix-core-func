# API reference

Full type and function surface of `@obinexusltd/obix-core-func`, across
`src/index.ts` (the public API), `src/dop.ts` (the vendored reducer, not
exported directly but documented here since `index.ts`'s behavior is
defined by it), and `src/types.ts` (the vendored DOP artifact types).

## Public exports (`src/index.ts`)

```ts
export function toFunctional<S extends object, P extends object = Record<string, unknown>>(
  artifact: DOPComponent<S, P>,
): FunctionalProjection<S, P>;

export interface FunctionalInstance<S extends object> {
  getState(): S;
  dispatch(actionName: string, payload?: unknown): S;
  render(): string;
  validate(): ValidationResult;
}

export interface FunctionalProjection<S extends object, P extends object> {
  readonly artifact: DOPComponent<S, P>;
  reduce(state: S, actionName: string, payload?: unknown, props?: P): S;
  replay(trace: ActionTrace, from?: S, props?: P): S;
  create(opts?: { state?: S; props?: Partial<P> }): FunctionalInstance<S>;
  pure: {
    reduce(state: S, actionName: string, payload?: unknown, props?: P): S;
    replay(trace: ActionTrace, from?: S, props?: P): S;
  };
}
```

Also re-exported (type-only): `ActionContext`, `ActionFn`, `ActionTrace`,
`DOPComponent`, `EffectDescriptor`, `RenderView`, `ValidationResult` — all
from `src/types.ts`.

### `toFunctional(artifact)`

The only factory. Stateless with respect to `artifact` — calling it
multiple times on the same `artifact` object is safe and cheap; it just
closes over three small functions (`reduceOne`, `replayTrace`, `create`)
and returns a fresh object each time. See
[reduce-and-replay.md](reduce-and-replay.md) and
[create-closure-instance.md](create-closure-instance.md) for what each
returned member actually does.

## `DOPComponent<S, P>` (`src/types.ts`)

```ts
interface DOPComponent<S extends object = Record<string, unknown>, P extends object = Record<string, unknown>> {
  name: string;
  state: S;
  props?: P;
  actions: Record<string, ActionFn<S, P>>;
  derived?: Record<string, (state: S, props: P) => unknown>;
  effects?: Record<string, EffectDescriptor<S, P>>;
  render?: (view: RenderView<S, P>) => string;
  validate?: (state: S, props: P) => ValidationResult;
}
```

| Field | Read by |
|---|---|
| `name` | `dop.ts`'s `reduce`, only to build the "unknown action" error message. |
| `state` | Used as the default initial state by `replay` (when `from` is omitted) and `create` (when `opts.state` is omitted). |
| `props` | Used as the default `props` by `reduce`/`replay`/`create`/`view`/`validate` whenever a call-site `props` isn't supplied. |
| `actions` | `reduce` looks up `actions[actionName]`; also used to build the `ctx[name]` self-dispatch helpers (see [reduce-and-replay.md](reduce-and-replay.md)). |
| `derived` | `view()` (called internally by `renderHtml`) computes each entry against the current `state`/`props`. |
| `effects` | **Not read anywhere in this package.** Typed for a future effects runner; see the Boundary section in the [README](../README.md). |
| `render` | `renderHtml()` calls it with the computed `RenderView`, if present; otherwise `renderHtml` returns `""`. |
| `validate` | `validate()` calls it if present; otherwise returns `{ valid: true, violations: [] }`. |

### `ActionContext<S, P>`

```ts
interface ActionContext<S extends object, P extends object = Record<string, unknown>> {
  state: S;
  props: P;
  [action: string]: unknown;
}
```

The object every `ActionFn` receives as `ctx`. Beyond `state`/`props`, it
also carries one callable property **per action name** in the component —
see [reduce-and-replay.md](reduce-and-replay.md#ctx-carries-every-other-action-as-a-callable) for exactly what those do.

### `RenderView<S, P>`

```ts
interface RenderView<S extends object, P extends object = Record<string, unknown>> {
  state: S;
  props: P;
  derived: Record<string, unknown>;
  [key: string]: unknown;
}
```

What a component's `render(view)` function receives — see
[reduce-and-replay.md](reduce-and-replay.md#view-and-renderhtml) for how
it's assembled (it's not just `{ state, props, derived }` — every key of
`props`, `state`, and `derived` is also spread onto the top level).

### `EffectDescriptor<S, P>`

```ts
interface EffectDescriptor<S extends object, P extends object = Record<string, unknown>> {
  everyMs: number;
  while: (state: S, props: P) => boolean;
  dispatch: string;
}
```

Typed, exported, and assignable on `DOPComponent.effects` — but nothing in
this package schedules `setInterval`-driven dispatches from it. `env.d.ts`
declares ambient `setInterval`/`clearInterval` specifically so a consumer
(or a future version of this package) could implement an effects runner
without adding a dependency, but no such runner exists here yet.

### `ValidationResult` / `ActionTrace` / `ActionFn`

```ts
interface ValidationResult { valid: boolean; violations: string[]; }
type ActionFn<S, P> = (ctx: ActionContext<S, P>, payload?: unknown) => void;
type ActionTrace = ReadonlyArray<readonly [string, unknown?]>;
```

`ActionFn` returns `void` — actions communicate their effect entirely by
mutating `ctx.state` (and, via the `ctx[otherAction]` helpers, by
triggering other actions), not by returning a value. `ActionTrace` entries
are `[actionName]` or `[actionName, payload]` tuples — `replay` reads
`step[0]`/`step[1]` positionally.

## Vendored reducer (`src/dop.ts`, internal — not exported from the package)

| Function | Used by |
|---|---|
| `reduce(component, state, actionName, payload?, props?)` | `index.ts`'s `reduceOne` and `create()`'s `dispatch`. |
| `replay(component, trace, from?, props?)` | `index.ts`'s `replayTrace`, aliased as both `.replay` and `.pure.replay`. |
| `view(component, state, props?)` | `renderHtml`, internally — not exposed on `FunctionalProjection`/`FunctionalInstance` directly. |
| `renderHtml(component, state, props?)` | `create()`'s `render()`. |
| `validate(component, state, props?)` | `create()`'s `validate()`. |
| `changedKeys(prev, next)` | **Not called anywhere in `index.ts`.** Exported from `dop.ts` but unused by this package's public API — available if you import `./dop.js` directly (see [docs/zero-dependency-vendoring.md](zero-dependency-vendoring.md) on why these files are plain, importable modules rather than private internals). |

Full behavior of each: [reduce-and-replay.md](reduce-and-replay.md).
