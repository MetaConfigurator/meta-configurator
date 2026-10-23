import {schemaSelectionKey} from '@/data/schemaSelectionKey';
import {mount, config} from '@vue/test-utils';
import {computed, ref} from 'vue';
import {describe, expect, it, vi} from 'vitest';
import {defaultOptions} from 'primevue/config';
import Select from 'primevue/select';
import OneOfSelectionProperty from '@/components/panels/gui-editor/properties/OneOfSelectionProperty.vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {ValidationService} from '@/schema/validationService';
import {SETTINGS_SCHEMA} from '@/settings/settingsSchema';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import {SessionMode} from '@/store/sessionMode';
import {preprocessOneTime} from '@/schema/oneTimeSchemaPreprocessor';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';

config.global.mocks['$primevue'] = {
  config: defaultOptions,
};

const selectedOneOfOptions = ref(new Map());
const selectedTypeUnionOptions = ref(new Map());
const expand = vi.fn();

vi.mock('@/data/useDataLink', () => ({
  getSchemaForMode: vi.fn(),
  getDataForMode: vi.fn(),
  useCurrentData: vi.fn(),
  useCurrentSchema: vi.fn(),
  getUserSelectionForMode: vi.fn(() => ({
    currentSelectedOneOfOptions: selectedOneOfOptions,
    currentSelectedTypeUnionOptions: selectedTypeUnionOptions,
  })),
  getValidationForMode: vi.fn(() => ({
    currentValidationService: computed(() => new ValidationService(SETTINGS_SCHEMA)),
  })),
  getSessionForMode: vi.fn(() => ({
    expand,
  })),
}));

vi.mock('@/settings/useSettings', () => ({
  useSettings: vi.fn(() => ref(SETTINGS_DATA_DEFAULT)),
}));

describe('OneOfSelectionProperty', () => {
  function mountSelection(branch: JsonSchemaType, data: unknown, isTypeUnion = false) {
    selectedOneOfOptions.value = new Map();
    selectedTypeUnionOptions.value = new Map();
    const propertySchema = new JsonSchemaWrapper(
      preprocessOneTime({oneOf: [branch, {type: 'string'}]}),
      SessionMode.DataEditor,
      false
    );
    const wrapper = mount(OneOfSelectionProperty, {
      props: {
        propertyName: 'model',
        propertySchema,
        propertyData: data,
        absolutePath: ['model'],
        possibleSchemas: propertySchema.oneOf,
        isTypeUnion,
        sessionMode: SessionMode.DataEditor,
      },
    });
    return wrapper;
  }

  function selectFirst(wrapper: ReturnType<typeof mountSelection>) {
    const select = wrapper.findComponent(Select);
    select.vm.$emit('update:modelValue', select.props('options')![0]);
    return wrapper.emitted('update:propertyData');
  }

  it('preserves explicit null in a nullable descendant while filling the selected model', () => {
    const wrapper = mountSelection(
      {
        type: 'object',
        properties: {
          kind: {const: 'model'},
          child: {type: ['object', 'null'], properties: {kind: {const: 'child'}}},
        },
      },
      {child: null}
    );
    expect(selectFirst(wrapper)).toEqual([[{kind: 'model', child: null}]]);
    wrapper.unmount();
  });

  it('does not create an object for properties on a non-object schema', () => {
    const wrapper = mountSelection(
      {
        type: 'object',
        properties: {
          kind: {const: 'model'},
          child: {type: 'null', properties: {kind: {const: 'child'}}},
        },
      },
      {}
    );
    expect(selectFirst(wrapper)).toEqual([[{kind: 'model'}]]);
    wrapper.unmount();
  });

  it('does not mutate input data or share object constants with the schema', () => {
    const data = Object.freeze({nested: Object.freeze({kind: 'old', notes: 'keep'})});
    const wrapper = mountSelection(
      {
        type: 'object',
        properties: {
          nested: {type: 'object', properties: {kind: {const: 'new'}}},
          options: {const: {items: [1, 2]}},
        },
      },
      data
    );
    const result = selectFirst(wrapper)![0]![0] as any;
    expect(result).toEqual({nested: {kind: 'new', notes: 'keep'}, options: {items: [1, 2]}});
    expect(data.nested.kind).toBe('old');
    result.options.items.push(3);
    expect((selectFirst(wrapper)![1]![0] as any).options).toEqual({items: [1, 2]});
    wrapper.unmount();
  });

  it('does not apply constants from unselected descendant branches', () => {
    const wrapper = mountSelection(
      {
        type: 'object',
        properties: {
          kind: {const: 'model'},
          child: {
            oneOf: [
              {type: 'object', properties: {kind: {const: 'a'}}},
              {type: 'object', properties: {kind: {const: 'b'}}},
            ],
          },
        },
      },
      {}
    );
    expect(selectFirst(wrapper)).toEqual([[{kind: 'model'}]]);
    wrapper.unmount();
  });

  it.each([42, ['keep']])('preserves existing non-object data %j', data => {
    const wrapper = mountSelection({type: 'object', properties: {kind: {const: 'model'}}}, data);
    expect(selectFirst(wrapper)).toBeUndefined();
    wrapper.unmount();
  });

  it('does not emit a data update when constants already match', () => {
    const wrapper = mountSelection(
      {type: 'object', properties: {kind: {const: 'model'}}},
      {kind: 'model'}
    );
    expect(selectFirst(wrapper)).toBeUndefined();
    wrapper.unmount();
  });

  it('does not apply constants when choosing a type union', () => {
    const wrapper = mountSelection(
      {type: 'object', properties: {kind: {const: 'model'}}},
      undefined,
      true
    );
    expect(selectFirst(wrapper)).toBeUndefined();
    wrapper.unmount();
  });

  it('preselects the Uni Stuttgart relay option for the default AI backend settings', async () => {
    selectedOneOfOptions.value = new Map();
    selectedTypeUnionOptions.value = new Map();
    expand.mockClear();

    const backendSchema = (SETTINGS_SCHEMA as any).properties.aiIntegration.properties.backend;
    const propertySchema = new JsonSchemaWrapper(backendSchema, SessionMode.Settings, false);

    const wrapper = mount(OneOfSelectionProperty, {
      props: {
        propertyName: 'backend',
        propertySchema,
        propertyData: SETTINGS_DATA_DEFAULT.aiIntegration.backend,
        absolutePath: ['aiIntegration', 'backend'],
        possibleSchemas: propertySchema.oneOf,
        isTypeUnion: false,
        sessionMode: SessionMode.Settings,
      },
    });

    await wrapper.vm.$nextTick();

    const selected = selectedOneOfOptions.value.get(
      schemaSelectionKey(['aiIntegration', 'backend'])
    );
    expect(selected).toBeDefined();
    expect(selected.index).toBe(1);
    expect(selected.name).toContain('Uni Stuttgart Relay');
    expect(wrapper.findComponent(Select).props('modelValue')).toMatchObject({
      index: 1,
      name: expect.stringContaining('Uni Stuttgart Relay'),
    });

    wrapper.unmount();
  });
});
