<script setup lang="ts">
import {ref, watch} from 'vue';
import type {MenuItem} from 'primevue/menuitem';
import Menu from 'primevue/menu';
import Toolbar from 'primevue/toolbar';
import {TopMenuBar} from '@/components/toolbar/TopMenuBar';
import {SessionMode, useSessionStore} from '@/store/sessionStore';
import SchemaEditorView from '@/views/SchemaEditorView.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Listbox from 'primevue/listbox';
import {schemaCollection} from '@/data/SchemaCollection';
import {useToast} from 'primevue/usetoast';
import {JsonSchema} from '@/helpers/schema/JsonSchema';
import {newEmptyFile} from '@/components/toolbar/clearContent';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {errorService} from '@/main';

import InputText from 'primevue/inputtext';

import {storeToRefs} from 'pinia';
import AboutDialog from '@/components/dialogs/AboutDialog.vue';

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
  key: string | undefined;
}>(null);

const showFetchedSchemas = ref(false);
const showAboutDialog = ref(false);
const showUrlInputDialog = ref(false);
const schemaUrl = ref('');

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

const topMenuBar = new TopMenuBar(
  toast,
  handleFromWebClick,
  handleFromOurExampleClick,
  showUrlDialog
);

async function handleFromWebClick(): Promise<void> {
  try {
    await topMenuBar.fetchWebSchemas(); // Wait for the fetch to complete
    showFetchedSchemas.value = true;
    topMenuBar.showDialog.value = true;
  } catch (error) {
    // Handle the error if there's an issue fetching the schema.
    errorService.onError(error);
  }
}
function handleFromOurExampleClick() {
  // Set the fetchedSchemas to your schemaCollection array
  topMenuBar.fetchedSchemas = schemaCollection;
  // Set the flag to true to show the fetched schemas
  showFetchedSchemas.value = true;
  topMenuBar.showDialog.value = true;
}
watch(selectedSchema, async newSelectedSchema => {
  if (!newSelectedSchema) {
    return;
  }
  if (newSelectedSchema.url) {
    try {
      await topMenuBar.selectSchema(newSelectedSchema.url);
      showFetchedSchemas.value = true;
      topMenuBar.showDialog.value = false;
      newEmptyFile('Do you want to clear current config data ?');
    } catch (error) {
      // Handle the error if there's an issue fetching the schema.
      errorService.onError(error);
    }
  } else if (newSelectedSchema.key) {
    try {
      topMenuBar.fetchExampleSchema(newSelectedSchema.key); // Call the fetchExampleSchema method with the schema key
      showFetchedSchemas.value = true;
      topMenuBar.showDialog.value = false;
      newEmptyFile('Do you want to also clear current config data ?');
    } catch (error) {
      // Handle the error if there's an issue fetching the schema.
      errorService.onError(error);
    }
  }
});

function handleAccept() {
  clearEditor();
  // Hide the confirmation dialog
  showConfirmation.value = false;
}
function handleReject() {
  // Hide the confirmation dialog
  showConfirmation.value = false;
}
function showUrlDialog() {
  showUrlInputDialog.value = true;
}

// Method to hide the URL dialog
function hideUrlDialog() {
  showUrlInputDialog.value = false;
}

// Method to fetch schema from URL
async function fetchSchemaFromURL() {
  try {
    await topMenuBar.fetchSchemaFromURL(schemaUrl.value);
    // Do any additional processing if required
    hideUrlDialog();
  } catch (error) {
    // Handle the error if there's an issue fetching the schema.
    errorService.onError(error);
  }
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

function isDisabled(item: MenuItem) {
  if (!item.disabled) {
    return false;
  }
  if (typeof item.disabled === 'boolean') {
    return item.disabled;
  }
  return item.disabled();
}

// apparently, the primevue button cannot reactively update its disabled state
// so this is a workaround to change the disabled state of the button
watch(storeToRefs(useSessionStore()).fileData, () => {
  for (const item of getMenuItems()) {
    if (item.key) {
      if (isDisabled(item)) {
        document.getElementById(item.key)?.setAttribute('disabled', '');
        document.getElementById(item.key)?.classList.add('p-disabled');
      } else {
        document.getElementById(item.key)?.removeAttribute('disabled');
        document.getElementById(item.key)?.classList.remove('p-disabled');
      }
    }
  }
});
</script>

<template>
  <Dialog v-model:visible="topMenuBar.showDialog.value">
    <!-- Dialog content goes here -->
    <h3>Which Schema do you want to open?</h3>
    <div class="card flex justify-content-center">
      <div class="listbox-container" style="width: 300px">
        <Listbox
          listStyle="max-height: 250px"
          v-model="selectedSchema"
          :options="topMenuBar.fetchedSchemas"
          v-show="showFetchedSchemas"
          filter
          optionLabel="label"
          class="overflow-hidden">
        </Listbox>
      </div>
    </div>
  </Dialog>

  <Dialog v-model:visible="showConfirmation">
    <h3>{{ confirmationDialogMessage }}</h3>
    <Button label="Yes" @click="handleAccept" class="dialog-button" />
    <Button label="No" @click="handleReject" class="dialog-button" />
  </Dialog>
  <Dialog v-model:visible="showUrlInputDialog">
    <div class="p-fluid">
      <div class="p-field">
        <label for="urlInput">Enter the URL of the schema:</label>
        <InputText v-model="schemaUrl" id="urlInput" />
      </div>
      <div class="p-dialog-footer">
        <!-- Wrap the buttons in a div and add margin to it -->
        <div class="button-container">
          <Button label="Cancel" @click="hideUrlDialog" class="dialog-button" />
          <Button label="Fetch Schema" @click="fetchSchemaFromURL" class="dialog-button" />
        </div>
      </div>
    </div>
  </Dialog>

  <AboutDialog
    :visible="showAboutDialog"
    @update:visible="newValue => (showAboutDialog = newValue)" />

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
          :id="item.key ?? ''"
          :disabled="isDisabled(item)"
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
      <div class="flex space-x-5 mr-3">
        <div class="flex space-x-2">
          <span class="pi pi-sitemap" style="font-size: 1.7rem" />
          <p class="font-semibold text-lg">ConfigAssistant</p>
        </div>

        <Button
          circular
          text
          class="toolbar-button"
          size="small"
          v-tooltip.bottom="'About'"
          @click="() => (showAboutDialog = true)">
          <FontAwesomeIcon icon="fa-solid fa-circle-info" />
        </Button>

        <!-- link to our github, opens in a new tab -->
        <a
          href="https://github.com/PaulBredl/config-assistant"
          target="_blank"
          rel="noopener noreferrer"
          class="pi pi-github hover:scale-110 text-gray-600"
          style="font-size: 1.7rem" />
      </div>
    </template>
  </Toolbar>
</template>

<style scoped>
.listbox-container {
  width: 100%;
}
.button-container {
  margin-top: 1rem;
}
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
