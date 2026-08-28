# @obinexusltd/obix-adapter-functional

**The Functional projection — `reduce` / `replay` + a `create()` closure.**

```bash
npm install @obinexusltd/obix-adapter-functional
```

## API

```ts
const F = toFunctional(artifact);
F.reduce(state, "Start", undefined, props);   // one transition
F.replay([["Start"], ["Tick"]], from, props); // fold a trace
const inst = F.create({ state, props });       // closure instance
inst.dispatch("Tick"); inst.getState(); inst.render(); inst.validate();
```

Every path calls `obix-ir.applyAction(artifact, state, name, payload, props)`.
There is no alternative action-invocation shape in this package.

## Dependency role

`obix-spec` + `obix-ir`. Consumed by `obix-test` and `obix-timer`.

## Level 0 status

✅ Complete.
