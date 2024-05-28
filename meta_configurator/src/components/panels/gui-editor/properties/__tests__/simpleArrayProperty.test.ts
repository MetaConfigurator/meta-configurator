import {mount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import SimpleArrayProperty from '../SimpleArrayProperty.vue';

// avoid constructing the session store through imports, it is not required for this component
vi.mock('@/store/sessionStore', () => ({
  useSessionStore: vi.fn(),
}));

describe('SimpleArrayProperty', () => {
  let wrapper: any;
  let spanWithDescription: any;
  let spanWithCount: any;
  function mountBeforeEach(props: any) {
    beforeEach(() => {
      // @ts-ignore
      wrapper = mount(SimpleArrayProperty, {
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
      propertyData: [1, 2, 3],
    });

    it('should not show a description', () => {
      expect(spanWithDescription.exists()).toBe(false);
    });

    it('should not show a count', () => {
      expect(spanWithCount.exists()).toBe(false);
    });
  });

  describe('collapsed', () => {
    describe.each([
      ['undefined', undefined, ''],
      ['null', null, 'null'],
      ['boolean', true, 'true'],
      ['number', 1, '1'],
      ['string', 'foo', 'foo'],
      ['object', {foo: 'bar'}, 'foo: bar'],
      ['array', ['foo'], 'foo'],
    ])('with one element of type %s', (type, data, description) => {
      mountBeforeEach({
        expanded: false,
        propertyData: [data],
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe(description);
      });

      it('should show the correct count', () => {
        expect(spanWithCount.text()).toBe('1 item');
      });
    });

    describe('with multiple elements', () => {
      mountBeforeEach({
        expanded: false,
        propertyData: [1, 2, 3],
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe('1, 2, 3');
      });

      it('should show the correct count', () => {
        expect(spanWithCount.text()).toBe('3 items');
      });
    });

    describe('with an empty array', () => {
      mountBeforeEach({
        expanded: false,
        propertyData: [],
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe('');
      });

      it('should show the correct count', () => {
        expect(spanWithCount.text()).toBe('0 items');
      });
    });

    describe('with non array data', () => {
      mountBeforeEach({
        expanded: false,
        propertyData: 'foo',
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe('foo');
      });

      it('should not show a count', () => {
        expect(spanWithCount.exists()).toBe(false);
      });
    });

    describe('with undefined data', () => {
      mountBeforeEach({
        expanded: false,
        propertyData: undefined,
      });

      it('should show the correct description', () => {
        expect(spanWithDescription.text()).toBe('');
      });

      it('should show 0 items', () => {
        expect(spanWithCount.text()).toBe('0 items');
      });
    });
  });
});
