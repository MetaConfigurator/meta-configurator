import {useDataStore} from '@/store/dataStore';
export function clearSchemaEditor(): void {
  console.log('clearSchemaEditor called');

  // Show confirmation dialog
  const confirmClear = window.confirm('Are you sure you want to clear the schemaEditor?');

  if (confirmClear) {
    // User confirmed, clear the editor
    useDataStore().schemaData = {};

    console.log('Cleared schema:', useDataStore().schemaData);
  }
}
