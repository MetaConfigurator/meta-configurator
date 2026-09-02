import {describe, expect, it, vi} from 'vitest';

function fileSelectionEvent(file?: File): Event {
  return {target: {files: file ? [file] : []}} as unknown as Event;
}

function deferredPromise<T>() {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });
  return {promise, resolve: resolvePromise};
}

async function setupSourceFile() {
  vi.resetModules();
  const readFileContentMock = vi.fn();
  const detectFormatAndParseInBackendMock = vi.fn();

  vi.doMock('@/utility/readFileContent', () => ({readFileContent: readFileContentMock}));
  vi.doMock('../dataImportAiService', () => ({
    detectFormatAndParseInBackend: detectFormatAndParseInBackendMock,
  }));

  const {useDataImportAiSourceFile} = await import('../useDataImportAiSourceFile');
  return {
    sourceFile: useDataImportAiSourceFile(),
    readFileContentMock,
    detectFormatAndParseInBackendMock,
  };
}

describe('AI import source file', () => {
  it('stores a selected file and its backend parser result', async () => {
    const {sourceFile, readFileContentMock, detectFormatAndParseInBackendMock} =
      await setupSourceFile();
    readFileContentMock.mockResolvedValue('value=1');
    detectFormatAndParseInBackendMock.mockResolvedValue({
      recognized: true,
      format: 'properties',
      parsed_json: {value: 1},
      preprocessed_for_ai: {value: 1},
      message: 'Backend recognized properties.',
      ai_prompt_hint: 'Input contains key-value pairs.',
    });

    const wasSelected = await sourceFile.selectSourceFile(
      fileSelectionEvent(new File(['value=1'], 'example.properties', {type: 'text/plain'}))
    );

    expect(wasSelected).toBe(true);
    expect(sourceFile.selectedFileName.value).toBe('example.properties');
    expect(sourceFile.uploadedContent.value).toBe('value=1');
    expect(sourceFile.parsedJsonFromBackend.value).toEqual({value: 1});
    expect(sourceFile.canUseDirectParse.value).toBe(true);
    expect(sourceFile.backendDisplayText.value).toBe('Backend recognized properties.');
  });

  it('does not let an older file read overwrite a newer selection', async () => {
    const {sourceFile, readFileContentMock, detectFormatAndParseInBackendMock} =
      await setupSourceFile();
    const firstRead = deferredPromise<string>();
    const secondRead = deferredPromise<string>();
    readFileContentMock
      .mockReturnValueOnce(firstRead.promise)
      .mockReturnValueOnce(secondRead.promise);
    detectFormatAndParseInBackendMock.mockResolvedValue(null);

    const firstSelection = sourceFile.selectSourceFile(
      fileSelectionEvent(new File(['old'], 'old.txt'))
    );
    const secondSelection = sourceFile.selectSourceFile(
      fileSelectionEvent(new File(['new'], 'new.txt'))
    );
    secondRead.resolve('new');
    await secondSelection;
    firstRead.resolve('old');

    expect(await firstSelection).toBe(false);
    expect(sourceFile.selectedFileName.value).toBe('new.txt');
    expect(sourceFile.uploadedContent.value).toBe('new');
  });

  it('clears file metadata after a read error', async () => {
    const {sourceFile, readFileContentMock} = await setupSourceFile();
    readFileContentMock.mockRejectedValue(new Error('read failed'));

    await expect(
      sourceFile.selectSourceFile(fileSelectionEvent(new File(['data'], 'unreadable.txt')))
    ).rejects.toThrow('read failed');

    expect(sourceFile.selectedFileName.value).toBe('');
    expect(sourceFile.uploadedContent.value).toBe('');
    expect(sourceFile.isDetectingFormat.value).toBe(false);
  });
});
