import type { OBIXActionMap, OBIXDataDefinition } from "@obinexusltd/obix-core-data";
import type { OBIXFunctionalInstance } from "./types.js";
export declare function createFunctional<State extends object, Actions extends OBIXActionMap<State>>(definition: OBIXDataDefinition<State, Actions>, overrides?: {
    state?: State;
}): OBIXFunctionalInstance<State, Actions>;
//# sourceMappingURL=functional.d.ts.map