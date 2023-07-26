<script setup lang="ts">
import Menubar from 'primevue/menubar';
import {computed, Ref, ref} from 'vue';
import type {MenuItem, MenuItemCommandEvent} from 'primevue/menuitem';
import {TopMenuBar} from '@/components/toolbar/TopMenuBar';
import {SessionMode} from '@/store/sessionStore';
import SchemaEditorView from '@/views/SchemaEditorView.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Listbox from 'primevue/listbox';
import {schemaCollection} from '@/data/SchemaCollection';
const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
}>();
const selectedSchema = ref();
const showFetchedSchemas = ref(false);
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

/*function handleFromWebClick(): void {
  topMenuBar.fetchWebSchemas();
  showFetchedSchemas.value = true; // Set the flag to true after fetching schemas
}*/
function handleFromWebClick(): void {
  // Log topMenuBar.fetchedSchemas before fetching schemas
  console.log('Before fetching schemas:', topMenuBar.fetchedSchemas);

  // Assuming topMenuBar.fetchWebSchemas() fetches the schemas and updates topMenuBar.fetchedSchemas
  topMenuBar.fetchWebSchemas();

  // Log topMenuBar.fetchedSchemas after fetching schemas
  console.log('After fetching schemas:', topMenuBar.fetchedSchemas);

  // Set the flag to true after fetching schemas
  showFetchedSchemas.value = true;
}
function handleFromOurExampleClick() {
  // Set the fetchedSchemas to your schemaCollection array
  topMenuBar.fetchedSchemas = schemaCollection;

  // Set the flag to true to show the fetched schemas
  showFetchedSchemas.value = true;
}

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

function handleMenuClick(e: MenuItemCommandEvent) {}
</script>

<template>
  <Dialog v-model:visible="topMenuBar.showDialog.value" @hide="topMenuBar.showDialog.value = false">
    <!-- Dialog content goes here -->
    <h3>{{ topMenuBar.dialogMessage.value }}</h3>

    <Button
      label="FROM WEB"
      @click="handleFromWebClick"
      class="mr-4 mt-4 button-small"
      v-if="!showFetchedSchemas" />
    <Button
      label="FROM OUR EXAMPLE"
      @click="handleFromOurExampleClick"
      class="mr-4 mt-4 button-small"
      v-if="!showFetchedSchemas" />
    <div class="card flex justify-content-center">
      <!-- Listbox to display fetched schemas -->
      <Listbox
        v-model="selectedSchema"
        :options="topMenuBar.fetchedSchemas"
        v-show="showFetchedSchemas"
        filter
        optionLabel="label"
        class="w-50 md:w-14rem">
        <!-- Add a slot for the search input -->
      </Listbox>
    </div>
  </Dialog>

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

<style scoped>
.mr-4 {
  margin-right: 1rem; /* You can adjust the value (1rem = 16px) to your desired margin size */
}
.mt-4 {
  margin-top: 1rem; /* You can adjust the value (1rem = 16px) to your desired margin size */
}
.button-small {
  font-size: 15px; /* Adjust the font size to change the button size */
  padding: 0.5rem 1rem; /* Adjust the padding to change the button size */
  /* You can add other styles like height and width to control the button size further */
}
</style>
