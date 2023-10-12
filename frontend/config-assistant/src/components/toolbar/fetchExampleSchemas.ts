import {schemaCollection} from '@/data/SchemaCollection';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {useDataStore} from '@/store/dataStore';
import {newEmptyFile} from '@/components/toolbar/clearFile';
import {errorService} from '@/main';

export async function fetchExampleSchema(schemaKey: string, toast?: any): Promise<void> {
  try {
    const selectedSchema: any = schemaCollection.find(schema => schema.key === schemaKey);
    useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
    const schemaName = selectedSchema.label || 'Unknown Schema';
    useDataStore().schemaData = selectedSchema?.schema;

    console.log('fetch example schema');
    newEmptyFile('Do you also want to clear the current config file?');

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
