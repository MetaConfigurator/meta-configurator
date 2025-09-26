import {mount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, test, vi} from 'vitest';
import NumberProperty from '../NumberProperty.vue';
import InputNumber from 'primevue/inputnumber';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {GuiConstants} from '@/constants';
import {SessionMode} from '@/store/sessionMode';
import {ValidationResult} from '@/schema/validationUtils';
import {config} from '@vue/test-utils';
import {defaultOptions} from 'primevue/config';

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

describe('NumberProperty', () => {
  let wrapper: any;
  let inputNumber: any;

  function mountBeforeEach(props: any) {
    beforeEach(() => {
      // @ts-ignore
      wrapper = mount(NumberProperty, {
        props: props,
      });
      inputNumber = wrapper.findComponent(InputNumber);
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

      it('should correctly setup the input number', () => {
        expect(inputNumber.props().modelValue).toBe(data);
        expect(inputNumber.props().minFractionDigits).toBe(0);
        expect(inputNumber.props().maxFractionDigits).toBe(0);
        expect(inputNumber.props().step).toBe(1);
        expect(inputNumber.props().min).toBeNull();
        expect(inputNumber.props().max).toBeNull();
        expect(inputNumber.props().mode).toBe('decimal');
        expect(inputNumber.props().placeholder).toBe('foo');
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

      it('should correctly setup the input number', () => {
        expect(inputNumber.props().modelValue).toBe(data);
        expect(inputNumber.props().minFractionDigits).toBe(0);
        expect(inputNumber.props().maxFractionDigits).toBe(GuiConstants.NUMBER_MAX_DECIMAL_PLACES);
        expect(inputNumber.props().step).toBe(0.5);
        expect(inputNumber.props().min).toBeNull();
        expect(inputNumber.props().max).toBeNull();
        expect(inputNumber.props().mode).toBe('decimal');
        expect(inputNumber.props().placeholder).toBe('foo');
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
      inputNumber.vm.$emit('update:modelValue', 0);
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).toStrictEqual([[0]]);
    });

    test('on value change to 2', async () => {
      inputNumber.vm.$emit('update:modelValue', 2);
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).toStrictEqual([[2]]);
    });

    test('on value change to undefined', async () => {
      inputNumber.vm.$emit('update:modelValue', undefined);
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).not.toBeDefined();
    });

    test('on value change to null', async () => {
      inputNumber.vm.$emit('update:modelValue', null);
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).not.toBeDefined();
    });
  });
});
