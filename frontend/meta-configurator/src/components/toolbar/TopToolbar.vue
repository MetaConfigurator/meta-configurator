<script setup lang="ts">
import Menubar from 'primevue/menubar';
import {computed, Ref, ref} from 'vue';
import type {MenuItem, MenuItemCommandEvent} from 'primevue/menuitem';
import {TopMenuBar} from '@/components/toolbar/TopMenuBar';
import {SessionMode} from "@/store/sessionStore";
import SchemaEditorView from "@/views/SchemaEditorView.vue";

const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
  (e: 'toggle-order'): void;
}>();

function getPageName(): string {
  switch (props.currentMode) {
    case SessionMode.FileEditor:
      return 'File Editor';
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
const pageSelectionMenuItems: MenuItem[] = [
  {
    label: 'File Editor',
    icon: 'pi pi-fw pi-file',
    class: () => {
      if (props.currentMode !== SessionMode.FileEditor) {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      emit('mode-selected', SessionMode.FileEditor);
    },
  },
  {
    label: 'Schema Editor',
    icon: 'pi pi-fw pi-pencil',
    class: () => {
      if (props.currentMode !== SchemaEditorView) {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      emit('mode-selected', SessionMode.SchemaEditor);
    },
  },
  {
    label: 'Settings',
    icon: 'pi pi-fw pi-cog',
    class: () => {
      if (props.currentMode !== SessionMode.Settings) {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      emit('mode-selected', SessionMode.Settings);
    },
  },
];

const topMenuBar = new TopMenuBar(event => {
  handleMenuClick(event);
});

const fileEditorMenuItems = topMenuBar.fileEditorMenuItems;
const schemaEditorMenuItems = topMenuBar.schemaEditorMenuItems;
const settingsMenuItems = topMenuBar.settingsMenuItems;

function getMenuItems(): MenuItem[] {
  switch (props.currentMode) {
    case SessionMode.FileEditor:
      return fileEditorMenuItems;
    case SessionMode.SchemaEditor:
      return schemaEditorMenuItems;
    case SessionMode.Settings:
      return settingsMenuItems;
    default:
      return [];
  }
}

const mainMenuItem: MenuItem = {
  label: () => getPageName(),
  icon: 'pi pi-fw pi-bars',
  class: 'font-bold text-lg z-10',
  style: 'min-width: 220px',
  items: pageSelectionMenuItems,
};

const topLevelMenuItems: Ref<MenuItem[]> = computed(() => [mainMenuItem, ...getMenuItems()]);

const items = ref(topLevelMenuItems);

function handleMenuClick(e: MenuItemCommandEvent) {
  if (e.item.key === 'toggle-order') {
    emit('toggle-order');
  }
}
</script>

<template>
  <Menubar :model="items">
    <template #end>
      <div class="flex space-x-10 mr-4">
        <div class="flex space-x-2">
          <span class="pi pi-sitemap" style="font-size: 1.7rem" />
          <p class="font-semibold text-lg">MetaConfigurator</p>
        </div>
        <!-- link to our github, opens in a new tab -->
        <a
          href="https://github.com/PaulBredl/meta-configurator"
          target="_blank"
          rel="noopener noreferrer"
          class="pi pi-github hover:scale-110"
          style="font-size: 1.7rem" />
      </div>
    </template>
  </Menubar>
</template>

<style scoped></style>
