
export function isExternalRef(ref: string): boolean {
  try {
    return new URL(ref).protocol.startsWith('http');
  } catch {
    return false; // invalid URL = treat as internal
  }
}