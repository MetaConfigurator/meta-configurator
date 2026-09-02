/** Extracts a readable message from a caught value, which is not always an Error. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
