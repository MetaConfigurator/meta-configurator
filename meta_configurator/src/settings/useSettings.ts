import {useDataSource} from '@/data/dataSource';

/**
 * Use this hook to access the settings data for reading.
 */
export function useSettings() {
  return useDataSource().settingsData.value;
}
