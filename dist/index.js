import { reduce, replay as fold, renderHtml, validate as validateState } from "./dop.js";
export function toFunctional(artifact) {
    const reduceOne = (state, actionName, payload, props) => reduce(artifact, state, actionName, payload, props);
    const replayTrace = (trace, from, props) => fold(artifact, trace, from, props);
    const create = (opts = {}) => {
        let current = opts.state ?? artifact.state;
        const props = Object.freeze({ ...(artifact.props ?? {}), ...(opts.props ?? {}) });
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
//# sourceMappingURL=index.js.map