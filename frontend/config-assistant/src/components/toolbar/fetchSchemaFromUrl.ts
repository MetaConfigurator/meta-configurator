import {errorService} from '@/main';
import type {SchemaOption} from '@/model/SchemaOption';
import {JSON_SCHEMA_STORE_CATALOG} from '@/constants';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {useDataStore} from '@/store/dataStore';
import {newEmptyFile} from '@/components/toolbar/clearFile';

export async function fetchSchemaFromUrl(schemaURL: string, toast?: any): Promise<void> {
  try {
    // Fetch the schema content from the selected schemaURL.
    const response = await fetch(schemaURL);
    const schemaContent = await response.json();
    const schemaName = schemaContent.title || 'Unknown Schema';
    useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
    // Update the schemaData in the dataStore with the fetched schema content.
    useDataStore().schemaData = schemaContent;
    // Always clear the data without prompting the user.
    newEmptyFile('Do you want to also clear the current config file?');

    if (toast) {
      toast.add({
        severity: 'info',
        summary: 'Info',
        detail: `"${schemaName}" fetched successfully!`,
        life: 3000,
      });
    }
  } catch (error) {
    // Handle the error if there's an issue fetching the schema.
    errorService.onError(error);
  }
}
