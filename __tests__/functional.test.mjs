import test from "node:test";
import assert from "node:assert/strict";
import { toFunctional } from "../dist/index.js";

const Counter = {
  name: "Counter",
  state: { count: 0 },
  actions: {
    inc: (ctx, by = 1) => {
      ctx.state.count += by;
    },
    reset: (ctx) => {
      ctx.state.count = 0;
    },
  },
  derived: { label: (s) => `count: ${s.count}` },
  render: (v) => `<button aria-label="${v.derived.label}">${v.state.count}</button>`,
  validate: (s) => ({ valid: s.count >= 0, violations: [] }),
};

test("pure reduce / replay", () => {
  const F = toFunctional(Counter);
  assert.deepEqual(F.reduce({ count: 0 }, "inc"), { count: 1 });
  assert.deepEqual(F.replay([["inc"], ["inc"], ["reset"], ["inc", 4]]), { count: 4 });
});

test("create() closure instance: dispatch / getState / render / validate", () => {
  const inst = toFunctional(Counter).create();
  inst.dispatch("inc");
  inst.dispatch("inc");
  inst.dispatch("inc");
  assert.deepEqual(inst.getState(), { count: 3 });
  assert.equal(inst.render(), '<button aria-label="count: 3">3</button>');
  assert.equal(inst.validate().valid, true);
});

test("create() does not mutate the artifact's initial state", () => {
  toFunctional(Counter).create().dispatch("inc");
  assert.deepEqual(Counter.state, { count: 0 });
});

test(".pure.reduce / .pure.replay are the same functions as .reduce / .replay, not a second implementation", () => {
  const F = toFunctional(Counter);
  assert.equal(F.pure.reduce, F.reduce);
  assert.equal(F.pure.replay, F.replay);
  assert.deepEqual(F.pure.reduce({ count: 0 }, "inc"), { count: 1 });
  assert.deepEqual(F.pure.replay([["inc"], ["inc"], ["reset"], ["inc", 4]]), { count: 4 });
});

test("unknown action name throws, both via reduce and replay", () => {
  const F = toFunctional(Counter);
  assert.throws(() => F.reduce({ count: 0 }, "doesNotExist"), /unknown action "doesNotExist"/);
  assert.throws(() => F.replay([["inc"], ["doesNotExist"]]), /unknown action "doesNotExist"/);
});
