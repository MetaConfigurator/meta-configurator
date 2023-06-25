<script setup lang="ts">
import Menubar from 'primevue/menubar';
import {computed, Ref, ref} from 'vue';
import type {MenuItem, MenuItemCommandEvent} from 'primevue/menuitem';
import {TopMenuBar} from '@/components/toolbar/TopMenuBar';
import {generalStore} from '@/store/generalStore';

const generalStoreInstance = generalStore();

const emit = defineEmits<{
  (e: 'page-changed', page: string): void;
  (e: 'toggle-order'): void;
}>();

function getPageName(): string {
  switch (generalStoreInstance.currentPage) {
    case 'file':
      return 'File Editor';
    case 'schema':
      return 'Schema Editor';
    case 'settings':
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
      if (generalStoreInstance.currentPage !== 'file') {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      generalStoreInstance.$patch({
        currentPage: 'file',
      });
    },
  },
  {
    label: 'Schema Editor',
    icon: 'pi pi-fw pi-pencil',
    class: () => {
      if (generalStoreInstance.currentPage !== 'schema') {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      generalStoreInstance.$patch({
        currentPage: 'schema',
      });
    },
  },
  {
    label: 'Settings',
    icon: 'pi pi-fw pi-cog',
    class: () => {
      if (generalStoreInstance.currentPage !== 'settings') {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      generalStoreInstance.$patch({
        currentPage: 'settings',
      });
    },
  },
];

const topMenuBar = new TopMenuBar(handleMenuClick);

const fileEditorMenuItems = topMenuBar.fileEditorMenuItems;
const schemaEditorMenuItems = topMenuBar.schemaEditorMenuItems;
const settingsMenuItems = topMenuBar.settingsMenuItems;

function getMenuItems(pageId: String = generalStoreInstance.currentPage): MenuItem[] {
  switch (pageId) {
    case 'file':
      return fileEditorMenuItems;
    case 'schema':
      return schemaEditorMenuItems;
    case 'settings':
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
