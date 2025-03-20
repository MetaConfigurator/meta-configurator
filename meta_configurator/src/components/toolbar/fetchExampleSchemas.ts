import {openClearDataEditorDialog} from '@/components/toolbar/clearFile';
import {errorService} from '@/main';
import {toastService} from '@/utility/toastService';
import {useDataSource} from '@/data/dataSource';
import {schemaCollection} from '@/packaged-schemas/schemaCollection';

/**
 * Loads the example schema with the given key.
 * @param schemaKey The key of the example schema to load
 */
export function loadExampleSchema(schemaKey: string): void {
  try {
    let selectedSchema: any = schemaCollection.find(schema => schema.key === schemaKey);
    selectedSchema = structuredClone(selectedSchema);
    const schemaName = selectedSchema.label || 'Unknown Schema';
    useDataSource().userSchemaData.value = selectedSchema?.schema;
    useDataSource().newSchemaWasFetched.value = true;

    openClearDataEditorDialog();

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
