import {defineStore} from 'pinia';
import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {TopLevelJsonSchema} from '@/schema/topLevelJsonSchema';
import {SETTINGS_SCHEMA} from '@/example-schemas/settingsSchema';
import {preprocessOneTime} from '@/schema/oneTimeSchemaPreprocessor';
import {useDataSource} from '@/data/dataSource';

/**
 * Store for the Meta Configurator settings.
 */
export const useSettingsStore = defineStore('settings', () => {
  const settingsData = useDataSource().settingsData;
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
