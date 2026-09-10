import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowRef} from 'vue';
import {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import {deleteSchemaElement} from '@/utility/deleteUtils';

vi.mock('@/dataformats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
}));

describe('deleteUtils', () => {
  let schemaData: ManagedData;

  beforeEach(() => {
    schemaData = new ManagedData(
      shallowRef({
        type: 'object',
        required: ['name', 'age'],
        properties: {
          name: {
            type: 'string',
          },
          age: {
            type: 'number',
          },
          nickname: {
            type: 'string',
          },
        },
      }),
      SessionMode.SchemaEditor
    );
  });

  it('deletes a schema property and removes it from the parent required list', () => {
    deleteSchemaElement(schemaData, ['properties', 'name']);

    expect(schemaData.data.value).toEqual({
      type: 'object',
      required: ['age'],
      properties: {
        age: {
          type: 'number',
        },
        nickname: {
          type: 'string',
        },
      },
    });
  });

  it('deletes a non-required schema property without changing the required list', () => {
    deleteSchemaElement(schemaData, ['properties', 'nickname']);

    expect(schemaData.data.value).toEqual({
      type: 'object',
      required: ['name', 'age'],
      properties: {
        name: {
          type: 'string',
        },
        age: {
          type: 'number',
        },
      },
    });
  });
});
