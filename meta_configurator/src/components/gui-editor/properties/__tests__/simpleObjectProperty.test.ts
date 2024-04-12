import {mount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import SimpleObjectProperty from '../SimpleObjectProperty.vue';
import {JsonSchemaWrapper} from '../../../../schema/jsonSchemaWrapper';

// avoid constructing the session store through imports, it is not required for this component
vi.mock('@/store/sessionStore', () => ({
  useSessionStore: vi.fn(),
}));

describe('SimpleObjectProperty', () => {
  let wrapper: any;
  let spanWithDescription: any;
  let spanWithCount: any;

  function mountBeforeEach(props: any) {
    beforeEach(() => {
      // @ts-ignore
      wrapper = mount(SimpleObjectProperty, {
        props: props,
      });
      spanWithDescription = wrapper.find('[data-test="object-description"]');
      spanWithCount = wrapper.find('[data-test="object-count"]');
    });
    afterEach(() => {
      wrapper.unmount();
    });
  }

  describe('expanded', () => {
    mountBeforeEach({
      expanded: true,
      propertyData: {foo: 'bar'},
    });

    it('should not show a description', () => {
      expect(spanWithDescription.exists()).toBe(false);
    });

    it('should not show a count', () => {
      expect(spanWithCount.exists()).toBe(false);
    });
  });

  describe('collapsed', () => {
    describe('with one property in data', () => {
      mountBeforeEach({
        expanded: false,
        propertyData: {foo: 'bar'},
        propertySchema: new JsonSchemaWrapper({}, {}, false),
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe('foo: bar');
      });

      it('should show the correct count', () => {
        expect(spanWithCount.text()).toBe('1 property');
      });
    });

    describe('with multiple properties in data', () => {
      mountBeforeEach({
        expanded: false,
        propertyData: {foo: 'bar', baz: 'qux'},
        propertySchema: new JsonSchemaWrapper({}, {}, false),
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe('foo: bar, baz: qux');
      });

      it('should show the correct count', () => {
        expect(spanWithCount.text()).toBe('2 properties');
      });
    });

    describe('with no properties in data and schema', () => {
      mountBeforeEach({
        expanded: false,
        propertyData: {},
        propertySchema: new JsonSchemaWrapper({}, {}, false),
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe('');
      });

      it('should show 0 properties', () => {
        expect(spanWithCount.text()).toBe('0 properties');
      });
    });

    describe('with more properties in data than in schema', () => {
      mountBeforeEach({
        expanded: false,
        propertyData: {foo: 'bar', baz: 'qux'},
        propertySchema: new JsonSchemaWrapper({properties: {foo: {}}}, {}, false),
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe('foo: bar, baz: qux');
      });

      it('should show the correct count', () => {
        expect(spanWithCount.text()).toBe('2 properties');
      });
    });

    describe('with more properties in schema than in data', () => {
      mountBeforeEach({
        expanded: false,
        propertyData: {foo: 'bar'},
        propertySchema: new JsonSchemaWrapper({properties: {foo: {}, baz: {}}}, {}, false),
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe('foo: bar');
      });

      it('should show the correct count', () => {
        expect(spanWithCount.text()).toBe('2 properties');
      });
    });

    describe('with undefined data', () => {
      mountBeforeEach({
        expanded: false,
        propertyData: undefined,
        propertySchema: new JsonSchemaWrapper({}, {}, false),
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe('');
      });

      it('should show 0 items', () => {
        expect(spanWithCount.text()).toBe('0 properties');
      });
    });
  });
});
