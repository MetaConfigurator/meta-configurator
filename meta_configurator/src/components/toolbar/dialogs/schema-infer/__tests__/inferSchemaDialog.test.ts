import {describe, expect, it, vi} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {
  ButtonStub,
  CheckboxStub,
  findButtonByText,
  InputNumberStub,
  MessageStub,
  PanelStub,
  PersistentDialogStub,
  SelectButtonStub,
  openDialog,
} from '@/components/toolbar/dialogs/__tests__/dialogTestUtils';

async function setupDialog({
  currentData,
  uploadedFiles = {},
}: {
  currentData: unknown;
  uploadedFiles?: Record<string, string>;
}) {
  vi.resetModules();

  const {SessionMode} = await import('@/store/sessionMode');
  const dataEditorSetDataMock = vi.fn();
  const schemaEditorSetDataMock = vi.fn();
  const toastAddMock = vi.fn();

  vi.doMock('@/settings/useSettings', () => ({
    useSettings: () => ({
      value: {
        dataFormat: 'json',
        textEditor: {tabSize: 2},
        performance: {
          maxDocumentSizeForSchemaInference: 10_000_000,
          minObjectPropertyCountToPreserve: 1000,
        },
      },
    }),
  }));

  const uploadedFileEntries = Object.keys(uploadedFiles).map(name => ({name}));
  const fileListMock = Object.assign(uploadedFileEntries, {
    item: (index: number) => uploadedFileEntries[index] ?? null,
  });
  vi.doMock('@/utility/fileDialogUtils', () => ({
    createLazyMultiFileDialog: () => ({
      openForSelection: (handler: (files: any) => void) => handler(fileListMock),
    }),
  }));
  vi.doMock('@/utility/readFileContent', () => ({
    readFileContent: vi.fn(async (file: {name: string}) => uploadedFiles[file.name]),
  }));
  vi.doMock('@/data/useDataLink', () => ({
    getDataForMode: (mode: string) =>
      mode === SessionMode.DataEditor
        ? {
            data: {value: currentData},
            setData: dataEditorSetDataMock,
          }
        : {
            data: {value: {}},
            setData: schemaEditorSetDataMock,
          },
  }));
  vi.doMock('@/utility/toastService', () => ({toastService: {add: toastAddMock}}));

  const {registerDefaultDataFormats} = await import('@/dataformats/defaultFormats');
  registerDefaultDataFormats();

  const InferSchemaDialog = (
    await import('@/components/toolbar/dialogs/schema-infer/InferSchemaDialog.vue')
  ).default;

  const wrapper = mount(InferSchemaDialog, {
    global: {
      stubs: {
        Dialog: PersistentDialogStub,
        Button: ButtonStub,
        SelectButton: SelectButtonStub,
        Checkbox: CheckboxStub,
        InputNumber: InputNumberStub,
        Message: MessageStub,
        Panel: PanelStub,
      },
    },
  });

  return {
    wrapper,
    dataEditorSetDataMock,
    schemaEditorSetDataMock,
    toastAddMock,
  };
}

async function selectSource(wrapper: any, source: 'current' | 'files') {
  await wrapper.get(`[data-option-value="${source}"]`).trigger('click');
  await flushPromises();
}

async function selectUploadedFiles(wrapper: any) {
  await findButtonByText(wrapper, 'Select data files').trigger('click');
  await flushPromises();
}

async function applyInference(wrapper: any) {
  await findButtonByText(wrapper, 'Infer Schema').trigger('click');
  await flushPromises();
}

