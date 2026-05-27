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
  it('preselects the Uni Stuttgart relay option for the default AI backend settings', async () => {
    selectedOneOfOptions.value = new Map();
    selectedTypeUnionOptions.value = new Map();
    expand.mockClear();

    const backendSchema = SETTINGS_SCHEMA.properties!.aiIntegration!.properties!.backend!;
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

    const selected = selectedOneOfOptions.value.get('aiIntegration.backend');
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
