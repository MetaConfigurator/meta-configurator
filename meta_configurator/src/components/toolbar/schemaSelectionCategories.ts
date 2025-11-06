import {computed, ref} from 'vue';
import type {SettingsInterfaceSchemaSelectionList} from '@/settings/settingsTypes';
import {useSettings} from '@/settings/useSettings';

const defaultCategories = ref<Array<{name: string; key: 'Custom' | 'JsonStore' | 'File' | 'URL'}>>([
  {name: 'Open Schema File', key: 'File'},
  {name: 'Load Schema from URL', key: 'URL'},
  {name: 'From Json Schema Store', key: 'JsonStore'},
]);

export const SCHEMA_SELECTION_CATEGORIES = computed(() => {
  const additionalSchemaLists: SettingsInterfaceSchemaSelectionList[] =
    useSettings().value.schemaSelectionLists;
  const additionalCategories = additionalSchemaLists.map(list => ({
    name: list.label,
    key: 'Custom',
  })) as Array<{name: string; key: 'Custom'}>;
  return [...defaultCategories.value, ...additionalCategories];
});
