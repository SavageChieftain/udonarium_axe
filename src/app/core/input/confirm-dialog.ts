/**
 * A thin wrapper over the browser dialogue, so the domain never calls a dom api directly.
 * The specs mock this function.
 */
export const confirmDialog = (message: string): boolean => window.confirm(message);
