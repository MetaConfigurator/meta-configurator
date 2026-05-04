import {shallowMount} from '@vue/test-utils';
import {describe, expect, it, vi} from 'vitest';
import {ref} from 'vue';
import SchemaObjectAttribute from '../SchemaObjectAttribute.vue';
import {SchemaObjectAttributeData} from '@/schema/graph-representation/schemaGraphTypes';

vi.mock('@/settings/useSettings', () => ({
  useSettings() {
    return ref({
      schemaDiagram: {
        editMode: true,
        showNullableCheckbox: true,
      },
    });
  },
}));

describe('SchemaObjectAttribute', () => {
  function createAttributeData() {
    return new SchemaObjectAttributeData(
      'nickname',
      'string',
      'properties',
      ['properties', 'nickname'],
      false,
      true,
      0,
      {
        type: 'string',
      }
    );
  }

  it('shows the nullable checkbox only for the highlighted attribute when enabled in settings', () => {
    const data = createAttributeData();
    const wrapper = shallowMount(SchemaObjectAttribute, {
      props: {
        data,
        selectedData: data,
        typeChoices: [{label: 'string', schema: {type: 'string'}}],
      },
      global: {
        directives: {
          tooltip: vi.fn(),
        },
      },
    });

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[1]!.attributes('aria-label')).toBe('Nullable property');
  });

  it('emits nullable updates when the nullable checkbox changes', async () => {
    const data = createAttributeData();
    const wrapper = shallowMount(SchemaObjectAttribute, {
      props: {
        data,
        selectedData: data,
        typeChoices: [{label: 'string', schema: {type: 'string'}}],
      },
      global: {
        directives: {
          tooltip: vi.fn(),
        },
      },
    });

    const nullableCheckbox = wrapper.findAll('input[type="checkbox"]')[1]!;
    await nullableCheckbox.setValue(true);

    expect(wrapper.emitted('update_attribute_nullable')).toEqual([[data, true]]);
  });
});
