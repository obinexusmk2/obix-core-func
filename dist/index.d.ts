import type { DOPArtifact, State, Props, Payload, ActionTrace, ValidationResult } from "@obinexusltd/obix-spec";
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
    create(opts?: {
        state?: S;
        props?: Partial<P>;
    }): FunctionalInstance<S, P>;
    pure: {
        reduce(state: S, actionName: string, payload: Payload, props?: P): S;
        replay(trace: ActionTrace, from?: S, props?: P): S;
    };
}
export declare function toFunctional<S extends object = State, P extends object = Props>(artifact: DOPArtifact<S, P>): FunctionalProjection<S, P>;
//# sourceMappingURL=index.d.ts.map