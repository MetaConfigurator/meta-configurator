import {describe, expect, it, vi} from 'vitest';

async function setupMappingServices() {
  vi.resetModules();

  const executeSandboxedJavascriptTransformMock = vi.fn();
  vi.doMock('@/utility/sandboxedJavascript', () => ({
    executeSandboxedJavascriptTransform: executeSandboxedJavascriptTransformMock,
  }));
  vi.doMock('@/utility/trimData', () => ({
    trimDataToMaxSize: (value: unknown) => ({preview: value}),
  }));

  const {DataMappingServiceJavascript} =
    await import('@/data-mapping/javascript/dataMappingServiceJavascript');
  const {DataMappingServiceJsonata} =
    await import('@/data-mapping/jsonata/dataMappingServiceJsonata');
  return {
    DataMappingServiceJavascript,
    DataMappingServiceJsonata,
    executeSandboxedJavascriptTransformMock,
  };
}

describe('DataMappingServiceJavascript', () => {
  it('sanitizes generated code consistently before validation and execution', async () => {
    const {DataMappingServiceJavascript, executeSandboxedJavascriptTransformMock} =
      await setupMappingServices();
    executeSandboxedJavascriptTransformMock.mockResolvedValue({mapped: true});
    const service = new DataMappingServiceJavascript();
    const fencedMapping = '```javascript\nfunction transform(input) { return input; }\n```';

    const validationResult = await service.validateMappingConfig(fencedMapping, {source: true});
    const mappingResult = await service.performDataMapping({source: true}, fencedMapping);

    expect(validationResult.success).toBe(true);
    expect(mappingResult.resultData).toEqual({mapped: true});
    expect(executeSandboxedJavascriptTransformMock).toHaveBeenNthCalledWith(
      1,
      'function transform(input) { return input; }',
      {preview: {source: true}}
    );
    expect(executeSandboxedJavascriptTransformMock).toHaveBeenNthCalledWith(
      2,
      'function transform(input) { return input; }',
      {source: true}
    );
  });

  it('returns a readable validation failure', async () => {
    const {DataMappingServiceJavascript, executeSandboxedJavascriptTransformMock} =
      await setupMappingServices();
    executeSandboxedJavascriptTransformMock.mockRejectedValue(new Error('transform is missing'));

    const result = await new DataMappingServiceJavascript().validateMappingConfig('', {});

    expect(result).toEqual({success: false, message: 'Error: transform is missing'});
  });
});

describe('DataMappingServiceJsonata', () => {
  it('sanitizes nested property names without mutating the source data', async () => {
    const {DataMappingServiceJsonata} = await setupMappingServices();
    const sourceData = {'first-name': 'Ada', nested: [{'last name': 'Lovelace'}]};

    const sanitizedData = new DataMappingServiceJsonata().sanitizeInputDocument(sourceData);

    expect(sanitizedData).toEqual({first_name: 'Ada', nested: [{last_name: 'Lovelace'}]});
    expect(sourceData).toEqual({'first-name': 'Ada', nested: [{'last name': 'Lovelace'}]});
  });

  it('awaits expression evaluation during validation', async () => {
    const {DataMappingServiceJsonata} = await setupMappingServices();

    const result = await new DataMappingServiceJsonata().validateMappingConfig(
      '$error("evaluation failed")',
      {}
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('evaluation failed');
  });

  it('evaluates a valid expression', async () => {
    const {DataMappingServiceJsonata} = await setupMappingServices();

    const result = await new DataMappingServiceJsonata().performDataMapping(
      {firstName: 'Ada', lastName: 'Lovelace'},
      '{"fullName": firstName & " " & lastName}'
    );

    expect(result).toEqual({
      resultData: {fullName: 'Ada Lovelace'},
      success: true,
      message: 'Data mapping performed successfully.',
    });
  });
});
