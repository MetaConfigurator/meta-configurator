import {defineStore} from 'pinia';
import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {TopLevelJsonSchema} from '@/model/TopLevelJsonSchema';

/**
 * Store for the Meta Configurator settings.
 */
export const useSettingsStore = defineStore('settings', () => {
  const settingsData = ref({configLanguage: 'json'});
  const settingsSchemaObject = ref({});
  const settingsSchema: Ref<TopLevelJsonSchema> = computed(
    () => new TopLevelJsonSchema(settingsSchemaObject.value)
  );

  fetch('../settings/settingsSchema.json')
    .then(response => response.json())
    .then(settingsSchema => (settingsSchemaObject.value = settingsSchema));

  return {
    settingsData,
    settingsSchema,
  };
});
