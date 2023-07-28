<script setup lang="ts">
import {ref, watch} from 'vue';
import type {MenuItem} from 'primevue/menuitem';
import Menu from 'primevue/menu';
import Toolbar from 'primevue/toolbar';
import {TopMenuBar} from '@/components/toolbar/TopMenuBar';
import {ChangeResponsible, SessionMode, useSessionStore} from '@/store/sessionStore';
import SchemaEditorView from '@/views/SchemaEditorView.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Listbox from 'primevue/listbox';
import {schemaCollection} from '@/data/SchemaCollection';
import {useDataStore} from '@/store/dataStore';
import {useToast} from 'primevue/usetoast';
import {JsonSchema} from '@/helpers/schema/JsonSchema';
import {
  clearEditor,
  showConfirmation,
  confirmationDialogMessage,
  newEmptyFile,
} from '@/components/toolbar/clearContent';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';

const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
}>();
const selectedSchema = ref<{
  label: string;
  icon: string;
  command: () => void;
  schema: JsonSchema;
  url: string | undefined;
}>(null);

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
    icon: 'fa-regular fa-file',
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
    icon: 'fa-regular fa-file-code',
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
    icon: 'fa-solid fa-cog',
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
const toast = useToast();
const topMenuBar = new TopMenuBar(event => {
  handleMenuClick(event);
}, toast);
async function handleFromWebClick(): Promise<void> {
  console.log('Before fetching schemas:', topMenuBar.fetchedSchemas);
  try {
    await topMenuBar.fetchWebSchemas(); // Wait for the fetch to complete
    console.log('After fetching schemas:', topMenuBar.fetchedSchemas);
    showFetchedSchemas.value = true;
  } catch (error) {
    console.error('Error fetching schemas:', error);
    // Handle errors if needed
  }
}
function handleFromOurExampleClick() {
  // Set the fetchedSchemas to your schemaCollection array
  topMenuBar.fetchedSchemas = schemaCollection;

  // Set the flag to true to show the fetched schemas
  showFetchedSchemas.value = true;
}

watch(selectedSchema, async newSelectedSchema => {
  console.log('newSelectedSchema', newSelectedSchema);
  if (newSelectedSchema) {
    // If a schema is selected, call the selectSchema function with the schema's URL
    try {
      await topMenuBar.selectSchema(newSelectedSchema.url);
      showFetchedSchemas.value = true;
      topMenuBar.showDialog.value = false;

      newEmptyFile('Are you sure?');
    } catch (error) {
      console.error('Error fetching schema:', error);
      // Handle errors if needed
    }
  }
});

function handleAccept() {
  clearEditor();
  // Hide the confirmation dialog
  showConfirmation.value = false;
}

function handleReject() {
  // User accepted the confirmation, handle keeping the existing data

  console.log('selected schema', selectedSchema.value);
  // Hide the confirmation dialog
  showConfirmation.value = false;
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

const items = ref(pageSelectionMenuItems);
const menu = ref();
const toggle = event => {
  menu.value.toggle(event);
};

const itemMenuRefs = ref(new Map<string, Menu>());

function setItemMenuRef(item: MenuItem, menu: Menu) {
  itemMenuRefs.value.set(getLabelOfItem(item), menu);
}

function handleItemButtonClick(item: MenuItem, event: Event) {
  if (item.items) {
    const menu = itemMenuRefs.value.get(getLabelOfItem(item));
    menu.toggle(event);
  } else if (item.command) {
    item.command({item, originalEvent: event});
  }
}

function getLabelOfItem(item: MenuItem): string {
  if (!item.label) {
    return;
  }
  if (typeof item.label === 'string') {
    return item.label;
  }
  return item.label();
}
</script>

<template>
  <Dialog v-model:visible="topMenuBar.showDialog.value">
    <!-- Dialog content goes here -->
    <h3>{{ topMenuBar.dialogMessage.value }}</h3>

    <Button
      label="Frow JSON-schema-store"
      @click="handleFromWebClick"
      class="mr-4 mt-4 button-small"
      v-if="!showFetchedSchemas" />
    <Button
      label="From our example schema"
      @click="handleFromOurExampleClick"
      class="mr-4 mt-4 button-small"
      v-if="!showFetchedSchemas" />
    <div class="card flex justify-content-center">
      <!-- Listbox to display fetched schemas -->
      <Listbox
        listStyle="max-height:250px"
        v-model="selectedSchema"
        :options="topMenuBar.fetchedSchemas"
        v-show="showFetchedSchemas"
        filter
        optionLabel="label"
        class="w-50 md:w-14rem overflow-hidden">
        <!-- Add a slot for the search input -->
      </Listbox>
    </div>
  </Dialog>
  <Dialog v-model:visible="showConfirmation">
    <h3>{{ confirmationDialogMessage }}</h3>
    <Button label="Yes" @click="handleAccept" class="mr-4 mt-4 button-small" />
    <Button label="No" @click="handleReject" class="mr-4 mt-4 button-small" />
  </Dialog>

  <Toolbar class="h-10 no-padding">
    <template #start>
      <Menu ref="menu" :model="items" :popup="true">
        <template #itemicon="slotProps">
          <div v-if="slotProps.item.icon !== undefined">
            <FontAwesomeIcon :icon="slotProps.item.icon" style="min-width: 1rem" class="mr-3" />
          </div>
        </template>
      </Menu>

      <Button outlined text class="main-menu-button" @click="toggle">
        <FontAwesomeIcon icon="fa-solid fa-bars" class="mr-3" />
        {{ getPageName() }}
      </Button>

      <div v-for="item in getMenuItems()" :key="item.label">
        <span v-if="item.separator" class="text-lg p-2 text-gray-300">|</span>
        <Button
          v-else
          circular
          text
          class="toolbar-button"
          size="small"
          v-tooltip.bottom="item.label"
          @click="event => handleItemButtonClick(item, event)">
          <FontAwesomeIcon :icon="item.icon!!" />
        </Button>

        <Menu
          v-if="item.items"
          :model="item.items"
          :popup="true"
          :ref="itemMenu => setItemMenuRef(item, itemMenu)">
          <template #itemicon="slotProps">
            <div v-if="slotProps.item.icon !== undefined">
              <FontAwesomeIcon
                :icon="slotProps.item.icon ?? []"
                style="min-width: 1.5rem"
                class="mr-3" />
            </div>
          </template>
        </Menu>
      </div>
    </template>
    <template #end>
      <div class="flex space-x-10 mr-4">
        <div class="flex space-x-2">
          <span class="pi pi-sitemap" style="font-size: 1.7rem" />
          <p class="font-semibold text-lg">ConfigAssistant</p>
        </div>

        <!-- link to our github, opens in a new tab -->
        <a
          href="https://github.com/PaulBredl/config-assistant"
          target="_blank"
          rel="noopener noreferrer"
          class="pi pi-github hover:scale-110"
          style="font-size: 1.7rem" />
      </div>
    </template>
  </Toolbar>
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
<style scoped>
.no-padding {
  padding: 0 !important;
}

.main-menu-button {
  font-weight: bold;
  font-size: large;
  color: #495057;
  padding-left: 1rem !important;
  padding-top: 0.3rem !important;
  padding-bottom: 0.3rem !important;
  min-width: 13rem !important;
}

.toolbar-button {
  font-weight: bold;
  font-size: large;
  color: #495057;
  padding: 0.35rem !important;
}
</style>
