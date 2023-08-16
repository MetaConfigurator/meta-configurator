import {errorService} from '@/main';
import type {SchemaOption} from '@/model/SchemaOption';
import {JSON_SCHEMA_STORE_CATALOG_URL} from '@/constants';
import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
import {generateSampleData} from '@/components/toolbar/createSampleData';
import {useDataStore} from '@/store/dataStore';

export async function openGenerateSampleFileDialog(): Promise<void> {
  const confirmClear = window.confirm(
    'This will delete all the existing data. Are you sure you want to continue?'
  );

  if (confirmClear) {
    useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
    generateSampleData(useDataStore().schemaData)
      .then(data => (useDataStore().fileData = data))
      .catch((error: Error) =>
        errorService.onError({
          message: 'Error generating sample data',
          details: error.message,
          stack: error.stack,
        })
      );
  }
}
