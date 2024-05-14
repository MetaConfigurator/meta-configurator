import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';

function addDefaultsForMissingFields(userFile: any, defaultsFile: any) {
  for (const key in defaultsFile) {
    if (!(key in userFile)) {
      userFile[key] = defaultsFile[key];
    }
  }
}

export function addDefaultsForSettings() {
  const userSettings = getDataForMode(SessionMode.Settings).data;
  const defaultSettings = SETTINGS_DATA_DEFAULT;
  addDefaultsForMissingFields(userSettings, defaultSettings);
}
