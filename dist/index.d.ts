import type { ActionTrace, DOPComponent, ValidationResult } from "./types.js";
export type { ActionContext, ActionFn, ActionTrace, DOPComponent, EffectDescriptor, RenderView, ValidationResult, } from "./types.js";
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
    create(opts?: {
        state?: S;
        props?: Partial<P>;
    }): FunctionalInstance<S>;
    pure: {
        reduce(state: S, actionName: string, payload?: unknown, props?: P): S;
        replay(trace: ActionTrace, from?: S, props?: P): S;
    };
}
export declare function toFunctional<S extends object, P extends object = Record<string, unknown>>(artifact: DOPComponent<S, P>): FunctionalProjection<S, P>;
//# sourceMappingURL=index.d.ts.map