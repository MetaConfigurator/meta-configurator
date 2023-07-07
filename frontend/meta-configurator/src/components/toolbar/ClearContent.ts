import {useDataStore} from '@/store/dataStore';
export function clearEditor(): void {
  console.log('clearEditor called');
  useDataStore().fileData = {};

  console.log('Cleared fileData:', useDataStore().fileData);
}
