import {shallowMount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, test, vi} from 'vitest';
import BooleanProperty from '../BooleanProperty.vue';
import SelectButton from 'primevue/selectbutton';
import {ValidationResult} from '../../../../schema/validationService';
import {JsonSchemaWrapper} from '../../../../schema/jsonSchemaWrapper';
import {SessionMode} from '../../../../store/sessionMode';

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

describe('BooleanProperty', () => {
  let wrapper: any;
  let selectButton: any;

  function shallowMountBeforeEach(props: any) {
    beforeEach(() => {
      // @ts-ignore
      wrapper = shallowMount(BooleanProperty, {
        props: props,
      });
      selectButton = wrapper.findComponent(SelectButton);
    });
    afterEach(() => {
      wrapper.unmount();
    });
  }

  describe.each([
    ['true', true],
    ['false', false],
    ['undefined', undefined],
  ])(`with value %s`, (type, data) => {
    shallowMountBeforeEach({
      propertyName: 'foo',
      propertyData: data,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'boolean',
        },
        SessionMode.FileEditor,
        false
      ),
    });

    it('should correctly setup the select button', () => {
      expect(selectButton.props().modelValue).toBe(data);
      expect(selectButton.props().options).toStrictEqual([
        {name: 'true', value: true},
        {name: 'false', value: false},
      ]);
    });

    describe('emits the correct event', () => {
      test('on value change to false', async () => {
        selectButton.vm.$emit('update:modelValue', false);
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toStrictEqual([[false]]);
      });

      test('on value change to true', async () => {
        selectButton.vm.$emit('update:modelValue', true);
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toStrictEqual([[true]]);
      });

      test('on value change to undefined', async () => {
        selectButton.vm.$emit('update:modelValue', undefined);
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toStrictEqual([[!data]]);
      });

      test('on value change to null', async () => {
        selectButton.vm.$emit('update:modelValue', null);
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toStrictEqual([[!data]]);
      });
    });
  });
});
