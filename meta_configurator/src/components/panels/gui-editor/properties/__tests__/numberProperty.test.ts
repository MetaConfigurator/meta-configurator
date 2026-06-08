import {mount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, test, vi} from 'vitest';
import NumberProperty from '../NumberProperty.vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {SessionMode} from '@/store/sessionMode';
import {ValidationResult} from '@/schema/validationUtils';
import {config} from '@vue/test-utils';
import {defaultOptions} from 'primevue/config';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';

config.global.mocks['$primevue'] = {
  config: defaultOptions,
};

// avoid constructing useDataLink store through imports, it is not required for this component
vi.mock('@/data/useDataLink', () => ({
  getSchemaForMode: vi.fn(),
  getDataForMode: vi.fn(),
  useCurrentData: vi.fn(),
  useCurrentSchema: vi.fn(),
  getUserSelectionForMode: vi.fn(),
  getValidationForMode: vi.fn(),
  getSessionForMode: vi.fn(),
}));

const settings = structuredClone(SETTINGS_DATA_DEFAULT);

vi.mock('@/settings/useSettings', () => ({
  useSettings: vi.fn(() => ({
    value: settings,
  })),
}));

describe('NumberProperty', () => {
  let wrapper: any;
  let inputText: any;

  function mountComponent(props: any) {
    wrapper = mount(NumberProperty, {
      props,
    });
    inputText = wrapper.findComponent(InputText);
  }

  beforeEach(() => {
    settings.guiEditor.useScientificNotationForLargeAndSmallNumbers = true;
    settings.guiEditor.scientificNotationUpperThreshold = 1e21;
    settings.guiEditor.scientificNotationLowerThreshold = 1e-7;
  });

  function mountBeforeEach(props: any) {
    beforeEach(() => {
      mountComponent(props);
    });
    afterEach(() => {
      wrapper.unmount();
    });
  }

  describe('with type integer', () => {
    describe.each([undefined, -1, 0, 1, 10])('with value %s', data => {
      const props = {
        propertyName: 'foo',
        propertyData: data,
        validationResults: new ValidationResult([]),
        propertySchema: new JsonSchemaWrapper(
          {
            type: 'integer',
          },
          SessionMode.DataEditor,
          false
        ),
      };
      mountBeforeEach(props);

      it('should correctly setup the input text and step buttons', () => {
        expect(inputText.props().modelValue).toBe(data === undefined ? '' : String(data));
        expect(inputText.attributes().placeholder).toBe('foo');
        expect(wrapper.findAllComponents(Button)).toHaveLength(2);
      });
    });
  });

  describe('with type number', () => {
    describe.each([undefined, -1, 0, 0.1, 1, 1.5])('with value %s', data => {
      const props = {
        propertyName: 'foo',
        propertyData: data,
        validationResults: new ValidationResult([]),
        propertySchema: new JsonSchemaWrapper(
          {
            type: 'number',
            multipleOf: 0.5,
          },
          SessionMode.DataEditor,
          false
        ),
      };
      mountBeforeEach(props);

      it('should correctly setup the input text without step buttons', () => {
        expect(inputText.props().modelValue).toBe(data === undefined ? '' : String(data));
        expect(inputText.attributes().placeholder).toBe('foo');
        expect(wrapper.findAllComponents(Button)).toHaveLength(0);
      });
    });
  });

  describe('emits the correct event', () => {
    mountBeforeEach({
      propertyName: 'foo',
      propertyData: 1,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'integer',
        },
        SessionMode.DataEditor,
        false
      ),
    });

    test('on value change to 0', async () => {
      inputText.vm.$emit('update:modelValue', '0');
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).toStrictEqual([[0]]);
    });

    test('on value change to 2e9', async () => {
      inputText.vm.$emit('update:modelValue', '2e9');
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).toStrictEqual([[2000000000]]);
    });

    test('does not emit for non-integer values on integer fields', async () => {
      inputText.vm.$emit('update:modelValue', '1.2e-1');
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).not.toBeDefined();
    });

    test('on empty value', async () => {
      inputText.vm.$emit('update:modelValue', '');
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).not.toBeDefined();
    });
  });

  test('emits scientific notation for number fields', async () => {
    mountComponent({
      propertyName: 'foo',
      propertyData: 1,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'number',
        },
        SessionMode.DataEditor,
        false
      ),
    });

    inputText.vm.$emit('update:modelValue', '1.2e-3');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:propertyData')).toStrictEqual([[0.0012]]);
    wrapper.unmount();
  });

  test('steps integer fields using multipleOf', async () => {
    mountComponent({
      propertyName: 'foo',
      propertyData: 1,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'integer',
          multipleOf: 5,
        },
        SessionMode.DataEditor,
        false
      ),
    });

    await wrapper.findAllComponents(Button)[0]!.trigger('click');
    expect(wrapper.emitted('update:propertyData')).toStrictEqual([[6]]);
    wrapper.unmount();
  });

  test('displays large values in scientific notation above the upper threshold', () => {
    settings.guiEditor.scientificNotationUpperThreshold = 1e9;
    mountComponent({
      propertyName: 'foo',
      propertyData: 2e9,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'number',
        },
        SessionMode.DataEditor,
        false
      ),
    });

    expect(inputText.props().modelValue).toBe('2e+9');
    wrapper.unmount();
  });

  test('displays small values in scientific notation below the lower threshold', () => {
    settings.guiEditor.scientificNotationLowerThreshold = 1e-4;
    mountComponent({
      propertyName: 'foo',
      propertyData: 1.2e-5,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'number',
        },
        SessionMode.DataEditor,
        false
      ),
    });

    expect(inputText.props().modelValue).toBe('1.2e-5');
    wrapper.unmount();
  });

  test('expands scientific notation when display setting is disabled', () => {
    settings.guiEditor.useScientificNotationForLargeAndSmallNumbers = false;
    mountComponent({
      propertyName: 'foo',
      propertyData: 2e9,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'number',
        },
        SessionMode.DataEditor,
        false
      ),
    });

    expect(inputText.props().modelValue).toBe('2000000000');
    wrapper.unmount();
  });
});
