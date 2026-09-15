# `reduce` and `replay`: the single action path

Every state transition in this package — whether from `F.reduce`,
`F.replay`, `F.pure.reduce`/`.pure.replay`, or `instance.dispatch()` —
goes through exactly one function: `dop.ts`'s `reduce`. This page explains
what it actually does.

```ts
export function reduce<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  state: S,
  actionName: string,
  payload?: unknown,
  props?: P,
): S {
  const action = component.actions[actionName];
  if (typeof action !== "function") {
    throw new Error(`[obix] ${component.name}: unknown action "${actionName}"`);
  }
  const draft = clone(state);
  const resolvedProps = (props ?? component.props ?? (EMPTY as P)) as P;
  const ctx = { state: draft, props: resolvedProps } as ActionContext<S, P>;
  for (const name of Object.keys(component.actions)) {
    ctx[name] = (p?: unknown): void => {
      component.actions[name]!(ctx, p);
    };
  }
  action(ctx, payload);
  return draft;
}
```

## The input state is never mutated

`state` is deep-cloned into `draft` before the action runs — via the
global `structuredClone` if available, falling back to
`JSON.parse(JSON.stringify(state))` otherwise (see `env.d.ts` for why
`structuredClone` is declared as an ambient global rather than imported:
[zero-dependency-vendoring.md](zero-dependency-vendoring.md)). The action
function mutates `ctx.state` (which is `draft`), and `draft` — not the
original `state` — is what `reduce` returns.

**The `JSON` fallback has real limits**: `JSON.stringify`/`parse`
round-tripping drops `undefined` values, functions, symbols, `Date`
objects (turned into strings), and `Map`/`Set` (turned into `{}`), and
throws on circular references. If your state contains any of those and
you're running in an environment without a native `structuredClone` (very
old Node/browsers), cloning will silently lose or corrupt that data.
Modern Node (≥ 17.0, and this package requires ≥ 20.11 per `engines`) and
modern browsers all have `structuredClone`, so this fallback is a safety
net for unusual embedding environments, not the expected path.

## Unknown action names throw

If `actionName` isn't a key in `component.actions`, `reduce` throws
immediately — before cloning, before touching `state` at all:

```
Error: [obix] Counter: unknown action "doesNotExist"
```

`component.name` is used verbatim in the message — a component with an
empty or generic `name` produces a correspondingly unhelpful error.
`replay` doesn't catch or wrap this — a bad action name mid-trace
propagates straight out of `replay` too, with whatever state had been
folded so far simply discarded (no partial result is returned).

## `props` resolution order

`resolvedProps = props ?? component.props ?? {}` (a shared frozen empty
object when neither is given) — an explicit `props` argument to `reduce`
always wins over `component.props`; only when the call omits `props`
entirely does the component's own default apply.

## `ctx` carries every other action as a callable

Beyond `state`/`props`, `reduce` attaches one function per action name
onto `ctx` **before** running the requested action:

```ts
for (const name of Object.keys(component.actions)) {
  ctx[name] = (p?: unknown): void => {
    component.actions[name]!(ctx, p);
  };
}
```

This means an action function can call `ctx.otherActionName(payload)` from
inside itself to trigger another action against the **same** `ctx`
(same `draft` state, same `props`) — effectively composing actions
without a second `reduce` call, still within one clone. There's no
recursion guard: an action that calls a `ctx` helper pointing back at
itself (directly or via a cycle through other actions) will recurse until
the call stack overflows.

```ts
const Cart = {
  name: "Cart",
  state: { items: [], total: 0 },
  actions: {
    addItem: (ctx, item) => {
      ctx.state.items.push(item);
      ctx.recalculateTotal(); // calls the sibling action against the same draft
    },
    recalculateTotal: (ctx) => {
      ctx.state.total = ctx.state.items.reduce((sum, i) => sum + i.price, 0);
    },
  },
};
```

## `replay`: fold a trace

```ts
export function replay<S extends object, P extends object>(
  component: DOPComponent<S, P>,
  trace: ActionTrace,
  from?: S,
  props?: P,
): S {
  let current = from ?? component.state;
  for (const step of trace) {
    current = reduce(component, current, step[0], step[1], props);
  }
  return current;
}
```

Starts from `from` (or `component.state` if omitted) and calls `reduce`
once per trace entry, threading the returned state into the next call.
Each step gets a fresh `ctx`/`draft` — `replay` doesn't hand the same
`draft` across steps, so an action's `ctx[otherAction]` helpers from step
`N` are gone by step `N+1`; only the resulting `state` value survives
between steps. `props` is the same for every step in the trace — there's
no per-step props override.

## `view` and `renderHtml`

```ts
export function view<S extends object, P extends object>(component, state, props?): RenderView<S, P> {
  const resolvedProps = props ?? component.props ?? EMPTY;
  const derived: Record<string, unknown> = {};
  for (const [key, fn] of Object.entries(component.derived ?? {})) {
    try { derived[key] = fn(state, resolvedProps); } catch { derived[key] = undefined; }
  }
  return { state, props: resolvedProps, derived, ...resolvedProps, ...state, ...derived };
}
```

Every `derived` function is wrapped in its own try/catch — one throwing
derived function doesn't break the others or the whole render; it just
resolves to `undefined` for that one key silently (no logging, no error
surfaced to the caller). The returned object spreads `resolvedProps`,
then `state`, then `derived` on top of the base `{ state, props, derived
}` — **later spreads win on key collision**, so a `derived` key with the
same name as a `state` or `props` field shadows it at the top level (the
nested `view.state`/`view.props`/`view.derived` objects are unaffected by
the collision — only the flattened top-level access is shadowed).
`renderHtml` calls `component.render(view(...))` if `render` is defined,
else returns `""`.
