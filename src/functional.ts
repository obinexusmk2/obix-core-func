/**
 * The functional adapter: wraps one `obix-core-data` instance so its
 * actions are callable directly, with no `context` argument and no
 * `class`/`new`. State is never duplicated — every bound action and
 * `getState()` read the exact same `OBIXDataInstance` obix-core-data
 * manages.
 */
import { createDataInstance } from "@obinexusltd/obix-core-data";
import type { OBIXActionMap, OBIXDataContext, OBIXDataDefinition } from "@obinexusltd/obix-core-data";
import { snapshotData } from "@obinexusltd/obix-core-data";
import type { OBIXFunctionalInstance } from "./types.js";

/**
 * Creates a functional view over a definition. `overrides.state`, when
 * given, seeds the underlying instance the same way
 * `createDataInstance`'s own `overrides` does — e.g. resuming from a
 * previously taken snapshot.
 */
export function createFunctional<State extends object, Actions extends OBIXActionMap<State>>(
  definition: OBIXDataDefinition<State, Actions>,
  overrides: { state?: State } = {},
): OBIXFunctionalInstance<State, Actions> {
  const instance = createDataInstance(definition, overrides);

  const bound = {} as Record<string, (...args: unknown[]) => unknown>;
  for (const key of Object.keys(definition.actions)) {
    const action = definition.actions[key]!;
    bound[key] = (...args: unknown[]): unknown => {
      const context: OBIXDataContext<State> = { state: instance.state };
      return action(context, ...args);
    };
  }

  const functional = {
    ...bound,
    instance,
    getState: () => instance.state,
    snapshot: () => snapshotData(instance),
  };
  return functional as OBIXFunctionalInstance<State, Actions>;
}
