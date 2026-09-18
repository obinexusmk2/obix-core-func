# Architecture

## Data is canonical; this package is a view over it

```
                    obix-core-data
                         |
              canonical definitions
              state
              actions
              instances
              snapshots
                         |
                         v
                  obix-core-func
                         |
                  functional view
                (callable functions,
                 no state of its own)
```

`obix-core-func` does not have a state model. It has exactly one job:
take an `OBIXDataDefinition` from `@obinexusltd/obix-core-data` and expose
its actions as plain, directly-callable functions instead of a
`{ state, actions }` pair the caller has to thread through
`instance.actions.foo(...)`. The state itself — creation, cloning,
isolation between instances, freezing the definition — is entirely
`obix-core-data`'s responsibility. This package depends on
`@obinexusltd/obix-core-data` and nothing else.

## Why not `instance.actions`?

`createDataInstance` (from `obix-core-data`) already returns bound
actions. `createFunctional` doesn't just re-export those, for one
concrete reason: `obix-core-data`'s `OBIXBoundActions` type — and its
runtime implementation — discards each action's return value:

```ts
// obix-core-data's own bound-action wrapper (simplified)
actions[key] = (...args) => {
  action(context, args); // return value dropped, wrapper itself returns void
};
```

That's the right call *for the data layer*, which models actions purely
as state transitions (`S₀ → S₁`) and has no reason to care what an action
computes and returns along the way. But a functional adapter's whole
value proposition includes `const total = counter.value()` — a return
value is exactly the kind of thing functional-style code composes with.
So `createFunctional` builds its own binding directly against
`definition.actions`, one level below `instance.actions`:

```ts
bound[key] = (...args) => {
  const context = { state: instance.state };
  return action(context, ...args); // <- returned, not dropped
};
```

`instance.state` is still the single source of truth — `context.state`
above is the *exact same object*, read fresh on every call, never cloned
or cached. `instance` itself (obtained from `createDataInstance`) is what
guarantees that state to be properly isolated from every other instance
and from the definition, and it's also what `snapshot()` hands to
`snapshotData`. Nothing about the return-value binding above duplicates
what `obix-core-data` already does — it re-invokes the same action
against the same context shape, purely to avoid throwing the result away.

**Compatibility note:** because this binding builds a fresh
`{ state: instance.state }` per call rather than reusing
`obix-core-data`'s own internal context object, an action that does a
*full replacement* of `ctx.state` (`ctx.state = someNewObject`, as opposed
to mutating a property on it) will not be reflected back through
`instance.state`. Every action in this package's own examples and tests
mutates state in place (`ctx.state.count++`) — the pattern
`obix-core-data`'s own docs and examples use throughout — which this
binding handles correctly. Whole-state replacement would need a different
integration point in `obix-core-data` itself; that's a `obix-core-data`
change, not something this package can paper over, and isn't required by
anything in this package's own scope.

## No second state architecture

Concretely, that means:

- `createFunctional` never calls `cloneData`, `Object.freeze`, or any
  other state-shaping primitive itself — those all happen inside
  `createDataInstance`.
- `getState()` returns `instance.state` directly — the live object, not a
  defensive copy this package made.
- `snapshot()` calls `snapshotData(instance)` — obix-core-data's own
  snapshot logic, not a reimplementation.
- Two `createFunctional(SameDefinition)` calls are isolated from each
  other for exactly the same reason two `createDataInstance(SameDefinition)`
  calls are: each one holds its own `OBIXDataInstance`, and
  `obix-core-data` already guarantees those don't share state.

## Non-goals

No rendering, no DOM, no React/JSX, no class-based OOP model, no AST
transpilation between paradigms, no telemetry, and no state minimization —
all deliberately out of scope here; see the parent task's non-goals for
the full list. A future OOP adapter is expected to sit beside this
package, at the same layer, consuming the same `obix-core-data`
definitions — not on top of or underneath this one.
