/**
 * @obinexusltd/obix-core-func
 *
 * The Functional projection: a pure `reduce` / `replay` pair plus a
 * `create()` closure instance. Every path runs through the vendored
 * `reduce` (./dop.js) — the same single action path the other adapter
 * projections (data / oop / reactive / ssr) use.
 *
 * Zero dependencies. `reduce`/`replay` are also exposed under `.pure` —
 * kept for callers migrating from the earlier @obinexusltd/obix-spec +
 * @obinexusltd/obix-ir–based implementation, which exposed the same two
 * functions under a `pure` namespace. `.pure.reduce`/`.pure.replay` are the
 * exact same functions as the top-level `reduce`/`replay`, not a second
 * implementation — there is still only one action path.
 */
import { reduce, replay as fold, renderHtml, validate as validateState } from "./dop.js";
import type { ActionTrace, DOPComponent, ValidationResult } from "./types.js";

export type {
  ActionContext,
  ActionFn,
  ActionTrace,
  DOPComponent,
  EffectDescriptor,
  RenderView,
  ValidationResult,
} from "./types.js";

export interface FunctionalInstance<S extends object> {
  getState(): S;
  dispatch(actionName: string, payload?: unknown): S;
  render(): string;
  validate(): ValidationResult;
}

export interface FunctionalProjection<S extends object, P extends object> {
  readonly artifact: DOPComponent<S, P>;
  reduce(state: S, actionName: string, payload?: unknown, props?: P): S;
  replay(trace: ActionTrace, from?: S, props?: P): S;
  create(opts?: { state?: S; props?: Partial<P> }): FunctionalInstance<S>;
  /** Alias of `reduce`/`replay` — see the module doc comment above. */
  pure: {
    reduce(state: S, actionName: string, payload?: unknown, props?: P): S;
    replay(trace: ActionTrace, from?: S, props?: P): S;
  };
}

export function toFunctional<S extends object, P extends object = Record<string, unknown>>(
  artifact: DOPComponent<S, P>,
): FunctionalProjection<S, P> {
  const reduceOne = (state: S, actionName: string, payload?: unknown, props?: P): S =>
    reduce(artifact, state, actionName, payload, props);

  const replayTrace = (trace: ActionTrace, from?: S, props?: P): S =>
    fold(artifact, trace, from, props);

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

  return {
    artifact,
    reduce: reduceOne,
    replay: replayTrace,
    create,
    pure: { reduce: reduceOne, replay: replayTrace },
  };
}
