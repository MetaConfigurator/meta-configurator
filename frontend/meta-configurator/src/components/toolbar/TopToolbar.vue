<script setup lang="ts">
import Menubar from 'primevue/menubar';
import {computed, Ref, ref} from 'vue';
import type {MenuItem, MenuItemCommandEvent} from 'primevue/menuitem';
import {TopMenuBar} from '@/components/toolbar/TopMenuBar';
import type {PageName} from '@/router/pageName';
import {useSettingsStore} from '@/store/settingsStore';

const props = defineProps<{
  selectedPage: PageName;
}>();

const emit = defineEmits<{
  // TODO: solve page-change with routing
  (e: 'page-changed', page: PageName): void;
  (e: 'toggle-order'): void;
}>();

function getPageName(): string {
  switch (props.selectedPage) {
    case 'File':
      return 'File Editor';
    case 'Schema':
      return 'Schema Editor';
    case 'Settings':
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
      if (props.selectedPage !== 'File') {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      emit('page-changed', 'File');
    },
  },
  {
    label: 'Schema Editor',
    icon: 'pi pi-fw pi-pencil',
    class: () => {
      if (props.selectedPage !== 'Schema') {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      emit('page-changed', 'Schema');
    },
  },
  {
    label: 'Settings',
    icon: 'pi pi-fw pi-cog',
    class: () => {
      if (props.selectedPage !== 'Settings') {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      emit('page-changed', 'Settings');
    },
  },
];

const topMenuBar = new TopMenuBar(event => {
  handleMenuClick(event);
});

const fileEditorMenuItems = topMenuBar.fileEditorMenuItems;
const schemaEditorMenuItems = topMenuBar.schemaEditorMenuItems;
const settingsMenuItems = topMenuBar.settingsMenuItems;

function getMenuItems(pageId: PageName = props.selectedPage): MenuItem[] {
  switch (pageId) {
    case 'File':
      return fileEditorMenuItems;
    case 'Schema':
      return schemaEditorMenuItems;
    case 'Settings':
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
