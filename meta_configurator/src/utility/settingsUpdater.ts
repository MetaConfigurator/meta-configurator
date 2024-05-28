import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';

function addDefaultsForMissingFields(userFile: any, defaultsFile: any) {
  for (const key in defaultsFile) {
    if (!(key in userFile)) {
      userFile[key] = defaultsFile[key];

      // element itself was existing, but maybe it has some missing fields
    } else if (typeof defaultsFile[key] === 'object') {
      addDefaultsForMissingFields(userFile[key], defaultsFile[key]);
    }
  }
}

export function addDefaultsForSettings() {
  const userSettings = getDataForMode(SessionMode.Settings).data.value;
  const defaultSettings = SETTINGS_DATA_DEFAULT;
  addDefaultsForMissingFields(userSettings, defaultSettings);
}
