# @obinexusltd/obix-core-func

**The functional adapter over `@obinexusltd/obix-core-data`.** A plain
callable-function interface over a canonical OBIX data definition — no
classes, no `new`, no second state architecture. One dependency:
`@obinexusltd/obix-core-data`.

```bash
npm install @obinexusltd/obix-core-func
```

## Usage

```ts
import { defineData } from "@obinexusltd/obix-core-data";
import { createFunctional } from "@obinexusltd/obix-core-func";

const Counter = defineData({
  name: "Counter",
  state: {
    count: 0,
  },
  actions: {
    increment(ctx) {
      ctx.state.count++;
    },
    add(ctx, amount: number) {
      ctx.state.count += amount;
    },
    value(ctx) {
      return ctx.state.count;
    },
  },
});

const counter = createFunctional(Counter);

counter.increment();
counter.add(4);

console.log(counter.value());          // 5
console.log(counter.getState().count); // 5
```

Every action on `Counter` becomes a directly-callable method — no
`context` argument to pass, no `.actions.` prefix, no
`dispatch("name", payload)` string lookup — and argument types, return
types (including `Promise<T>` for async actions), and thrown errors all
pass through unchanged. Two `createFunctional(Counter)` calls are fully
isolated from each other, the same guarantee `obix-core-data`'s own
`createDataInstance` provides.

## Why this package exists

`@obinexusltd/obix-core-data` is the canonical data layer: definitions,
instances, actions, snapshots. It's deliberately paradigm-neutral — its
own `instance.actions.foo()` calling convention is a reasonable default,
but not the only one a caller might want. `obix-core-func` is one
paradigm-specific view over that same canonical data: a functional
calling convention, for code that wants `counter.add(4)` to read and
compose like an ordinary function call, including getting back whatever
`add` actually returns. See [docs/architecture.md](docs/architecture.md)
for the full data → functional-view layering and exactly how action
binding preserves return values that `obix-core-data`'s own bound actions
intentionally discard.

## Migration note: this package changed shape in `0.2.0`

`0.1.0` was a different design point: an instance-less, `<=0.3.0`-era
`obix-core-data`-style package that vendored its own `DOPComponent` type
and `reduce`/`replay` functions (`toFunctional(artifact).reduce(...)`,
`.replay(...)`, `.create().dispatch(...)`), with no dependency on any
other OBIX package. `0.2.0` replaces all of that with `createFunctional`
over a real `@obinexusltd/obix-core-data` definition — none of the old
exports (`toFunctional`, `FunctionalProjection`, `.pure`, `DOPComponent`,
etc.) exist anymore. Nothing else in this monorepo imported the old API.

## API

```ts
createFunctional(definition, overrides?)   // -> OBIXFunctionalInstance — actions callable directly, plus getState()/snapshot()
```

See [docs/api-reference.md](docs/api-reference.md) for the full type
reference.

## Boundary

- **No state of its own.** Every action call and `getState()` read
  `instance.state` from the `OBIXDataInstance` `createDataInstance`
  produced — this package doesn't clone, freeze, or cache state anywhere.
- **`snapshot()` delegates**, it doesn't reimplement —
  `snapshotData(instance)` from `obix-core-data`, verbatim.
- **Errors propagate.** An action that throws is not caught, wrapped, or
  swallowed here.
- **Runtime-neutral.** No DOM, no `window`/`document`, no Node-only
  global, no React — works in Node, Deno, Bun, and the browser, same as
  `obix-core-data`.

MIT — OBINexus Computing
