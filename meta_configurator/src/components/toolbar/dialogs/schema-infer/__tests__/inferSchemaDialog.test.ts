import {describe, expect, it, vi} from 'vitest';
import {defineComponent} from 'vue';
import {flushPromises, mount} from '@vue/test-utils';

// --- Stubs ------------------------------------------------------------------

const DialogStub = defineComponent({template: '<div><slot /></div>'});
const ButtonStub = defineComponent({
  props: {disabled: {type: Boolean, default: false}},
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});
const MessageStub = defineComponent({template: '<div class="message"><slot /></div>'});
const IconStub = defineComponent({template: '<i />'});

function button(wrapper: any, text: string) {
  return wrapper.findAll('button').find((b: any) => b.text().includes(text));
}

/**
 * Mounts the dialog with a fake multi-file picker that returns the given files
 * (name -> text content), a stubbed schema target, and the *real* format
 * registry + inference. Returns the wrapper plus the captured setData mock.
 */
async function setupDialog(files: Record<string, string>) {
  vi.resetModules();

  const setDataMock = vi.fn();
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

  const fileObjects = Object.keys(files).map(name => ({name}));
  vi.doMock('@/utility/fileDialogUtils', () => ({
    createLazyMultiFileDialog: () => ({
      openForSelection: (handler: (files: any) => void) => handler(fileObjects),
    }),
  }));
  vi.doMock('@/utility/readFileContent', () => ({
    readFileContent: vi.fn(async (file: {name: string}) => files[file.name]),
  }));
  vi.doMock('@/data/useDataLink', () => ({
    getDataForMode: () => ({setData: setDataMock}),
  }));
  vi.doMock('@/utility/toastService', () => ({toastService: {add: toastAddMock}}));

  // Use the real format registry, with the default JSON + YAML formats registered.
  const {registerDefaultDataFormats} = await import('@/dataformats/defaultFormats');
  registerDefaultDataFormats();

  const InferSchemaDialog = (
    await import('@/components/toolbar/dialogs/schema-infer/InferSchemaDialog.vue')
  ).default;

  const wrapper = mount(InferSchemaDialog, {
    global: {
      stubs: {
        Dialog: DialogStub,
        Button: ButtonStub,
        Message: MessageStub,
        FontAwesomeIcon: IconStub,
      },
    },
  });

  return {wrapper, setDataMock, toastAddMock};
}

async function selectFiles(wrapper: any) {
  (wrapper.vm as any).show();
  await flushPromises();
  await button(wrapper, 'Select instance').trigger('click');
  await flushPromises();
}

describe('InferSchemaDialog', () => {
  it('infers a JSON Schema satisfying multiple YAML (.yaml/.yml) instances', async () => {
    const {wrapper, setDataMock, toastAddMock} = await setupDialog({
      'a.yaml': 'name: Alice\nage: 30\n',
      'b.yml': 'name: Bob\nage: 41\ncity: NYC\n',
    });

    await selectFiles(wrapper);

    expect(setDataMock).toHaveBeenCalledTimes(1);
    const schema = setDataMock.mock.calls[0]![0];
    expect(schema.type).toBe('object');
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.age.type).toBe('integer');
    // city only appears in one instance -> present as an optional property
    expect(schema.properties.city.type).toBe('string');
    expect(schema.required).toEqual(expect.arrayContaining(['name', 'age']));
    expect(schema.required).not.toContain('city');

    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({severity: 'success'}));
    // No error message shown.
    expect(wrapper.text()).not.toContain('Could not infer');
  });

  it('parses a YAML file as YAML, not JSON (regression for the dataFormat parse error)', async () => {
    // This exact content previously triggered:
    // 'JSON Parse error: Unexpected identifier "dataFormat"'
    const {wrapper, setDataMock} = await setupDialog({
      'settings.yaml': 'dataFormat: json\nperformance:\n  maxErrorsToShow: 10\n',
    });

    await selectFiles(wrapper);

    expect(wrapper.text()).not.toContain('Could not infer');
    expect(setDataMock).toHaveBeenCalledTimes(1);
    const schema = setDataMock.mock.calls[0]![0];
    expect(schema.type).toBe('object');
    expect(schema.properties.dataFormat.type).toBe('string');
    expect(schema.properties.performance.type).toBe('object');
  });

  it('still parses explicit .json instances', async () => {
    const {wrapper, setDataMock} = await setupDialog({
      'data.json': '{"name": "Alice", "age": 30}',
    });

    await selectFiles(wrapper);

    expect(setDataMock).toHaveBeenCalledTimes(1);
    const schema = setDataMock.mock.calls[0]![0];
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.age.type).toBe('integer');
  });

  it('shows an error message when a file cannot be parsed', async () => {
    const {wrapper, setDataMock} = await setupDialog({
      // invalid as both JSON and YAML (unclosed flow mapping)
      'broken.json': '{ this is : not valid : json ]',
    });

    await selectFiles(wrapper);

    expect(setDataMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Could not infer');
  });
});
