import {shallowMount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ValidationResults} from '@/utility/validationService';
import {JsonSchema} from '@/schema/jsonSchema';
import StringProperty from '../StringProperty.vue';
import InputText from 'primevue/inputtext';

// avoid constructing the session store through imports, it is not required for this component
vi.mock('@/store/sessionStore', () => ({
  useSessionStore: vi.fn(),
}));

describe('StringProperty', () => {
  let wrapper: any;
  let inputField: any;

  function shallowMountBeforeEach(props: any) {
    beforeEach(() => {
      wrapper = shallowMount(StringProperty, {
        props: props,
      });
      inputField = wrapper.findComponent(InputText);
    });
    afterEach(() => {
      wrapper.unmount();
    });
  }

  describe('with string data', () => {
    shallowMountBeforeEach({
      propertyName: 'foo',
      propertyData: 'bar',
      validationResults: new ValidationResults([]),
      propertySchema: new JsonSchema({
        type: 'string',
      }),
    });

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe('bar');
    });

    it('should not emit an event when the input field is updated', async () => {
      await inputField.setValue('baz');
      expect(wrapper.emitted()).toEqual({});
    });

    it('should emit an event when the input field is deselected', async () => {
      inputField.setValue('baz');
      inputField.vm.$emit('blur');
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).toEqual([['baz']]);
    });

    it('should emit an event when pressing enter', async () => {
      inputField.setValue('baz');
      inputField.trigger('keyup', {key: 'Enter'});
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).toEqual([['baz']]);
    });
  });

  describe('with number data', () => {
    shallowMountBeforeEach({
      propertyName: 'foo',
      propertyData: 1,
      validationResults: new ValidationResults([]),
      propertySchema: new JsonSchema({
        type: 'number',
      }),
    });

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe(1);
    });
  });

  describe('with object data', () => {
    shallowMountBeforeEach({
      propertyName: 'foo',
      propertyData: {},
      validationResults: new ValidationResults([]),
      propertySchema: new JsonSchema({
        type: 'object',
      }),
    });

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe('{}');
    });
  });

  describe('with array data', () => {
    shallowMountBeforeEach({
      propertyName: 'foo',
      propertyData: [],
      validationResults: new ValidationResults([]),
      propertySchema: new JsonSchema({
        type: 'array',
      }),
    });

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe('[]');
    });
  });

  describe('with null data', () => {
    shallowMountBeforeEach({
      propertyName: 'foo',
      propertyData: null,
      validationResults: new ValidationResults([]),
      propertySchema: new JsonSchema({
        type: 'null',
      }),
    });

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe('null');
    });
  });

  describe('with undefined data', () => {
    shallowMountBeforeEach({
      propertyName: 'foo',
      propertyData: undefined,
      validationResults: new ValidationResults([]),
      propertySchema: new JsonSchema({}),
    });

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe('');
    });
  });
});
