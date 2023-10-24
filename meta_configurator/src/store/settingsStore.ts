import {defineStore} from 'pinia';
import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {TopLevelJsonSchema} from '@/schema/topLevelJsonSchema';
import {SETTINGS_SCHEMA} from '@/example-schemas/settingsSchema';
import {preprocessOneTime} from '@/schema/oneTimeSchemaPreprocessor';

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
      maximumDepth: 10,
      propertySorting: 'schemaOrder',
    },
    debuggingActive: false,
  });
  const settingsSchemaData = ref(preprocessOneTime(SETTINGS_SCHEMA));
  const settingsSchema: Ref<TopLevelJsonSchema> = computed(
    () => new TopLevelJsonSchema(settingsSchemaData.value)
  );

  return {
    settingsData,
    settingsSchema,
    settingsSchemaData,
  };
});
