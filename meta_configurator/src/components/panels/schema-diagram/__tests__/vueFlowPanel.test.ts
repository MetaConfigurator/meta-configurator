import {describe, expect, it, vi} from 'vitest';
import {shallowRef} from 'vue';
import {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import {deleteSchemaElement} from '@/utility/deleteUtils';
import {confirmationService} from '@/utility/confirmationService';

describe('VueFlowPanel delete behavior', () => {
   it('deletes the field from the schema but keeps instance data when user chooses keep data', () => {
    const schemaData = new ManagedData(
      shallowRef({
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
      }),
      SessionMode.SchemaEditor
    );

    const instanceData: Record<string, any> = {
      name: 'Alice',
    };

    // Delete from schema
    deleteSchemaElement(schemaData, ['properties', 'name']);

    // User chooses "Keep data unchanged"
    const requireSpy = vi.spyOn(confirmationService, 'require');

    requireSpy.mockImplementation(options => {
      options.reject?.();
    });

    confirmationService.require({
      accept: () => {
        delete instanceData.name;
      },
      reject: () => {
        // Keep instance data unchanged
      },
    });

    expect(schemaData.data.value).toEqual({
      type: 'object',
      properties: {},
    });

    expect(instanceData).toEqual({
      name: 'Alice',
    });

    requireSpy.mockRestore();
  });

  it('deletes the field from both schema and instance data when user chooses delete data', () => {
    const schemaData = new ManagedData(
      shallowRef({
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
      }),
      SessionMode.SchemaEditor
    );

    const instanceData: Record<string, any> = {
      name: 'Alice',
      age: 25,
    };

    // Delete from schema
    deleteSchemaElement(schemaData, ['properties', 'name']);

    // User chooses "Delete from data"
    const requireSpy = vi.spyOn(confirmationService, 'require');

    requireSpy.mockImplementation(options => {
      options.accept?.();
    });

    confirmationService.require({
      accept: () => {
        delete instanceData.name;
      },
    });

    expect(schemaData.data.value).toEqual({
      type: 'object',
      properties: {},
    });

    expect(instanceData).toEqual({
      age: 25,
    });

    requireSpy.mockRestore();
  });
});