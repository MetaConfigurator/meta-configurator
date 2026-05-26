import {SessionMode} from '@/store/sessionMode';
import type {SettingsInterfacePanel, SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {panelTypeRegistry} from '@/components/panels/panelTypeRegistry';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {detectSchemaFeatures} from '@/schema/detectSchemaFeatures';
import {SETTINGS_SCHEMA} from '@/settings/settingsSchema';
import type {Path} from '@/utility/path';
import {
  getObjectSchemaAtDataPath,
  getParentObjectSchemaAtDataPath,
} from '@/schema/schemaReadingUtils';
import {ValidationService} from '@/schema/validationService';

function isPlainObject(value: unknown) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function addDefaultsForMissingFields(
  userFile: any,
  defaultsFile: any,
  rootSchema: TopLevelSchema = SETTINGS_SCHEMA,
  userRoot: any = userFile,
  path: Path = [],
  validationService: ValidationService = new ValidationService(rootSchema)
) {
  for (const key in defaultsFile) {
    const fullPath = [...path, key];
    if (!(key in userFile)) {
      const parentSchema = getParentObjectSchemaAtDataPath(
        rootSchema,
        fullPath,
        userRoot,
        validationService
      );
      const propertyName = fullPath[fullPath.length - 1];
      if (
        typeof propertyName !== 'string' ||
        !(parentSchema?.required ?? []).includes(propertyName)
      ) {
        continue;
      }

      if (
        isPlainObject(defaultsFile[key]) &&
        getObjectSchemaAtDataPath(rootSchema, fullPath, userRoot, validationService)
      ) {
        userFile[key] = {};
        addDefaultsForMissingFields(
          userFile[key],
          defaultsFile[key],
          rootSchema,
          userRoot,
          fullPath,
          validationService
        );
      } else {
        userFile[key] = defaultsFile[key];
      }

      // element itself was existing, but maybe it has some missing fields
    } else if (isPlainObject(defaultsFile[key])) {
      addDefaultsForMissingFields(
        userFile[key],
        defaultsFile[key],
        rootSchema,
        userRoot,
        fullPath,
        validationService
      );
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

export function updateSettingsWithDefaults(settings: any, defaultSettings: any): any {
  addDefaultsForMissingFields(settings, defaultSettings, SETTINGS_SCHEMA, settings);
  fixPanels(settings, defaultSettings);
  migrateSettingsVersion(settings);
  return settings;
}

export function overwriteSettings(userSettings: any, replaceFile: any) {
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

  if (userSettings.settingsVersion === '1.0.1') {
    // migrate from 1.0.1 to 1.0.2
    userSettings.settingsVersion = '1.0.2';
    // update backend and frontend hostname to new default values
    userSettings.frontend.hostname = 'https://metaconfigurator.github.io/meta-configurator';
    delete userSettings.backend.port;
    userSettings.backend.hostname = 'https://metaconfigurator.informatik.uni-stuttgart.de';
  }

  if (userSettings.settingsVersion === '1.0.2') {
    // migrate from 1.0.2 to 1.0.3
    userSettings.settingsVersion = '1.0.3';
    // unhide ai prompts panel
    const hiddenPanels: string[] = userSettings.panels.hidden;
    if (hiddenPanels.includes('aiPrompts')) {
      const index = hiddenPanels.indexOf('aiPrompts');
      if (index > -1) {
        hiddenPanels.splice(index, 1);
      }
    }
  }
}

export function adaptComplexitySettingsToLoadedSchema(userSettings: any, schema: TopLevelSchema) {
  const usedSchemaFeatures = detectSchemaFeatures(schema);
  const metaSchemaSettings = userSettings.metaSchema;

  metaSchemaSettings.allowBooleanSchema = usedSchemaFeatures.booleanSchemas;
  metaSchemaSettings.allowMultipleTypes = usedSchemaFeatures.multipleTypes;
}
