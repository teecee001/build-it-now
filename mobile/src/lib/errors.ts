/**
 * Safely extracts the `message` from a caught value (typed `unknown`).
 * Returns `undefined` when the value has no message, mirroring the previous
 * `err.message` access on an `any`-typed catch variable.
 */
export function getErrorMessage(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "message" in err) {
    return (err as { message?: string }).message;
  }
  return undefined;
}
