import {shallowMount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import EnumProperty from '@/components/gui-editor/properties/EnumProperty.vue';
import Dropdown from 'primevue/dropdown';
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

describe('EnumProperty', () => {
  it('should be defined', () => {
    expect(EnumProperty).toBeDefined();
  });

  let wrapper: any;
  let dropdown: any;

  function shallowMountBeforeEach(props: any) {
    beforeEach(() => {
      // @ts-ignore
      wrapper = shallowMount(EnumProperty, {
        props: props,
      });
      dropdown = wrapper.findComponent(Dropdown);
    });
    afterEach(() => {
      wrapper.unmount();
    });
  }

  describe('with string options', () => {
    const stringValuesProps = {
      propertyName: 'testName',
      possibleValues: ['testValue1', 'testValue2'],
      propertyData: 'testValue1',
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'string',
        },
        SessionMode.DataEditor,
        false
      ),
    };
    shallowMountBeforeEach(stringValuesProps);

    it('should have the correct props', () => {
      expect(wrapper.props()).toEqual(stringValuesProps);
    });

    describe('initializes dropdown correctly', () => {
      it('should have exactly one dropdown', () => {
        expect(dropdown.exists()).toBe(true);
        expect(wrapper.findAllComponents(Dropdown).length).toBe(1);
      });

      it('should have the correct placeholder', () => {
        expect(dropdown.props().placeholder).toBe('Select testName');
      });

      it('should be editable', () => {
        expect(dropdown.props().editable).toBe(true);
      });

      it('should have the correct options', () => {
        expect(dropdown.props().options).toEqual([
          {
            name: 'testValue1',
            value: 'testValue1',
          },
          {
            name: 'testValue2',
            value: 'testValue2',
          },
        ]);
      });

      it('should have the correct value', () => {
        expect(dropdown.props().modelValue).toEqual({
          name: 'testValue1',
          value: 'testValue1',
        });
      });
    });

    describe('emits the correct event', () => {
      it('should emit the correct event when the value changes', async () => {
        dropdown.vm.$emit('update:modelValue', {name: 'testValue2', value: 'testValue2'});
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toEqual([['testValue2']]);
      });

      it('should emit the correct event when the value changes to an value that is not in the options', async () => {
        dropdown.vm.$emit('update:modelValue', 'otherValue');
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toEqual([['otherValue']]);
      });

      it('should emit the correct event when the value changes to undefined', async () => {
        dropdown.vm.$emit('update:modelValue', undefined);
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toEqual([[undefined]]);
      });
    });
  });

  describe('with number options', () => {
    const numberValuesProps = {
      propertyName: 'testName',
      possibleValues: [1, 2],
      propertyData: 1,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'string',
        },
        SessionMode.DataEditor,
        false
      ),
    };
    shallowMountBeforeEach(numberValuesProps);

    it('should have the correct props', () => {
      expect(wrapper.props()).toEqual(numberValuesProps);
    });

    describe('initializes dropdown correctly', () => {
      it('should not be editable', () => {
        expect(dropdown.props().editable).toBe(false);
      });

      it('should have the correct options', () => {
        expect(dropdown.props().options).toEqual([
          {
            name: '1',
            value: 1,
          },
          {
            name: '2',
            value: 2,
          },
        ]);
      });

      it('should have the correct value', () => {
        expect(dropdown.props().modelValue).toEqual({
          name: '1',
          value: 1,
        });
      });
    });

    describe('emits the correct event', () => {
      it('should emit the correct event when the value changes', async () => {
        dropdown.vm.$emit('update:modelValue', {name: '2', value: 2});
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toEqual([[2]]);
      });
    });
  });

  describe('with boolean options', () => {
    const booleanValuesProps = {
      propertyName: 'testName',
      possibleValues: [true, false],
      propertyData: false,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'string',
        },
        SessionMode.DataEditor,
        false
      ),
    };
    shallowMountBeforeEach(booleanValuesProps);

    it('should have the correct props', () => {
      expect(wrapper.props()).toEqual(booleanValuesProps);
    });

    describe('initializes dropdown correctly', () => {
      it('should not be editable', () => {
        expect(dropdown.props().editable).toBe(false);
      });

      it('should have the correct options', () => {
        expect(dropdown.props().options).toEqual([
          {
            name: 'true',
            value: true,
          },
          {
            name: 'false',
            value: false,
          },
        ]);
      });

      it('should have the correct value', () => {
        expect(dropdown.props().modelValue).toEqual({
          name: 'false',
          value: false,
        });
      });
    });

    describe('emits the correct event', () => {
      it('should emit the correct event when the value changes', async () => {
        dropdown.vm.$emit('update:modelValue', {name: 'true', value: true});
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toEqual([[true]]);
      });
    });
  });

  describe('with object options', () => {
    const objectValuesProps = {
      propertyName: 'testName',
      possibleValues: [{firstName: 'testValue1'}, {firstName: 'testValue2'}],
      propertyData: {firstName: 'testValue1'},
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'string',
        },
        SessionMode.DataEditor,
        false
      ),
    };
    shallowMountBeforeEach(objectValuesProps);

    it('should have the correct props', () => {
      expect(wrapper.props()).toEqual(objectValuesProps);
    });

    describe('initializes dropdown correctly', () => {
      it('should not be editable', () => {
        expect(dropdown.props().editable).toBe(false);
      });

      it('should have the correct options', () => {
        expect(dropdown.props().options).toEqual([
          {
            name: 'firstName: testValue1',
            value: {firstName: 'testValue1'},
          },
          {
            name: 'firstName: testValue2',
            value: {firstName: 'testValue2'},
          },
        ]);
      });

      it('should have the correct value', () => {
        expect(dropdown.props().modelValue).toEqual({
          name: 'firstName: testValue1',
          value: {firstName: 'testValue1'},
        });
      });
    });

    describe('emits the correct event', () => {
      it('should emit the correct event when the value changes', async () => {
        dropdown.vm.$emit('update:modelValue', {
          name: 'firstName: testValue2',
          value: {firstName: 'testValue2'},
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toEqual([[{firstName: 'testValue2'}]]);
      });
    });
  });

  describe('with array options', () => {
    const arrayValuesProps = {
      propertyName: 'testName',
      possibleValues: [['testValue1'], ['testValue2', 'testValue3']],
      propertyData: ['testValue1'],
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'string',
        },
        SessionMode.DataEditor,
        false
      ),
    };
    shallowMountBeforeEach(arrayValuesProps);

    it('should have the correct props', () => {
      expect(wrapper.props()).toEqual(arrayValuesProps);
    });

    describe('initializes dropdown correctly', () => {
      it('should have the correct options', () => {
        expect(dropdown.props().options).toEqual([
          {
            name: 'testValue1',
            value: ['testValue1'],
          },
          {
            name: 'testValue2, testValue3',
            value: ['testValue2', 'testValue3'],
          },
        ]);
      });

      it('should have the correct value', () => {
        expect(dropdown.props().modelValue).toEqual({
          name: 'testValue1',
          value: ['testValue1'],
        });
      });
    });

    describe('emits the correct event', () => {
      it('should emit the correct event when the value changes', async () => {
        dropdown.vm.$emit('update:modelValue', {
          name: 'testValue2, testValue3',
          value: ['testValue2', 'testValue3'],
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:propertyData')).toEqual([[['testValue2', 'testValue3']]]);
      });
    });
  });

  describe('with null options', () => {
    const nullValuesProps = {
      propertyName: 'testName',
      possibleValues: [null],
      propertyData: null,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'string',
        },
        SessionMode.DataEditor,
        false
      ),
    };

    beforeEach(() => {
      // @ts-ignore
      wrapper = shallowMount(EnumProperty, {
        props: nullValuesProps,
      });
      dropdown = wrapper.findComponent(Dropdown);
    });
    afterEach(() => {
      wrapper.unmount();
    });

    it('should have the correct props', () => {
      expect(wrapper.props()).toEqual(nullValuesProps);
    });

    describe('initializes dropdown correctly', () => {
      it('should not be editable', () => {
        expect(dropdown.props().editable).toBe(false);
      });

      it('should have the correct options', () => {
        expect(dropdown.props().options).toEqual([
          {
            name: 'null',
            value: null,
          },
        ]);
      });

      it('should have the correct value', () => {
        expect(dropdown.props().modelValue).toEqual({
          name: 'null',
          value: null,
        });
      });
    });
  });

  describe.each([undefined, null, 'notInOptions'])('with special value %s', data => {
    const testProps = {
      propertyName: 'testName',
      possibleValues: ['testValue1', 'testValue2'],
      propertyData: data,
      validationResults: new ValidationResult([]),
      propertySchema: new JsonSchemaWrapper(
        {
          type: 'string',
        },
        SessionMode.DataEditor,
        false
      ),
    };
    shallowMountBeforeEach(testProps);

    it('should have the correct props', () => {
      expect(wrapper.props()).toEqual(testProps);
    });

    describe('initializes dropdown correctly', () => {
      it('should have the correct placeholder', () => {
        expect(dropdown.props().placeholder).toBe('Select testName');
      });

      it('should have the correct value', () => {
        expect(dropdown.props().modelValue).toEqual(data);
      });
    });
  });
});
