import {beforeEach, describe, expect, it, vi} from 'vitest';

// The schema converter URL is derived from settings at module load, so stub the
// settings to a known mock-orchestrator address.
vi.mock('@/settings/useSettings', () => ({
  useSettings: () => ({
    value: {backend: {schemaConverterUrl: 'http://mock-orchestrator'}},
  }),
}));

import {
  detectSourceLanguage,
  failedStepIndex,
  fileExtensionForLanguage,
  hasSuccessfulAttempt,
  languageLabel,
  requestSchemaConversion,
  selectDisplayedAttempts,
  type ConversionAttempt,
} from '@/utility/backend/schemaConverterApi';

// ---------------------------------------------------------------------------
// Helpers to build attempts and fake orchestrator responses
// ---------------------------------------------------------------------------

function step(source: string, target: string, serviceName = 'FlaskApp', converterName = 'conv') {
  return {sourceLanguage: source, targetLanguage: target, serviceName, converterName};
}

function ok(result: string, path = [step('Xsd', 'JsonSchema')]): ConversionAttempt {
  return {success: true, result, conversionPath: path};
}

function fail(
  result: string,
  path = [step('Xsd', 'JsonSchema')],
  failedStepIndex: number | null = null
): ConversionAttempt {
  return {success: false, result, conversionPath: path, failedStepIndex};
}

function jsonResponse(body: unknown, {okFlag = true, status = 200} = {}): Response {
  return {
    ok: okFlag,
    status,
    headers: {
      get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function textResponse(text: string, {okFlag = false, status = 502} = {}): Response {
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

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('detectSourceLanguage', () => {
  it('detects languages from file extensions', () => {
    expect(detectSourceLanguage('schema.xsd')?.value).toBe('Xsd');
    expect(detectSourceLanguage('shapes.ttl')?.value).toBe('SHACL_TTL');
    expect(detectSourceLanguage('model.yaml')?.value).toBe('LinkMl');
    expect(detectSourceLanguage('model.linkml')?.value).toBe('LinkMl');
    expect(detectSourceLanguage('domain.md')?.value).toBe('MdModels');
  });

  it('is case-insensitive', () => {
    expect(detectSourceLanguage('SCHEMA.XSD')?.value).toBe('Xsd');
  });

  it('returns undefined for unknown extensions', () => {
    expect(detectSourceLanguage('data.json')).toBeUndefined();
    expect(detectSourceLanguage('noextension')).toBeUndefined();
  });
});

describe('languageLabel / fileExtensionForLanguage', () => {
  it('maps known languages to friendly labels', () => {
    expect(languageLabel('JsonSchema')).toBe('JSON Schema');
    expect(languageLabel('SHACL_TTL')).toBe('SHACL (TTL)');
  });

  it('falls back to the raw value for unknown languages', () => {
    expect(languageLabel('Totally_Unknown')).toBe('Totally_Unknown');
  });

  it('suggests a sensible download extension', () => {
    expect(fileExtensionForLanguage('Xsd')).toBe('.xsd');
    expect(fileExtensionForLanguage('Unknown')).toBe('.txt');
  });
});

describe('hasSuccessfulAttempt / selectDisplayedAttempts', () => {
  it('reports whether any attempt succeeded', () => {
    expect(hasSuccessfulAttempt([fail('e1'), ok('r1')])).toBe(true);
    expect(hasSuccessfulAttempt([fail('e1'), fail('e2')])).toBe(false);
    expect(hasSuccessfulAttempt([])).toBe(false);
  });

  it('shows only successful attempts when at least one succeeded', () => {
    const attempts = [ok('r1'), fail('e1'), ok('r2')];
    const displayed = selectDisplayedAttempts(attempts);
    expect(displayed).toHaveLength(2);
    expect(displayed.every(a => a.success)).toBe(true);
  });

  it('falls back to failed attempts only when nothing succeeded', () => {
    const attempts = [fail('e1'), fail('e2')];
    const displayed = selectDisplayedAttempts(attempts);
    expect(displayed).toHaveLength(2);
    expect(displayed.every(a => !a.success)).toBe(true);
  });

  it('caps the number of displayed attempts (default 3), preserving order', () => {
    const attempts = [ok('r1'), ok('r2'), ok('r3'), ok('r4')];
    const displayed = selectDisplayedAttempts(attempts);
    expect(displayed.map(a => a.result)).toEqual(['r1', 'r2', 'r3']);
  });
});

describe('failedStepIndex', () => {
  it('returns -1 for successful attempts', () => {
    expect(failedStepIndex(ok('whatever'))).toBe(-1);
  });

  it('returns the failing edge index reported by the backend', () => {
    const path = [
      step('Xsd', 'MdModels', 'FlaskApp', 'xsd2md'),
      step('MdModels', 'Shex', 'FlaskApp', 'md2shex'),
    ];
    const attempt = fail('boom', path, 1);
    expect(failedStepIndex(attempt)).toBe(1);
  });

  it('returns -1 when the backend did not pinpoint a step', () => {
    expect(failedStepIndex(fail('some unrelated error', undefined, null))).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// requestSchemaConversion against a mocked orchestrator
// ---------------------------------------------------------------------------

describe('requestSchemaConversion (mock orchestrator)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('POSTs to <url>/convert with the right payload and returns the ranked attempts', async () => {
    const results = [ok('{"title":"Person"}'), fail('nope')];
    fetchMock.mockResolvedValue(jsonResponse({results}));

    const returned = await requestSchemaConversion('<xsd/>', 'Xsd', 'JsonSchema');

    expect(returned).toEqual(results);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://mock-orchestrator/convert');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      sourceLanguage: 'Xsd',
      targetLanguage: 'JsonSchema',
      schema: '<xsd/>',
    });
  });

  it('throws the backend error message on a non-2xx JSON response', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({error: 'No path found for conversion.'}, {okFlag: false, status: 400})
    );
    await expect(requestSchemaConversion('{}', 'JsonSchema', 'Mermaid')).rejects.toThrow(
      'No path found for conversion.'
    );
  });

  it('throws a friendly error when the service is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(requestSchemaConversion('{}', 'Xsd', 'JsonSchema')).rejects.toThrow(
      /Could not reach the schema conversion service/
    );
  });

  it('throws when the response is not JSON', async () => {
    fetchMock.mockResolvedValue(textResponse('<html>502 Bad Gateway</html>'));
    await expect(requestSchemaConversion('{}', 'Xsd', 'JsonSchema')).rejects.toThrow(
      /Unexpected response/
    );
  });

  it('throws when a 2xx response is missing the results array', async () => {
    fetchMock.mockResolvedValue(jsonResponse({somethingElse: true}));
    await expect(requestSchemaConversion('{}', 'Xsd', 'JsonSchema')).rejects.toThrow(
      /Invalid response/
    );
  });
});
