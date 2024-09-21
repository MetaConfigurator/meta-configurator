import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {useDataSource} from "@/data/dataSource";
import type {RemovableRef} from "@vueuse/core";


/**
 * Use this hook to access the settings data for reading.
 */
export function useSettings(): RemovableRef<SettingsInterfaceRoot> {
  return useDataSource().settingsData;
}
