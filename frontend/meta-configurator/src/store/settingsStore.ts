import {defineStore} from 'pinia';
import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {TopLevelJsonSchema} from '@/model/TopLevelJsonSchema';

/**
 * Store for the Meta Configurator settings.
 */
export const useSettingsStore = defineStore('settings', () => {
  const settingsData = ref({configLanguage: 'json', debuggingActive: false});
  const settingsSchemaObject = ref({});
  const settingsSchema: Ref<TopLevelJsonSchema> = computed(
    () => new TopLevelJsonSchema(settingsSchemaObject.value)
  );

  fetch('/src/settings/settingsSchema.json')
    .then(response => response.json())
    .then(settingsSchema => (settingsSchemaObject.value = settingsSchema));

  return {
    settingsData,
    settingsSchema,
  };
});
