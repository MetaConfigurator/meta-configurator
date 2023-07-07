import {useDataStore} from '@/store/dataStore';

export function clearEditor(): void {
  console.log('clearEditor called');

  // Show confirmation dialog
  const confirmClear = window.confirm('Are you sure you want to clear the editor?');

  if (confirmClear) {
    // User confirmed, clear the editor
    useDataStore().fileData = {};

    console.log('Cleared fileData:', useDataStore().fileData);
  }
}
