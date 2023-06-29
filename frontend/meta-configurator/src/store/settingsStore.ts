import {defineStore} from 'pinia';
import {ref} from 'vue';
import {TopLevelJsonSchema} from '@/model/TopLevelJsonSchema';

/**
 * Store for the Meta Configurator settings.
 */
export const useSettingsStore = defineStore('settings', () => {
  const settingsData = ref({});
  const settingsSchema = ref(new TopLevelJsonSchema({}));
  const configLanguage = ref('');

  fetch('../settings/settingsSchema.json')
    .then(response => response.json())
    .then(settingsSchema => (settingsSchema.value = new TopLevelJsonSchema(settingsSchema)));
  function setConfigLanguage(language: string) {
    configLanguage.value = language;
  }
  return {
    settingsData,
    settingsSchema,
    configLanguage,
    setConfigLanguage,
  };
});
