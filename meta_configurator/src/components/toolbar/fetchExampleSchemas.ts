import {schemaCollection} from '@/example-schemas/schemaCollection';
import {newEmptyFile} from '@/components/toolbar/clearFile';
import {errorService} from '@/main';
import {toastService} from '@/utility/toastService';
import {useDataSource} from '@/data/dataSource';

/**
 * Loads the example schema with the given key.
 * @param schemaKey The key of the example schema to load
 */
export function loadExampleSchema(schemaKey: string): void {
  try {
    const selectedSchema: any = schemaCollection.find(schema => schema.key === schemaKey);
    const schemaName = selectedSchema.label || 'Unknown Schema';
    useDataSource().userSchemaData.value = selectedSchema?.schema;

    newEmptyFile('Do you also want to clear the current config file?');

    const toast = toastService;
    if (toast) {
      toast.add({
        severity: 'info',
        summary: 'Info',
        detail: `"${schemaName}" fetched successfully!`,
        life: 3000,
      });
    }
  } catch (error) {
    errorService.onError(error);
  }
}
