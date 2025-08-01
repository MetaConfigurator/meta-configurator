import {mount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import StringProperty from '../StringProperty.vue';
import InputText from 'primevue/inputtext';
import {ValidationResult} from '@/schema/validationService';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {SessionMode} from '@/store/sessionMode';
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

describe('StringProperty', () => {
  let wrapper: any;
  let inputField: any;

  function mountBeforeEach(props: any) {
    beforeEach(() => {
      // @ts-ignore
      wrapper = mount(StringProperty, {
        props: props,
      });
      inputField = wrapper.findComponent(InputText);
    });
    afterEach(() => {
      wrapper.unmount();
    });
  }

  describe('with string data', () => {
    mountBeforeEach({
      propertyName: 'foo',
      propertyData: 'bar',
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'string',
        },
        SessionMode.DataEditor,
        false
      ),
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

    it('should correctly respond to external changes', async () => {
      await wrapper.setProps({
        propertyName: 'foo',
        propertyData: 'newData',
        validationResults: new ValidationResult([]),
        propertySchema: new JsonSchemaWrapper(
          {
            type: 'string',
          },
          SessionMode.DataEditor,
          false
        ),
      });
      expect(inputField.props().modelValue).toBe('newData');
      expect(wrapper.emitted()).toEqual({});
      inputField.trigger('keyup', {key: 'Enter'});
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:propertyData')).toEqual([['newData']]);
    });
  });

  describe('with number data', () => {
    mountBeforeEach({
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

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe(1);
    });
  });

  describe('with object data', () => {
    mountBeforeEach({
      propertyName: 'foo',
      propertyData: {},
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'object',
        },
        SessionMode.DataEditor,
        false
      ),
    });

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe('');
    });
  });

  describe('with array data', () => {
    mountBeforeEach({
      propertyName: 'foo',
      propertyData: [],
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'array',
        },
        SessionMode.DataEditor,
        false
      ),
    });

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe('');
    });
  });

  describe('with null data', () => {
    mountBeforeEach({
      propertyName: 'foo',
      propertyData: null,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'null',
        },
        SessionMode.DataEditor,
        false
      ),
    });

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe('null');
    });
  });

  describe('with undefined data', () => {
    mountBeforeEach({
      propertyName: 'foo',
      propertyData: undefined,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper({}, SessionMode.DataEditor, false),
    });

    it('should correctly setup the input field', () => {
      expect(inputField.props().modelValue).toBe('');
    });
  });
});
