import test from "node:test";
import assert from "node:assert/strict";
import { toFunctional } from "../dist/index.js";
import { TimerDOP } from "@obinexusltd/obix-timer";

test("pure reduce / replay", () => {
  const F = toFunctional(TimerDOP);
  assert.deepEqual(F.replay([["Start"], ["Tick"], ["Tick"], ["Stop"]]), { seconds: 2, running: false });
  assert.deepEqual(F.pure.reduce({ seconds: 0, running: false }, "Start", undefined, TimerDOP.props), {
    seconds: 0,
    running: true,
  });
});

test("create() closure instance: dispatch / getState / render / validate", () => {
  const inst = toFunctional(TimerDOP).create({ props: { limitSeconds: 5 } });
  inst.dispatch("Start");
  for (let i = 0; i < 8; i++) inst.dispatch("Tick");
  assert.deepEqual(inst.getState(), { seconds: 5, running: false });
  assert.match(inst.render(), /Finished/);
  assert.equal(inst.validate().valid, true);
});
