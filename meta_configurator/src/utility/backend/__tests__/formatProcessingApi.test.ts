import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/settings/useSettings', () => ({
  useSettings: () => ({
    value: {backend: {formatProcessingUrl: 'http://mock-format-processing'}},
  }),
}));

import {
  detectFormatAndParseWithFormatProcessing,
  FORMAT_PROCESSING_FILE_ACCEPT,
  preprocessParsedDataForAiWithFormatProcessing,
  shouldUseFormatProcessingForFile,
} from '@/utility/backend/formatProcessingApi';

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

describe('shouldUseFormatProcessingForFile', () => {
  it('uses the format processing service for backend-only formats', () => {
    expect(shouldUseFormatProcessingForFile('dataset.xml')).toBe(true);
    expect(shouldUseFormatProcessingForFile('values.toml')).toBe(true);
    expect(shouldUseFormatProcessingForFile('sample.cif')).toBe(true);
    expect(shouldUseFormatProcessingForFile('model.py')).toBe(true);
  });

  it('keeps plain json/yaml on the existing local parser path', () => {
    expect(shouldUseFormatProcessingForFile('data.json')).toBe(false);
    expect(shouldUseFormatProcessingForFile('data.yaml')).toBe(false);
  });

  it('offers the extended file filter for open-data imports', () => {
    expect(FORMAT_PROCESSING_FILE_ACCEPT).toContain('.xml');
    expect(FORMAT_PROCESSING_FILE_ACCEPT).toContain('.toml');
    expect(FORMAT_PROCESSING_FILE_ACCEPT).toContain('.cif');
    expect(FORMAT_PROCESSING_FILE_ACCEPT).toContain('.java');
  });
});

describe('detectFormatAndParseWithFormatProcessing', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('POSTs the selected file metadata and returns the parsed backend result', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        recognized: true,
        format: 'xml',
        parsed_json: {root: {value: 1}},
        preprocessed_for_ai: {root: {value: 1}},
        message: 'Backend recognized XML.',
        display_text: 'Backend recognized XML.',
        parser_name: 'xml_format',
        ai_prompt_hint: 'Input is XML.',
      })
    );

    const result = await detectFormatAndParseWithFormatProcessing(
      'sample.xml',
      'application/xml',
      '<root><value>1</value></root>'
    );

    expect(result.recognized).toBe(true);
    expect(result.format).toBe('xml');
    expect(result.parsed_json).toEqual({root: {value: 1}});
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://mock-format-processing/detect-format-and-parse');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      file_name: 'sample.xml',
      file_type: 'application/xml',
      content: '<root><value>1</value></root>',
    });
  });

  it('throws the backend error on non-2xx json responses', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({error: 'Input file too large'}, {okFlag: false, status: 413})
    );
    await expect(
      detectFormatAndParseWithFormatProcessing('large.xml', 'application/xml', '<x/>')
    ).rejects.toThrow('Input file too large');
  });

  it('uses a status-based error when a non-2xx json body has no error message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, {okFlag: false, status: 500}));
    await expect(
      detectFormatAndParseWithFormatProcessing('sample.xml', 'application/xml', '<x/>')
    ).rejects.toThrow('Format processing service request failed with status 500.');
  });

  it('throws a friendly error when the service is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      detectFormatAndParseWithFormatProcessing('sample.xml', 'application/xml', '<x/>')
    ).rejects.toThrow(/Could not reach the format processing service/);
  });

  it('throws when the response is not json', async () => {
    fetchMock.mockResolvedValue(textResponse('<html>502 Bad Gateway</html>'));
    await expect(
      detectFormatAndParseWithFormatProcessing('sample.xml', 'application/xml', '<x/>')
    ).rejects.toThrow(/Unexpected response/);
  });

  it('throws when the JSON body is missing required fields', async () => {
    fetchMock.mockResolvedValue(jsonResponse({recognized: true}));
    await expect(
      detectFormatAndParseWithFormatProcessing('sample.xml', 'application/xml', '<x/>')
    ).rejects.toThrow(/Invalid response/);
  });

  it('throws a friendly error when a JSON response cannot be decoded', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {get: () => 'Application/JSON; charset=utf-8'},
      json: async () => Promise.reject(new SyntaxError('Unexpected token')),
      text: async () => '',
    } as unknown as Response);

    await expect(
      detectFormatAndParseWithFormatProcessing('sample.xml', 'application/xml', '<x/>')
    ).rejects.toThrow(/returned invalid JSON/);
  });
});

describe('preprocessParsedDataForAiWithFormatProcessing', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('POSTs preprocessing options and returns the shortened data', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        format: 'json',
        preprocessed_for_ai: {items: [1]},
        display_text: 'Reduced array entries.',
        ai_prompt_hint: 'Input was shortened.',
      })
    );

    const result = await preprocessParsedDataForAiWithFormatProcessing({items: [1, 2, 3]}, 'json', {
      initial_array_limit: 1,
    });

    expect(result.preprocessed_for_ai).toEqual({items: [1]});
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://mock-format-processing/preprocess-for-ai');
    expect(JSON.parse(init.body)).toEqual({
      data: {items: [1, 2, 3]},
      format: 'json',
      preprocess_options: {initial_array_limit: 1},
    });
  });

  it('falls back to the submitted data when no preprocessed value is returned', async () => {
    const submittedData = {items: [1, 2, 3]};
    fetchMock.mockResolvedValue(
      jsonResponse({format: 'json', display_text: 'No preprocessing needed.'})
    );

    const result = await preprocessParsedDataForAiWithFormatProcessing(submittedData);

    expect(result.preprocessed_for_ai).toBe(submittedData);
  });

  it('rejects malformed successful responses', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await expect(preprocessParsedDataForAiWithFormatProcessing({value: 1})).rejects.toThrow(
      /Invalid response/
    );
  });

  it('reports request bodies that cannot be serialized', async () => {
    const circularData: Record<string, unknown> = {};
    circularData.self = circularData;

    await expect(preprocessParsedDataForAiWithFormatProcessing(circularData)).rejects.toThrow(
      /Could not serialize the format processing request/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
