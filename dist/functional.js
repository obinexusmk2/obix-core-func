import { createDataInstance } from "@obinexusltd/obix-core-data";
import { snapshotData } from "@obinexusltd/obix-core-data";
export function createFunctional(definition, overrides = {}) {
    const instance = createDataInstance(definition, overrides);
    const bound = {};
    for (const key of Object.keys(definition.actions)) {
        const action = definition.actions[key];
        bound[key] = (...args) => {
            const context = { state: instance.state };
            return action(context, ...args);
        };
    }
    const functional = {
        ...bound,
        instance,
        getState: () => instance.state,
        snapshot: () => snapshotData(instance),
    };
    return functional;
}
//# sourceMappingURL=functional.js.map