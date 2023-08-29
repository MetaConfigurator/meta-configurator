<script setup lang="ts">
import {Ref, ref, watch} from 'vue';
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
import {useToast} from 'primevue/usetoast';
import {JsonSchema} from '@/helpers/schema/JsonSchema';
import {newEmptyFile} from '@/components/toolbar/clearFile';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {errorService} from '@/main';

import InputText from 'primevue/inputtext';

import {storeToRefs} from 'pinia';
import AboutDialog from '@/components/dialogs/AboutDialog.vue';
import {fetchWebSchemas} from '@/components/toolbar/fetchWebSchemas';
import {fetchSchemaFromUrl} from '@/components/toolbar/fetchSchemaFromUrl';
import {fetchExampleSchema} from '@/components/toolbar/fetchExampleSchemas';
import {useMagicKeys, watchDebounced} from '@vueuse/core';
import {searchInDataAndSchema} from '@/helpers/search';
import {focus} from '@/helpers/focusUtils';
import RadioButton from 'primevue/radiobutton';
import {openUploadFileDialog} from '@/components/toolbar/uploadFile';

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
const menu = ref();
const toast = useToast();

const topMenuBar = new TopMenuBar(
  toast,
  handleFromWebClick,
  handleFromOurExampleClick,
  showUrlDialog,
  toggleSearchBar
);

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

const items = ref(pageSelectionMenuItems);

async function handleFromWebClick(): Promise<void> {
  try {
    // Wait for the fetch to complete
    topMenuBar.fetchedSchemas = await fetchWebSchemas();
    showFetchedSchemas.value = true;
    topMenuBar.showDialog.value = true;
  } catch (error) {
    errorService.onError(error);
  }
}
function handleFromOurExampleClick() {
  topMenuBar.fetchedSchemas = schemaCollection;
  showFetchedSchemas.value = true;
  topMenuBar.showDialog.value = true;
}
watch(selectedSchema, async newSelectedSchema => {
  if (!newSelectedSchema) {
    return;
  }
  if (newSelectedSchema.url) {
    try {
      await fetchSchemaFromUrl(newSelectedSchema.url);
      showFetchedSchemas.value = true;
      topMenuBar.showDialog.value = false;
      newEmptyFile('Do you want to clear current config data ?');
    } catch (error) {
      errorService.onError(error);
    }
  } else if (newSelectedSchema.key) {
    try {
      await fetchExampleSchema(newSelectedSchema.key); // Call the fetchExampleSchema method with the schema key
      showFetchedSchemas.value = true;
      topMenuBar.showDialog.value = false;
      newEmptyFile('Do you want to also clear current config data ?');
    } catch (error) {
      errorService.onError(error);
    }
  }
});
// Function to handle click on category radio button
async function handleCategoryClick(categoryKey) {
  if (categoryKey === 'E') {
    try {
      handleFromOurExampleClick();
      showDialog.value = false;
    } catch (error) {
      errorService.onError(error);
    }
  } else if (categoryKey === 'J') {
    try {
      await handleFromWebClick();
      showDialog.value = false;
    } catch (error) {
      errorService.onError(error);
    }
  } else if (categoryKey === 'F') {
    try {
      openUploadFileDialog();
      showDialog.value = false;
    } catch (error) {
      errorService.onError(error);
    }
  } else if (categoryKey === 'U') {
    try {
      await fetchSchemaFromUrl(schemaUrl.value);
      showDialog.value = false;
    } catch (error) {
      errorService.onError(error);
    }
  }
}

function showUrlDialog() {
  showUrlInputDialog.value = true;
}
function hideUrlDialog() {
  showUrlInputDialog.value = false;
}
async function fetchSchemaFromSelectedUrl() {
  await fetchSchemaFromUrl(schemaUrl.value!, toast);
  hideUrlDialog();
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

const searchTerm: Ref<string> = ref('');
const searchBarVisible = ref(false);

useMagicKeys({
  passive: false,
  onEventFired(event) {
    if (event.key === 'f' && event.ctrlKey) {
      event.preventDefault();
      showSearchBar();
    }
  },
});

function showSearchBar() {
  searchBarVisible.value = true;
  focus('searchBar');
}

function toggleSearchBar() {
  searchBarVisible.value = !searchBarVisible.value;
  if (!searchBarVisible.value) {
    searchTerm.value = '';
  } else {
    focus('searchBar');
  }
}
const showDialog = ref(true);
const selectedCategory = ref();
const categories = ref([
  {name: 'From Example', key: 'E'},
  {name: 'From Json Schema Store', key: 'J'},
  {name: 'From File', key: 'F'},
  {name: 'From URL', key: 'U'},
]);
watchDebounced(
  [searchTerm],
  () => {
    if (!searchTerm.value) {
      useSessionStore().currentHighlightedElements = [];
      return;
    }
    const searchResults = searchInDataAndSchema(searchTerm.value);
    if (searchResults.length > 0) {
      useSessionStore().lastChangeResponsible = ChangeResponsible.Menubar;
      useSessionStore().currentSelectedElement = searchResults[0].path;
    }
    useSessionStore().currentHighlightedElements = searchResults.map(result => result.path);
  },
  {debounce: 500}
);
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Select a Schema">
    <div class="flex flex-column gap-3 bigger-dialog-content">
      <div v-for="category in categories" :key="category.key" class="flex align-items-center">
        <RadioButton
          v-model="selectedCategory"
          :inputId="category.key"
          name="category"
          :value="category.name"
          @click="handleCategoryClick(category.key)" />
        <label :for="category.key" class="ml-2">{{ category.name }}</label>
      </div>
    </div>
  </Dialog>
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
          <Button label="Fetch Schema" @click="fetchSchemaFromSelectedUrl" class="dialog-button" />
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

      <!-- search bar -->
      <span class="p-input-icon-left ml-5" style="width: 20rem" v-if="searchBarVisible">
        <i class="pi pi-search" style="font-size: 0.9rem" />
        <InputText
          show-clear
          class="h-7 w-full"
          placeholder="Search for data or properties..."
          v-model="searchTerm"
          id="searchBar" />
      </span>
      <Button
        v-if="searchBarVisible"
        class="toolbar-button"
        text
        :disabled="!searchTerm"
        @click="() => (searchTerm = '')">
        <i class="pi pi-times" />
      </Button>
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
.bigger-dialog-content {
  padding: 20px;
}
</style>
