import {describe, expect, it, vi} from 'vitest';
import {shallowRef} from 'vue';
import {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
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

    const instanceData = {
      name: 'Alice',
    };

    expect(schemaData.data.value).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
    });

    expect(instanceData).toEqual({
      name: 'Alice',
    });
  });

  it('deletes the field from instance data when user chooses delete data', () => {
    const instanceData: Record<string, any> = {
      name: 'Alice',
      age: 25,
    };

    const requireSpy = vi.spyOn(confirmationService, 'require');

    requireSpy.mockImplementation(options => {
      options.accept?.();
    });

    const options = {
      accept: () => {
        delete instanceData.name;
      },
    };

    confirmationService.require(options);

    expect(instanceData).toEqual({
      age: 25,
    });

    requireSpy.mockRestore();
  });
});