describe('InferSchemaDialog', () => {
  it('defaults to the existing Data Editor content when data is already loaded', async () => {
    const {wrapper, dataEditorSetDataMock, schemaEditorSetDataMock, toastAddMock} =
      await setupDialog({
        currentData: {
          name: 'Alice',
          age: 30,
          active: true,
        },
      });

    await openDialog(wrapper);
    expect(wrapper.text()).toContain('Current data');
    expect(wrapper.text()).not.toContain('top-level');
    await applyInference(wrapper);

    expect(wrapper.text()).toContain('Choose whether the schema should be inferred');
    expect(dataEditorSetDataMock).not.toHaveBeenCalled();
    expect(schemaEditorSetDataMock).toHaveBeenCalledTimes(1);
    const schema = schemaEditorSetDataMock.mock.calls[0]![0];
    expect(schema.type).toBe('object');
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.age.type).toBe('integer');
    expect(schema.properties.active.type).toBe('boolean');
    expect(schema.required).toEqual(expect.arrayContaining(['name', 'age', 'active']));

    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({severity: 'success'}));
    expect(wrapper.text()).not.toContain('Could not infer');
  });

  it('allows switching from existing data to manually selected files', async () => {
    const {wrapper, dataEditorSetDataMock, schemaEditorSetDataMock} = await setupDialog({
      currentData: {
        fromExisting: 'keep out',
      },
      uploadedFiles: {
        'patient.json': '{"fromFile":true,"count":3}',
      },
    });

    await openDialog(wrapper);
    await selectSource(wrapper, 'files');
    await selectUploadedFiles(wrapper);
    await applyInference(wrapper);

    expect(wrapper.text()).toContain('1 file selected');
    expect(dataEditorSetDataMock).toHaveBeenCalledTimes(1);
    expect(dataEditorSetDataMock).toHaveBeenCalledWith({fromFile: true, count: 3});
    expect(schemaEditorSetDataMock).toHaveBeenCalledTimes(1);
    const schema = schemaEditorSetDataMock.mock.calls[0]![0];
    expect(schema.type).toBe('object');
    expect(schema.properties.fromFile.type).toBe('boolean');
    expect(schema.properties.count.type).toBe('integer');
    expect(schema.properties.fromExisting).toBeUndefined();
  });

  it('applies selected schema refinements to the currently loaded data', async () => {
    const {wrapper, dataEditorSetDataMock, schemaEditorSetDataMock} = await setupDialog({
      currentData: [
        {name: 'Alice', age: 30},
        {name: 'Bob', age: 41, city: 'NYC'},
      ],
    });

    await openDialog(wrapper);
    await wrapper.get('#infer-add-examples').setValue(true);
    await flushPromises();
    await findButtonByText(wrapper, 'Apply and Infer Schema').trigger('click');
    await flushPromises();

    expect(dataEditorSetDataMock).not.toHaveBeenCalled();
    expect(schemaEditorSetDataMock).toHaveBeenCalledTimes(1);
    const schema = schemaEditorSetDataMock.mock.calls[0]![0];
    expect(schema.type).toBe('array');
    expect(schema.items.properties.name.examples).toEqual(['Alice', 'Bob']);
    expect(schema.items.properties.age.examples).toEqual([30, 41]);
    expect(schema.items.properties.city.examples).toEqual(['NYC']);
  });

  it('can include empty strings in examples when the option is disabled', async () => {
    const {wrapper, schemaEditorSetDataMock} = await setupDialog({
      currentData: [{name: ''}, {name: 'Alice'}],
    });

    await openDialog(wrapper);
    await wrapper.get('#infer-add-examples').setValue(true);
    await flushPromises();
    await wrapper.get('#infer-add-examples-ignore-empty-strings').setValue(false);
    await findButtonByText(wrapper, 'Apply and Infer Schema').trigger('click');
    await flushPromises();

    const schema = schemaEditorSetDataMock.mock.calls[0]![0];
    expect(schema.items.properties.name.examples).toEqual(['', 'Alice']);
  });

  it('starts in manual file mode when no current data is available', async () => {
    const {wrapper, dataEditorSetDataMock, schemaEditorSetDataMock, toastAddMock} =
      await setupDialog({
        currentData: {},
        uploadedFiles: {
          'data.json': '{"name":"Alice","age":30}',
        },
      });

    await openDialog(wrapper);

    const currentDataOption = wrapper.get('[data-option-value="current"]')
      .element as HTMLButtonElement;
    const filesOption = wrapper.get('[data-option-value="files"]').element as HTMLButtonElement;
    expect(currentDataOption.disabled).toBe(true);
    expect(filesOption.disabled).toBe(false);
    expect(wrapper.text()).toContain('No files selected yet.');

    await selectUploadedFiles(wrapper);
    await applyInference(wrapper);

    expect(dataEditorSetDataMock).toHaveBeenCalledTimes(1);
    expect(dataEditorSetDataMock).toHaveBeenCalledWith({name: 'Alice', age: 30});
    expect(schemaEditorSetDataMock).toHaveBeenCalledTimes(1);
    const schema = schemaEditorSetDataMock.mock.calls[0]![0];
    expect(schema.type).toBe('object');
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.age.type).toBe('integer');
    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({severity: 'success'}));
  });

  it('infers one schema satisfying all selected files, without touching the Data Editor', async () => {
    const {wrapper, dataEditorSetDataMock, schemaEditorSetDataMock, toastAddMock} =
      await setupDialog({
        currentData: {},
        uploadedFiles: {
          'first.json': '{"name":"Alice","age":30}',
          'second.yaml': 'name: Bob\nnickname: Bobby\n',
        },
      });

    await openDialog(wrapper);
    await selectUploadedFiles(wrapper);
    await applyInference(wrapper);

    expect(wrapper.text()).toContain('2 files selected');
    // Several instances have no single data document to show, so the editor keeps its content.
    expect(dataEditorSetDataMock).not.toHaveBeenCalled();
    expect(schemaEditorSetDataMock).toHaveBeenCalledTimes(1);
    const schema = schemaEditorSetDataMock.mock.calls[0]![0];
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.age.type).toBe('integer');
    expect(schema.properties.nickname.type).toBe('string');
    expect(schema.required).toEqual(['name']);
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({detail: expect.stringContaining('2 selected data instances')})
    );
  });

  it('shows a parse error when a selected file cannot be read as JSON', async () => {
    const {wrapper, dataEditorSetDataMock, schemaEditorSetDataMock} = await setupDialog({
      currentData: {
        name: 'Alice',
      },
      uploadedFiles: {
        'broken.json': '{ this is : not valid : json ]',
      },
    });

    await openDialog(wrapper);
    await selectSource(wrapper, 'files');
    await selectUploadedFiles(wrapper);
    await applyInference(wrapper);

    expect(wrapper.text()).toContain('Could not infer a schema from the selected files');
    expect(dataEditorSetDataMock).not.toHaveBeenCalled();
    expect(schemaEditorSetDataMock).not.toHaveBeenCalled();
  });
});
