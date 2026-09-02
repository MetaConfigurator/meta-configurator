import {jsonResponse, textResponse} from '@/utility/backend/__tests__/backendResponseStubs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/settings/useSettings', () => ({
  useSettings: () => ({
    value: {backend: {formatProcessingUrl: 'http://mock-format-processing'}},
  }),
}));

import {
  AI_IMPORT_FILE_ACCEPT,
  detectFormatAndParseWithFormatProcessing,
  FORMAT_PROCESSING_FILE_ACCEPT,
} from '@/utility/backend/formatProcessingApi';

describe('file accept filters', () => {
  it('offers only backend-only formats for the separate other-data import', () => {
    const acceptedExtensions = FORMAT_PROCESSING_FILE_ACCEPT.split(',');

    expect(acceptedExtensions).toEqual(expect.arrayContaining(['.xml', '.toml', '.cif', '.mpif']));
    expect(acceptedExtensions).not.toContain('.json');
    expect(acceptedExtensions).not.toContain('.yaml');
  });

  it('offers locally parsed and backend-only formats for the AI import', () => {
    const acceptedExtensions = AI_IMPORT_FILE_ACCEPT.split(',');

    expect(acceptedExtensions).toEqual(
      expect.arrayContaining(['.json', '.yaml', '.yml', '.xml', '.cif'])
    );
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

  it('reports request bodies that cannot be serialized', async () => {
    const circularContent = {} as Record<string, unknown>;
    circularContent.self = circularContent;

    await expect(
      detectFormatAndParseWithFormatProcessing(
        'sample.json',
        'application/json',
        circularContent as unknown as string
      )
    ).rejects.toThrow(/Could not serialize the format processing service request/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
