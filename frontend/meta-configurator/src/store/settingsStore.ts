import {defineStore} from 'pinia';
import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {TopLevelJsonSchema} from '@/helpers/schema/TopLevelJsonSchema';

/**
 * Store for the Meta Configurator settings.
 */
export const useSettingsStore = defineStore('settings', () => {
  const settingsData = ref({
    dataFormat: 'json',
    guiEditorOnRightSide: true,
    guiEditor: {
      elementNavigationWithSeparateButton: false,
      maximumDepth: 3,
    },
    debuggingActive: false,
  });
  const settingsSchemaData = ref({});
  const settingsSchema: Ref<TopLevelJsonSchema> = computed(
    () => new TopLevelJsonSchema(settingsSchemaData.value)
  );

  fetch('/src/settings/settingsSchema.json')
    .then(response => response.json())
    .then(settingsSchema => (settingsSchemaData.value = settingsSchema));

  return {
    settingsData,
    settingsSchema,
    settingsSchemaData,
  };
});
