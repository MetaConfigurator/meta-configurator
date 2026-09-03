import {config, mount} from '@vue/test-utils';
import {describe, expect, it, vi} from 'vitest';
import DatePicker from 'primevue/datepicker';
import DateProperty from '../DateProperty.vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {ValidationResult} from '@/schema/validationUtils';
import {SessionMode} from '@/store/sessionMode';
import {defaultOptions} from 'primevue/config';

config.global.mocks['$primevue'] = {config: defaultOptions};

vi.mock('@/data/useDataLink', () => ({
  getSchemaForMode: vi.fn(),
  getDataForMode: vi.fn(),
  getUserSelectionForMode: vi.fn(),
  getValidationForMode: vi.fn(),
  getSessionForMode: vi.fn(),
}));

function mountDateProperty(propertyData: unknown) {
  return mount(DateProperty, {
    props: {
      propertyName: 'date',
      propertyData,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {type: 'string', format: 'date'},
        SessionMode.DataEditor,
        false
      ),
    },
  });
}

describe('DateProperty', () => {
  it.each([null, 42, {}, 'not-a-date'])('renders invalid data without throwing', propertyData => {
    let wrapper: ReturnType<typeof mountDateProperty> | undefined;

    expect(() => {
      wrapper = mountDateProperty(propertyData);
    }).not.toThrow();
    expect(wrapper!.findComponent(DatePicker).props().modelValue).toBeUndefined();

    wrapper!.unmount();
  });

  it('ignores an invalid Date emitted by the picker', async () => {
    const wrapper = mountDateProperty('2026-09-03');

    wrapper.findComponent(DatePicker).vm.$emit('update:modelValue', new Date('invalid'));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:propertyData')).toEqual([[undefined]]);
    wrapper.unmount();
  });
});
