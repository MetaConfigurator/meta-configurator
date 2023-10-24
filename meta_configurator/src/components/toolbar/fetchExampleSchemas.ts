import {schemaCollection} from '@/example-schemas/schemaCollection';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {useDataStore} from '@/store/dataStore';
import {newEmptyFile} from '@/components/toolbar/clearFile';
import {errorService} from '@/main';
import {toastService} from '@/utility/toastService';

/**
 * Loads the example schema with the given key.
 * @param schemaKey The key of the example schema to load
 */
export function loadExampleSchema(schemaKey: string): void {
  try {
    const selectedSchema: any = schemaCollection.find(schema => schema.key === schemaKey);
    useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
    const schemaName = selectedSchema.label || 'Unknown Schema';
    useDataStore().schemaData = selectedSchema?.schema;

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
