import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {useDataStore} from '@/store/dataStore';
import {newEmptyFile} from '@/components/toolbar/clearFile';
import {toastService} from '@/utility/toastService';

/**
 * Fetches the schema from the given URL and sets it as the current schema.
 */
export async function fetchSchemaFromUrl(schemaURL: string): Promise<void> {
  const response = await fetch(schemaURL);
  const schemaContent = await response.json();
  const schemaName = schemaContent.title || 'Unknown Schema';
  useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
  useDataStore().schemaData = schemaContent;
  newEmptyFile('Do you also want to clear the current file in the FileEditor?');

  if (toastService) {
    toastService.add({
      severity: 'info',
      summary: 'Info',
      detail: `"${schemaName}" fetched successfully`,
      life: 3000,
    });
  }
}
