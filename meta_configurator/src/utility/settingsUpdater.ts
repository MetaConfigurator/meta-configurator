import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import type {SettingsInterfacePanel, SettingsInterfaceRoot} from "@/settings/settingsTypes";
import {PanelType} from "@/components/panelType";



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

function fixPanels(userData: SettingsInterfaceRoot, defaultData: SettingsInterfaceRoot) {
  let panelsAreMessedUp = false;

  const userPanels = userData.panels;
  for (const mode of Object.values(SessionMode)) {
    const modePanels: SettingsInterfacePanel[] = userPanels[mode];
    for (const panel of modePanels) {
      if (!panel.panelType || !Object.values(PanelType).includes(panel.panelType)) {
        panelsAreMessedUp = true;
      }
      if (!panel.mode || !Object.values(SessionMode).includes(panel.mode)) {
        panelsAreMessedUp = true;
      }
    }
  }
  if (panelsAreMessedUp) {
    userData.panels = defaultData.panels;
  }
}

export function addDefaultsForSettings() {
  const userSettings = getDataForMode(SessionMode.Settings).data.value;
  const defaultSettings: any = structuredClone(SETTINGS_DATA_DEFAULT);
  addDefaultsForMissingFields(userSettings, defaultSettings);

  fixPanels(userSettings, defaultSettings);
}
