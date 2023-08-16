import {errorService} from '@/main';
import type {SchemaOption} from '@/model/SchemaOption';
import {JSON_SCHEMA_STORE_CATALOG_URL} from '@/constants';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {useDataStore} from '@/store/dataStore';
import {newEmptyFile} from '@/components/toolbar/clearFile';

export async function fetchSchemaFromUrl(schemaURL: string, toast?: any): Promise<void> {
  const response = await fetch(schemaURL);
  const schemaContent = await response.json();
  const schemaName = schemaContent.title || 'Unknown Schema';
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  useDataStore().schemaData = schemaContent;
  newEmptyFile('Do you want to also clear the current config file?');

  if (toast) {
    toast.add({
      severity: 'info',
      summary: 'Info',
      detail: `"${schemaName}" fetched successfully!`,
      life: 3000,
    });
  }
}
