<script setup lang="ts">
import {computed, ref} from 'vue';
import type {MenuItem} from 'primevue/menuitem';
import Menu from 'primevue/menu';
import Button from 'primevue/button';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {modeToMenuTitle, SessionMode} from '@/store/sessionMode';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
}>();

const settings = useSettings();

function getPageName(): string {
  switch (props.currentMode) {
    case SessionMode.DataEditor:
      return 'Data Editor';
    case SessionMode.SchemaEditor:
      return 'Schema Editor';
    case SessionMode.Settings:
      return 'Settings';
    default:
      return 'Unknown';
  }
}

/**
 * Menu items of the page selection menu.
 */
function getPageSelectionMenuItems(settings: SettingsInterfaceRoot): MenuItem[] {
  const dataEditorItem: MenuItem = {
    label: modeToMenuTitle(SessionMode.DataEditor),
    icon: 'fa-regular fa-file',
    style: props.currentMode !== SessionMode.DataEditor ? '' : 'font-weight: bold;',
    command: () => {
      emit('mode-selected', SessionMode.DataEditor);
    },
  };
  const schemaEditorItem: MenuItem = {
    label: modeToMenuTitle(SessionMode.SchemaEditor),
    icon: 'fa-regular fa-file-code',
    style: props.currentMode !== SessionMode.SchemaEditor ? '' : 'font-weight: bold;',
    command: () => {
      emit('mode-selected', SessionMode.SchemaEditor);
    },
  };
  const settingsItem: MenuItem = {
    label: modeToMenuTitle(SessionMode.Settings),
    icon: 'fa-solid fa-cog',
    style: props.currentMode !== SessionMode.Settings ? '' : 'font-weight: bold;',
    command: () => {
      emit('mode-selected', SessionMode.Settings);
    },
  };

  const items = [dataEditorItem];
  if (!settings.hideSchemaEditor) {
    items.push(schemaEditorItem);
  }
  if (!settings.hideSettings) {
    items.push(settingsItem);
  }
  return items;
}

const items = computed(() => getPageSelectionMenuItems(settings.value));
const menu = ref();


const toggle = event => {
  menu.value.toggle(event);
};


</script>

<template>

      <Menu ref="menu" :model="items" :popup="true">
        <template #itemicon="slotProps">
          <div v-if="slotProps.item.icon !== undefined" data-testid="page-selection-menu">
            <FontAwesomeIcon :icon="slotProps.item.icon" style="min-width: 1rem" class="mr-3" />
          </div>
        </template>
      </Menu>

  <Button outlined text class="main-menu-button" @click="toggle">
    <FontAwesomeIcon icon="fa-solid fa-bars" class="mr-3" />
    {{ getPageName() }}
  </Button>

</template>

<style scoped>

.main-menu-button {
  font-weight: bold;
  font-size: large;
  color: var(--p-primary-active-color);
  padding-left: 1rem !important;
  padding-top: 0.3rem !important;
  padding-bottom: 0.3rem !important;
  min-width: 13rem !important;
}
</style>
