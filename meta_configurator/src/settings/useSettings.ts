import {useDataSource} from '@/data/dataSource';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';

/**
 * Use this hook to access the settings data for reading.
 */
export function useSettings(): SettingsInterfaceRoot {
  return useDataSource().settingsData.value;
}

export function setSettings(settings: SettingsInterfaceRoot): void {
  useDataSource().settingsData.value = settings;
}
