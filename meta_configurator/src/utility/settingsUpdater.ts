import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import type {SettingsInterfacePanel, SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {panelTypeRegistry} from '@/components/panels/panelTypeRegistry';
import {useDataSource} from '@/data/dataSource';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {detectSchemaFeatures} from '@/schema/detectSchemaFeatures';

export function addDefaultsForMissingFields(userFile: any, defaultsFile: any) {
  for (const key in defaultsFile) {
    if (!(key in userFile)) {
      userFile[key] = defaultsFile[key];

      // element itself was existing, but maybe it has some missing fields
    } else if (typeof defaultsFile[key] === 'object' && !Array.isArray(defaultsFile[key])) {
      addDefaultsForMissingFields(userFile[key], defaultsFile[key]);
    }
  }
}

function overwriteSettingsValues(userFile: any, replaceFile: any) {
  for (const key in replaceFile) {
    if (!(key in userFile)) {
      userFile[key] = replaceFile[key];
    } else if (typeof replaceFile[key] === 'object' && !Array.isArray(replaceFile[key])) {
      overwriteSettingsValues(userFile[key], replaceFile[key]);
    } else {
      // element is in both files and is not an object
      // overwrite the value
      userFile[key] = replaceFile[key];
    }
  }
}

export function fixPanels(userData: SettingsInterfaceRoot, defaultData: SettingsInterfaceRoot) {
  let panelsAreMessedUp = false;

  const userPanels = userData.panels;
  for (const mode of Object.values(SessionMode)) {
    const modePanels: SettingsInterfacePanel[] = userPanels[mode];
    for (const panel of modePanels) {
      if (!panel.panelType || !panelTypeRegistry.getPanelTypeNames().includes(panel.panelType)) {
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
  migrateSettingsVersion(userSettings);
}

export function overwriteSettings(replaceFile: any) {
  // overwrites the settings with the values from the replace file. Keeps all other values
  const userSettings = useDataSource().settingsData.value;
  overwriteSettingsValues(userSettings, replaceFile);
  migrateSettingsVersion(userSettings);
}

function migrateSettingsVersion(userSettings: any) {
  if (userSettings.settingsVersion === '1.0.0') {
    // migrate from 1.0.0 to 1.0.1
    userSettings.settingsVersion = '1.0.1';
    const hiddenPanels = userSettings.panels.hidden;
    if (!hiddenPanels.includes('test')) {
      userSettings.panels.hidden.push('test');
    }
  }
}

export function adaptComplexitySettingsToLoadedSchema(schema: TopLevelSchema) {
  const usedSchemaFeatures = detectSchemaFeatures(schema);
  const metaSchemaSettings = useDataSource().settingsData.value.metaSchema;

  metaSchemaSettings.allowBooleanSchema = usedSchemaFeatures.booleanSchemas;
  metaSchemaSettings.allowMultipleTypes = usedSchemaFeatures.multipleTypes;
}
