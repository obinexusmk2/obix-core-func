import type { OBIXActionMap, OBIXActionArgs, OBIXDataContext, OBIXDataInstance, OBIXSnapshot } from "@obinexusltd/obix-core-data";
export type OBIXActionReturn<State, Action> = Action extends (context: OBIXDataContext<State>, ...args: any[]) => infer Return ? Return : never;
export type OBIXFunctionalActions<State extends object, Actions extends OBIXActionMap<State>> = {
    [K in keyof Actions]: (...args: OBIXActionArgs<State, Actions[K]>) => OBIXActionReturn<State, Actions[K]>;
};
export type OBIXFunctionalInstance<State extends object, Actions extends OBIXActionMap<State>> = OBIXFunctionalActions<State, Actions> & {
    readonly instance: OBIXDataInstance<State, Actions>;
    getState(): State;
    snapshot(): OBIXSnapshot<State>;
};
//# sourceMappingURL=types.d.ts.map