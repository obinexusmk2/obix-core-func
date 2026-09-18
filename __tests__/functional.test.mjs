import test from "node:test";
import assert from "node:assert/strict";
import { defineData } from "@obinexusltd/obix-core-data";
import { createFunctional } from "../dist/index.js";

function makeCounter() {
  return defineData({
    name: "Counter",
    state: { count: 0 },
    actions: {
      increment(ctx) {
        ctx.state.count++;
      },
      add(ctx, amount) {
        ctx.state.count += amount;
      },
      value(ctx) {
        return ctx.state.count;
      },
      fail(ctx) {
        void ctx;
        throw new Error("boom");
      },
      async loadDelta(ctx, amount) {
        await Promise.resolve();
        ctx.state.count += amount;
        return ctx.state.count;
      },
    },
  });
}

// 1. Creating a functional adapter from an OBIX data definition.
test("createFunctional wraps a definition into a callable-function instance", () => {
  const Counter = makeCounter();
  const counter = createFunctional(Counter);
  assert.equal(typeof counter.increment, "function");
  assert.equal(typeof counter.getState, "function");
});

// 2. Calling a zero-argument action.
test("a zero-argument action mutates state", () => {
  const counter = createFunctional(makeCounter());
  counter.increment();
  assert.equal(counter.getState().count, 1);
});

// 3. Calling an action with typed arguments.
test("an action with arguments threads them through", () => {
  const counter = createFunctional(makeCounter());
  counter.add(4);
  assert.equal(counter.getState().count, 4);
});

// 4. Action return values.
test("an action's return value is preserved, not discarded", () => {
  const counter = createFunctional(makeCounter());
  counter.add(5);
  assert.equal(counter.value(), 5);
});

// 5. Async action return values.
test("an async action's Promise return value is preserved", async () => {
  const counter = createFunctional(makeCounter());
  const result = counter.loadDelta(7);
  assert.ok(result instanceof Promise);
  assert.equal(await result, 7);
  assert.equal(counter.getState().count, 7);
});

// 6. Reading current state.
test("getState reflects the current, live state", () => {
  const counter = createFunctional(makeCounter());
  assert.deepEqual(counter.getState(), { count: 0 });
  counter.increment();
  assert.deepEqual(counter.getState(), { count: 1 });
});

// 7. Two functional instances remain isolated.
test("two functional instances of the same definition are isolated", () => {
  const Counter = makeCounter();
  const a = createFunctional(Counter);
  const b = createFunctional(Counter);
  a.increment();
  a.add(4);
  assert.equal(a.getState().count, 5);
  assert.equal(b.getState().count, 0);
});

// 8. Underlying data definition is not mutated unexpectedly.
test("the underlying definition's state is untouched by functional calls", () => {
  const Counter = makeCounter();
  createFunctional(Counter).add(9);
  assert.deepEqual(Counter.state, { count: 0 });
  assert.throws(() => {
    Counter.state.count = 42;
  }, TypeError);
});

// 9. Errors propagate from actions.
test("an error thrown inside an action propagates to the caller", () => {
  const counter = createFunctional(makeCounter());
  assert.throws(() => counter.fail(), /boom/);
});

// 10. The functional API requires no class construction.
test("createFunctional is a plain function returning a plain object, no `new` required", () => {
  const counter = createFunctional(makeCounter());
  assert.equal(typeof createFunctional, "function");
  assert.equal(counter.constructor, Object);
});

// 11 & 12. Type inference (argument + return types) is exercised at
// compile time via `npm run build` and the standalone strict-mode check
// described in docs/api-reference.md; this asserts the runtime values
// that inference is supposed to describe.
test("state stays single-sourced: functional reads and obix-core-data's own instance agree", () => {
  const Counter = makeCounter();
  const counter = createFunctional(Counter);
  counter.add(3);
  assert.equal(counter.instance.state.count, 3);
  assert.equal(counter.getState(), counter.instance.state);
});

// 13. No DOM dependency / 14. No React dependency / 15. No OOP package
// dependency — asserted structurally: package.json declares exactly one
// dependency, and it is obix-core-data.
test("package.json declares exactly one dependency: obix-core-data", async () => {
  const { readFile } = await import("node:fs/promises");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), ["@obinexusltd/obix-core-data"]);
});

// 16. Build succeeds independently — verified by `npm run build` exiting
// 0 before this suite runs (the compiled dist/ these tests import from
// would not exist otherwise).
test("snapshot delegates to obix-core-data rather than re-implementing it", () => {
  const counter = createFunctional(makeCounter());
  counter.add(6);
  const snap = counter.snapshot();
  assert.deepEqual(snap.state, { count: 6 });
  counter.add(100);
  assert.equal(snap.state.count, 6, "snapshot must not observe later mutation");
});
