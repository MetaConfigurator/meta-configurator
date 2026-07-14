import {describe, expect, it, vi} from 'vitest';
import {defineComponent, nextTick, ref} from 'vue';
import {flushPromises, mount} from '@vue/test-utils';

const DialogStub = defineComponent({
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  template: '<div v-if="visible"><slot /></div>',
});

const ButtonStub = defineComponent({
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
});

const SelectStub = defineComponent({
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    options: {
      type: Array,
      default: () => [],
    },
    optionLabel: {
      type: String,
      default: 'label',
    },
    optionValue: {
      type: String,
      default: 'value',
    },
  },
  emits: ['update:modelValue'],
  methods: {
    getOptionLabel(option: Record<string, string>) {
      return option[this.optionLabel];
    },
    getOptionValue(option: Record<string, string>) {
      return option[this.optionValue];
    },
  },
  template:
    '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="String(getOptionValue(option))" :value="String(getOptionValue(option))">{{ getOptionLabel(option) }}</option></select>',
});

const InputTextStub = defineComponent({
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
});

const MessageStub = defineComponent({template: '<div><slot /></div>'});
const DividerStub = defineComponent({template: '<hr />'});
const PanelStub = defineComponent({template: '<div><slot name="header" /><slot /></div>'});
const SlotStub = defineComponent({template: '<div><slot /></div>'});
const EmptyStub = defineComponent({template: '<div />'});

const CheckboxStub = defineComponent({
  props: {
    modelValue: {type: [Boolean, Array], default: false},
    binary: {type: Boolean, default: false},
    inputId: {type: String, default: ''},
    value: {type: String, default: ''},
  },
  emits: ['update:modelValue'],
  methods: {
    onChange(event: Event) {
      const checked = (event.target as HTMLInputElement).checked;
      if (this.binary) {
        this.$emit('update:modelValue', checked);
        return;
      }

      const current = Array.isArray(this.modelValue) ? [...this.modelValue] : [];
      const next = checked
        ? [...current, this.value]
        : current.filter(entry => entry !== this.value);
      this.$emit('update:modelValue', next);
    },
  },
  template:
    '<input :id="inputId" type="checkbox" :checked="binary ? !!modelValue : Array.isArray(modelValue) && modelValue.includes(value)" @change="onChange" />',
});

const InputNumberStub = defineComponent({
  props: {
    modelValue: {type: Number, default: 0},
    inputId: {type: String, default: ''},
  },
  emits: ['update:modelValue'],
  template:
    '<input :id="inputId" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
});

type MockEditor = {
  container: {innerHTML: string};
  destroy: ReturnType<typeof vi.fn>;
  getSession: () => {
    setMode: ReturnType<typeof vi.fn>;
    setUseWorker: ReturnType<typeof vi.fn>;
  };
  getValue: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  setValue: ReturnType<typeof vi.fn>;
  state: {currentValue: string};
};

function createMockEditor(): MockEditor {
  const state = {currentValue: ''};
  const session = {
    setMode: vi.fn(),
    setUseWorker: vi.fn(),
  };

  return {
    container: {innerHTML: ''},
    destroy: vi.fn(),
    getSession: () => session,
    getValue: vi.fn(() => state.currentValue),
    on: vi.fn(),
    setValue: vi.fn((value: string) => {
      state.currentValue = value;
    }),
    state,
  };
}

function button(wrapper: any, text: string) {
  return wrapper.findAll('button').find((entry: any) => entry.text().includes(text));
}

