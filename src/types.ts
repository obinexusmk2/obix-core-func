/**
 * The functional adapter's own type surface. Canonical data types
 * (`OBIXDataDefinition`, `OBIXDataInstance`, `OBIXDataContext`,
 * `OBIXAction`, `OBIXActionMap`, `OBIXActionArgs`, `OBIXSnapshot`) live in
 * `@obinexusltd/obix-core-data` and are re-exported from `./index.js`
 * rather than redefined here.
 */
import type { OBIXActionMap, OBIXActionArgs, OBIXDataContext, OBIXDataInstance, OBIXSnapshot } from "@obinexusltd/obix-core-data";

/**
 * Extracts one action's real return type. `obix-core-data`'s own
 * `OBIXAction<State, Args>` is declared as returning `void` — a correct
 * contract for the data layer, which only cares about the mutation — but
 * the concrete function type inferred at a `defineData(...)` call site
 * still carries its actual return type (TypeScript constraints narrow
 * what's allowed, not what's inferred). This recovers it, including
 * `Promise<T>` for async actions.
 */
// `any` here is the same documented boundary as `OBIXActionMap`'s own `any`:
// this extracts a return type independent of the argument tuple, which
// `OBIXActionArgs` already recovers separately.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OBIXActionReturn<State, Action> = Action extends (context: OBIXDataContext<State>, ...args: any[]) => infer Return
  ? Return
  : never;

/** `definition.actions`, callable directly with no `context` argument and their real return types preserved. */
export type OBIXFunctionalActions<State extends object, Actions extends OBIXActionMap<State>> = {
  [K in keyof Actions]: (...args: OBIXActionArgs<State, Actions[K]>) => OBIXActionReturn<State, Actions[K]>;
};

/**
 * A functional view over one `obix-core-data` instance: every action
 * callable directly (`counter.increment()`), plus `getState()`/
 * `snapshot()`. `state` itself is never duplicated — `instance` is the
 * exact `OBIXDataInstance` every action and `getState()` read from.
 */
export type OBIXFunctionalInstance<State extends object, Actions extends OBIXActionMap<State>> = OBIXFunctionalActions<
  State,
  Actions
> & {
  readonly instance: OBIXDataInstance<State, Actions>;
  getState(): State;
  snapshot(): OBIXSnapshot<State>;
};
