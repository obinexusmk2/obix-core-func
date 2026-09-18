# API reference

Full type and function surface of `@obinexusltd/obix-core-func`.

## `createFunctional(definition, overrides?)`

```ts
function createFunctional<State extends object, Actions extends OBIXActionMap<State>>(
  definition: OBIXDataDefinition<State, Actions>,
  overrides?: { state?: State },
): OBIXFunctionalInstance<State, Actions>;
```

`definition` comes from `@obinexusltd/obix-core-data`'s own `defineData` —
import it from there, not from this package (this package only adds
`createFunctional` on top; it doesn't re-export the data layer's own
functions). `overrides.state`, when given, is passed straight through to
`createDataInstance` — the same way to resume a functional instance from a
previously taken snapshot.

Internally, `createFunctional`:

1. Calls `createDataInstance(definition, overrides)` — the *only* place
   state is created or cloned. This package never clones, freezes, or
   otherwise duplicates state itself.
2. Binds each of `definition.actions` to a function that builds
   `{ state: instance.state }` fresh on every call and invokes the
   underlying action against it directly — unlike
   `instance.actions` (obix-core-data's own bound actions, which discard
   return values by design, since the data layer doesn't need them), this
   binding returns whatever the action returns.
3. Adds `getState()` (reads `instance.state` — the live, current value,
   not a copy) and `snapshot()` (delegates to obix-core-data's own
   `snapshotData(instance)` — no snapshot logic is reimplemented here).

## `OBIXFunctionalInstance<State, Actions>`

```ts
type OBIXFunctionalInstance<State extends object, Actions extends OBIXActionMap<State>> =
  OBIXFunctionalActions<State, Actions> & {
    readonly instance: OBIXDataInstance<State, Actions>;
    getState(): State;
    snapshot(): OBIXSnapshot<State>;
  };
```

Every key of `Actions` is callable directly on the returned object
(`counter.increment()`, `counter.add(4)`) — no `context` argument, no
`.actions.` prefix, no `dispatch("name", payload)` string lookup.
`instance` is the exact `OBIXDataInstance` every bound action and
`getState()` read from — there is one state value, not a copy held by
this package and a second one held by obix-core-data.

## `OBIXFunctionalActions<State, Actions>`

```ts
type OBIXFunctionalActions<State extends object, Actions extends OBIXActionMap<State>> = {
  [K in keyof Actions]: (...args: OBIXActionArgs<State, Actions[K]>) => OBIXActionReturn<State, Actions[K]>;
};
```

Reuses `OBIXActionArgs` from `obix-core-data` for argument types, and adds
`OBIXActionReturn` (below) for the return type — so
`add(ctx, amount: number): number` in the definition becomes
`add(amount: number): number` here, not `add(...args: any[]): any`.

## `OBIXActionReturn<State, Action>`

```ts
type OBIXActionReturn<State, Action> = Action extends (
  context: OBIXDataContext<State>,
  ...args: any[]
) => infer Return
  ? Return
  : never;
```

Recovers one action's actual return type from the concrete function type
TypeScript inferred at the `defineData(...)` call site.
`obix-core-data`'s own `OBIXAction<State, Args>` is declared as returning
`void` — correct for the data layer, which only needs the mutation — but a
generic constraint only limits what's *allowed*, not what TypeScript
*infers*: `defineData`'s `Actions` type parameter still carries each
action's real, concrete return type (`number`, `Promise<number>`,
whatever it actually is), and this type extracts it. See
[architecture.md](architecture.md#why-not-instanceactions) for why this
package binds actions itself instead of reusing
`instance.actions` from obix-core-data.

## What this package does **not** export

- No `defineData`, `createDataInstance`, `serializeData`, or any other
  `obix-core-data` runtime export — import those from
  `@obinexusltd/obix-core-data` directly. This package adds exactly one
  function (`createFunctional`) on top of that layer.
- No `dispatch(name, payload)` string-keyed action invocation — actions
  are plain callable methods.
- No `render`/`validate`/`derived`/`effects` — out of scope for a
  functional-paradigm adapter; see the data layer's own
  [architecture doc](../../obix-core-data/docs/architecture.md#why-no-reducerendervalidate-here).
