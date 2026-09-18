/**
 * @obinexusltd/obix-core-func
 *
 * The functional adapter over `@obinexusltd/obix-core-data`: a plain
 * callable-function interface (`createFunctional`) over a canonical
 * `OBIXDataDefinition`. No classes, no `new`, no second state
 * architecture — the data layer owns state; this package only binds and
 * calls its actions.
 */
export { createFunctional } from "./functional.js";

export type { OBIXActionReturn, OBIXFunctionalActions, OBIXFunctionalInstance } from "./types.js";

// Definitions are declared with @obinexusltd/obix-core-data's own
// `defineData` — import it from there directly. This package only adds
// `createFunctional` on top.
