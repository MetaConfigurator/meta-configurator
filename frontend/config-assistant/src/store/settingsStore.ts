import {defineStore} from 'pinia';
import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {TopLevelJsonSchema} from '@/helpers/schema/TopLevelJsonSchema';
import {SETTINGS_SCHEMA} from '@/data/SettingsSchema';

/**
 * Store for the Meta Configurator settings.
 */
export const useSettingsStore = defineStore('settings', () => {
  const settingsData = ref({
    dataFormat: 'json',
    guiEditorOnRightSide: true,
    codeEditor: {
      fontSize: 14,
    },
    guiEditor: {
      maximumDepth: 5,
      propertySorting: 'schemaOrder',
    },
    debuggingActive: false,
  });
  const settingsSchemaData = ref(SETTINGS_SCHEMA);
  const settingsSchema: Ref<TopLevelJsonSchema> = computed(
    () => new TopLevelJsonSchema(settingsSchemaData.value)
  );

  return {
    settingsData,
    settingsSchema,
    settingsSchemaData,
  };
});
