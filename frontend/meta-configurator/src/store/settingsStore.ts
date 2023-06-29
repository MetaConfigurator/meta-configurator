import {defineStore} from 'pinia';
import {ref} from 'vue';
import {TopLevelJsonSchema} from '@/model/TopLevelJsonSchema';
import {computed} from "vue";

/**
 * Store for the Meta Configurator settings.
 */
export const useSettingsStore = defineStore('settings', () => {
  const settingsData = ref({configLanguage: 'json'});

  const settingsSchema = computed(() => new TopLevelJsonSchema( {} ));


  fetch('../settings/settingsSchema.json')
    .then(response => response.json())
    .then(settingsSchema => (settingsSchema.value = new TopLevelJsonSchema(settingsSchema)));

  return {
    settingsData,
    settingsSchema,
  };
});
