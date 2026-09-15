# `create()`: the closure instance

```ts
const create = (opts: { state?: S; props?: Partial<P> } = {}): FunctionalInstance<S> => {
  let current: S = opts.state ?? artifact.state;
  const props = Object.freeze({ ...(artifact.props ?? {}), ...(opts.props ?? {}) }) as P;
  return {
    getState: () => current,
    dispatch(actionName, payload) {
      current = reduce(artifact, current, actionName, payload, props);
      return current;
    },
    render: () => renderHtml(artifact, current, props),
    validate: () => validateState(artifact, current, props),
  };
};
```

`create()` is the stateful alternative to calling `reduce`/`replay`
yourself and threading the result through your own variable — it holds
`current` in a closure and gives you `dispatch`/`getState`/`render`/
`validate` methods that all read/write that same closed-over variable.

## Initial state and props are captured once, at `create()` time

- `current` starts as `opts.state ?? artifact.state` — if you don't pass
  `state`, the instance starts from the component's own `state` field.
  Passing `opts.state` (or not) is decided once; there's no way to reset
  an instance back to its initial state later short of calling `create()`
  again.
- `props` is `Object.freeze({ ...(artifact.props ?? {}), ...(opts.props ?? {}) })`
  — `opts.props` is shallow-merged **on top of** `artifact.props`, then
  the whole thing is frozen. This merged, frozen `props` object is reused
  for every `dispatch`/`render`/`validate` call on this instance — there's
  no way to change an instance's `props` after `create()` returns (calling
  `toFunctional(artifact).create(...)` again is required for different
  props).
- Because the merge is shallow, a nested object in `artifact.props` that
  isn't also present in `opts.props` is kept by reference from
  `artifact.props` (not deep-cloned) — mutating a nested object reachable
  from the instance's `props` would be visible from `artifact.props` too,
  and from any other instance created from the same `artifact` that didn't
  override that nested field. `Object.freeze` is shallow: it prevents
  reassigning top-level keys on the merged `props` object, but does not
  freeze nested objects within it.

## `dispatch` reuses the same `reduce` as everything else

`dispatch(actionName, payload)` calls the exact same `dop.ts` `reduce`
function that `F.reduce`/`F.replay` use — see
[reduce-and-replay.md](reduce-and-replay.md) for the clone-per-call
semantics, the unknown-action throw, and the `ctx[otherAction]` composition
mechanism, all of which apply identically here. `dispatch` returns the new
state (same value `getState()` will return immediately after), so you can
chain without a separate `getState()` call if you just need the result of
this one dispatch:

```ts
const inst = toFunctional(Counter).create();
const afterInc = inst.dispatch("inc"); // === inst.getState() right now
```

An action that throws (unknown name, or the action function itself
throwing) propagates out of `dispatch` **without** updating `current` —
`reduce` throws before returning, so the assignment `current = reduce(...)`
never happens, leaving the instance's state exactly as it was before the
failed `dispatch` call.

## `render()` and `validate()` always use current state

Both re-derive from `current` (and the instance's frozen `props`) on every
call — they're not cached. `render()` recomputes the full `view` (state +
props + derived, per [reduce-and-replay.md](reduce-and-replay.md#view-and-renderhtml))
from scratch each time, including re-running every `derived` function.
`validate()` similarly always calls `component.validate(current, props)`
fresh (or returns the default `{ valid: true, violations: [] }` if the
component has no `validate`).

## No subscription/change-notification mechanism

`FunctionalInstance` has no `subscribe`/`onChange`/event-emitter surface —
if you need to react to state changes (e.g. to re-render a UI), you have
to call `dispatch` yourself and then explicitly call `getState()`/
`render()` afterward; nothing in this package pushes updates to you.

## Multiple instances from one `artifact` are independent

Each `create()` call closes over its own `current`/`props` — two
instances created from the same `artifact` (even via the same
`toFunctional(artifact)` call) don't share state:

```ts
const F = toFunctional(Counter);
const a = F.create();
const b = F.create();
a.dispatch("inc");
b.getState(); // { count: 0 } — unaffected by `a`'s dispatch
```

`artifact.state` itself is never mutated by `create()` or `dispatch()` —
every `reduce` call clones before mutating, so the component definition
you pass to `toFunctional` stays a safe, reusable template across any
number of independent instances.
