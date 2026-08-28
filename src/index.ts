/**
 * @obinexusltd/obix-adapter-functional
 *
 * The Functional projection: a `pure` namespace (`reduce` / `replay`) and a
 * `create()` closure instance. Every action execution routes through
 * obix-ir.applyAction — never a second, differently-shaped call.
 */
import { applyAction } from "@obinexusltd/obix-ir";
import type {
  DOPArtifact,
  State,
  Props,
  Payload,
  ActionTrace,
  ValidationResult,
} from "@obinexusltd/obix-spec";

export interface FunctionalInstance<S extends object, P extends object> {
  getState(): S;
  dispatch(actionName: string, payload?: Payload): S;
  render(): string;
  validate(): ValidationResult;
}

export interface FunctionalProjection<S extends object, P extends object> {
  readonly artifact: DOPArtifact<S, P>;
  reduce(state: S, actionName: string, payload: Payload, props?: P): S;
  replay(trace: ActionTrace, from?: S, props?: P): S;
  create(opts?: { state?: S; props?: Partial<P> }): FunctionalInstance<S, P>;
  pure: {
    reduce(state: S, actionName: string, payload: Payload, props?: P): S;
    replay(trace: ActionTrace, from?: S, props?: P): S;
  };
}

export function toFunctional<S extends object = State, P extends object = Props>(
  artifact: DOPArtifact<S, P>,
): FunctionalProjection<S, P> {
  const reduce = (state: S, actionName: string, payload: Payload, props: P = artifact.props): S =>
    applyAction(artifact, state, actionName, payload, props);

  const replay = (trace: ActionTrace, from: S = artifact.initialState, props: P = artifact.props): S => {
    let cur = from;
    for (const [name, payload] of trace) cur = reduce(cur, name, payload, props);
    return cur;
  };

  const create = (opts: { state?: S; props?: Partial<P> } = {}): FunctionalInstance<S, P> => {
    let cur: S = opts.state ?? artifact.initialState;
    const props = Object.freeze({ ...artifact.props, ...(opts.props ?? {}) }) as P;
    return {
      getState: () => cur,
      dispatch(actionName, payload) {
        cur = applyAction(artifact, cur, actionName, payload, props);
        return cur;
      },
      render: () => (artifact.render ? artifact.render(cur, props) : ""),
      validate: () => (artifact.validate ? artifact.validate(cur, props) : { valid: true, violations: [] }),
    };
  };

  return { artifact, reduce, replay, create, pure: { reduce, replay } };
}
