import {shallowMount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, test, vi} from 'vitest';
import {ValidationResult} from '../../../../schema/validation/validationService';
import BooleanProperty from '../BooleanProperty.vue';
import SelectButton from 'primevue/selectbutton';

// avoid constructing the session store through imports, it is not required for this component
vi.mock('@/store/sessionStore', () => ({
  useSessionStore: vi.fn(),
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