async function setupDialog({
  currentData,
  currentSchema,
}: {
  currentData: unknown;
  currentSchema: Record<string, unknown>;
}) {
  vi.resetModules();

  const apiKeyRef = ref('test-key');
  const dataEditorSetDataMock = vi.fn();
  const schemaEditorSetDataMock = vi.fn();
  const toastAddMock = vi.fn();
  const onErrorMock = vi.fn();
  const generateMappingFunctionSuggestionMock = vi.fn();
  const performDirectAiTargetSchemaMappingMock = vi.fn();
  const editors: MockEditor[] = [];
  const aceEditMock = vi.fn(() => {
    const editor = createMockEditor();
    editors.push(editor);
    return editor;
  });

  vi.doMock('primevue/dialog', () => ({default: DialogStub}));
  vi.doMock('primevue/button', () => ({default: ButtonStub}));
  vi.doMock('primevue/select', () => ({default: SelectStub}));
  vi.doMock('primevue/inputtext', () => ({default: InputTextStub}));
  vi.doMock('primevue/message', () => ({default: MessageStub}));
  vi.doMock('primevue/divider', () => ({default: DividerStub}));
  vi.doMock('primevue/checkbox', () => ({default: CheckboxStub}));
  vi.doMock('primevue/inputnumber', () => ({default: InputNumberStub}));
  vi.doMock('primevue/panel', () => ({default: PanelStub}));
  vi.doMock('@/components/panels/ai-prompts/ApiKey.vue', () => ({default: EmptyStub}));
  vi.doMock('@/components/panels/ai-prompts/ApiKeyWarning.vue', () => ({default: EmptyStub}));
  vi.doMock('@/components/panels/shared-components/PanelSettings.vue', () => ({default: SlotStub}));
  vi.doMock('@/components/panels/shared-components/aceUtils', () => ({
    setupAceProperties: vi.fn(),
  }));
  vi.doMock('@/settings/useSettings', () => ({
    useSettings: () =>
      ref({
        textEditor: {tabSize: 2},
        performance: {
          maxDocumentSizeForSchemaInference: 10_000_000,
          minObjectPropertyCountToPreserve: 1000,
        },
      }),
  }));
  vi.doMock('@/utility/ai/apiKey', () => ({
    getApiKeyRef: () => apiKeyRef,
  }));
  vi.doMock('@/data/useDataLink', () => ({
    getDataForMode: (mode: string) =>
      mode === 'dataEditor'
        ? {
            data: ref(currentData),
            setData: dataEditorSetDataMock,
          }
        : {
            data: ref(currentSchema),
            setData: schemaEditorSetDataMock,
          },
  }));
  vi.doMock('@/utility/toastService', () => ({toastService: {add: toastAddMock}}));
  vi.doMock('@/utility/errorServiceInstance', () => ({
    useErrorService: () => ({
      onError: (error: unknown) => {
        onErrorMock(error);
        throw error;
      },
    }),
  }));
  vi.doMock('@/data-mapping/dataMappingAi', () => ({
    generateMappingFunctionSuggestion: generateMappingFunctionSuggestionMock,
    performDirectAiTargetSchemaMapping: performDirectAiTargetSchemaMappingMock,
  }));
  vi.doMock('brace', () => ({
    edit: aceEditMock,
  }));
  vi.doMock('brace/mode/javascript', () => ({}));
  vi.doMock('brace/mode/jsoniq', () => ({}));
  vi.doMock('brace/mode/text', () => ({}));

  const DataMappingDialog = (
    await import('@/components/toolbar/dialogs/data-mapping/DataMappingDialog.vue')
  ).default;

  const wrapper = mount(DataMappingDialog, {
    attachTo: document.body,
  });

  return {
    wrapper,
    dataEditorSetDataMock,
    schemaEditorSetDataMock,
    toastAddMock,
    generateMappingFunctionSuggestionMock,
    performDirectAiTargetSchemaMappingMock,
    editors,
  };
}

async function openDialog(wrapper: any) {
  (wrapper.vm as any).show();
  await nextTick();
  await flushPromises();
}

describe('DataMappingDialog', () => {
  it('uses the inferred and refined source schema without overwriting the current target schema', async () => {
    const currentSchema = {
      type: 'object',
      properties: {
        fullName: {type: 'string'},
      },
      required: ['fullName'],
    };
    const {
      wrapper,
      schemaEditorSetDataMock,
      generateMappingFunctionSuggestionMock,
    } = await setupDialog({
      currentData: [
        {name: 'Alice', age: 30},
        {name: 'Bob', age: 41},
      ],
      currentSchema,
    });

    generateMappingFunctionSuggestionMock.mockResolvedValue({
      config: 'function transform(input) { return input; }',
      success: true,
      message: 'ok',
    });

    await openDialog(wrapper);
    await wrapper.findAll('select')[0]!.setValue('inferred-source-schema');
    await flushPromises();
    await wrapper.findAll('select')[1]!.setValue('javascript');
    await flushPromises();
    await wrapper.get('#mapping-inferred-source-schema-add-examples').setValue(true);
    await flushPromises();
    await button(wrapper, 'Generate Suggestion')!.trigger('click');
    await flushPromises();

    expect(generateMappingFunctionSuggestionMock).toHaveBeenCalledTimes(1);
    const request = generateMappingFunctionSuggestionMock.mock.calls[0]![0];
    expect(request.method).toBe('inferred-source-schema');
    expect(request.language).toBe('javascript');
    expect(request.targetSchema).toEqual(currentSchema);
    expect(request.inputData).toBeUndefined();
    expect(request.sourceSchema.type).toBe('array');
    expect(request.sourceSchema.items.properties.name.examples).toEqual(['Alice', 'Bob']);
    expect(request.sourceSchema.items.properties.age.examples).toEqual([30, 41]);
    expect(schemaEditorSetDataMock).not.toHaveBeenCalled();
  });

  it('executes direct AI mapping and applies the returned result to the Data Editor', async () => {
    const currentData = {
      firstName: 'Ada',
      lastName: 'Lovelace',
    };
    const currentSchema = {
      type: 'object',
      properties: {
        fullName: {type: 'string'},
      },
      required: ['fullName'],
    };
    const {
      wrapper,
      dataEditorSetDataMock,
      schemaEditorSetDataMock,
      performDirectAiTargetSchemaMappingMock,
    } = await setupDialog({
      currentData,
      currentSchema,
    });

    performDirectAiTargetSchemaMappingMock.mockResolvedValue({
      resultData: {fullName: 'Ada Lovelace'},
      success: true,
      message: 'AI mapping executed successfully.',
    });

    await openDialog(wrapper);
    await wrapper.findAll('select')[0]!.setValue('direct-ai');
    await flushPromises();

    expect(wrapper.text()).toContain('Execute AI Mapping');
    expect(wrapper.text()).not.toContain('Generate Suggestion');

    await button(wrapper, 'Execute AI Mapping')!.trigger('click');
    await flushPromises();

    expect(performDirectAiTargetSchemaMappingMock).toHaveBeenCalledWith(
      currentData,
      currentSchema,
      ''
    );
    expect(dataEditorSetDataMock).toHaveBeenCalledWith({fullName: 'Ada Lovelace'});
    expect(schemaEditorSetDataMock).not.toHaveBeenCalled();
  });
});
