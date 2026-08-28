import { applyAction } from "@obinexusltd/obix-ir";
export function toFunctional(artifact) {
    const reduce = (state, actionName, payload, props = artifact.props) => applyAction(artifact, state, actionName, payload, props);
    const replay = (trace, from = artifact.initialState, props = artifact.props) => {
        let cur = from;
        for (const [name, payload] of trace)
            cur = reduce(cur, name, payload, props);
        return cur;
    };
    const create = (opts = {}) => {
        let cur = opts.state ?? artifact.initialState;
        const props = Object.freeze({ ...artifact.props, ...(opts.props ?? {}) });
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
//# sourceMappingURL=index.js.map