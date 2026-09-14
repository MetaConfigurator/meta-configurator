/** Fetch response stubs shared by the backend API tests. */

export function jsonResponse(body: unknown, {okFlag = true, status = 200} = {}): Response {
  return {
    ok: okFlag,
    status,
    headers: {
      get: (headerName: string) =>
        headerName.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

export function textResponse(text: string, {okFlag = false, status = 502} = {}): Response {
  return {
    ok: okFlag,
    status,
    headers: {get: () => 'text/html'},
    json: async () => {
      throw new Error('not json');
    },
    text: async () => text,
  } as unknown as Response;
}
