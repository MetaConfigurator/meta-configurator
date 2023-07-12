import {useDataStore} from '@/store/dataStore';

export function clearEditor(): void {
  // Show confirmation dialog
  const confirmClear = window.confirm('Are you sure you want to clear the editor?');

  if (confirmClear) {
    // User confirmed, clear the editor
    useDataStore().fileData = {};
  }
}
