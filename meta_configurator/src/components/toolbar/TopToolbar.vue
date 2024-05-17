<script setup lang="ts">
import {computed, type Ref, ref, watch} from 'vue';
import type {MenuItem} from 'primevue/menuitem';
import Menu from 'primevue/menu';
import Toolbar from 'primevue/toolbar';
import {MenuItems} from '@/components/toolbar/menuItems';
import {useSessionStore} from '@/store/sessionStore';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Listbox from 'primevue/listbox';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {errorService} from '@/main';
import InitialSchemaSelectionDialog from '@/components/dialogs/InitialSchemaSelectionDialog.vue';

import InputText from 'primevue/inputtext';
import AboutDialog from '@/components/dialogs/AboutDialog.vue';
import {fetchSchemasFromJSONSchemaStore} from '@/components/toolbar/fetchSchemasFromJsonSchemaStore';
import {fetchSchemaFromUrl} from '@/components/toolbar/fetchSchemaFromUrl';
import {loadExampleSchema} from '@/components/toolbar/fetchExampleSchemas';
import {useMagicKeys, watchDebounced} from '@vueuse/core';
import {searchInDataAndSchema, searchResultToMenuItem} from '@/utility/search';
import {focus} from '@/utility/focusUtils';

import {GuiConstants} from '@/constants';
import type {SchemaOption} from '@/packaged-schemas/schemaOption';

import {openUploadSchemaDialog} from '@/components/toolbar/uploadFile';
import {openClearDataEditorDialog} from '@/components/toolbar/clearFile';
import {SessionMode} from '@/store/sessionMode';
import {schemaCollection} from '@/packaged-schemas/schemaCollection';
import {getSessionForMode} from '@/data/useDataLink';
import type {SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {useSettings} from '@/settings/useSettings';

const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
}>();

const selectedSchema = ref<SchemaOption | null>(null);

const showFetchedSchemas = ref(false);
const showAboutDialog = ref(false);
const showUrlInputDialog = ref(false);
const schemaUrl = ref('');
const menu = ref();

const topMenuBar = new MenuItems(handleFromWebClick, handleFromOurExampleClick, showUrlDialog);

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
    label: 'Data Editor',
    icon: 'fa-regular fa-file',
    class: () => {
      if (props.currentMode !== SessionMode.DataEditor) {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      emit('mode-selected', SessionMode.DataEditor);
    },
  };
  const schemaEditorItem: MenuItem = {
    label: 'Schema Editor',
    icon: 'fa-regular fa-file-code',
    class: () => {
      if (props.currentMode !== SessionMode.SchemaEditor) {
        return 'font-normal text-lg';
      }
      return 'font-bold text-lg';
    },
    command: () => {
      emit('mode-selected', SessionMode.SchemaEditor);
    },
  };
  const settingsItem: MenuItem = {
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
  };

  if (settings.hideSchemaEditor) {
    return [dataEditorItem, settingsItem];
  } else {
    return [dataEditorItem, schemaEditorItem, settingsItem];
  }
}

const items = computed(() => getPageSelectionMenuItems(useSettings()));

function handleUserSelection(option: 'Example' | 'JsonStore' | 'File' | 'URL') {
  switch (option) {
    case 'Example':
      handleFromOurExampleClick();
      break;
    case 'JsonStore':
      handleFromWebClick();
      break;
    case 'File':
      openUploadSchemaDialog();
      break;
    case 'URL':
      showUrlDialog();
      break;
  }
}

async function handleFromWebClick(): Promise<void> {
  try {
    // Wait for the fetch to complete
    topMenuBar.fetchedSchemas = await fetchSchemasFromJSONSchemaStore();
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
      openClearDataEditorDialog();
    } catch (error) {
      errorService.onError(error);
    }
  } else if (newSelectedSchema.key) {
    try {
      loadExampleSchema(newSelectedSchema.key);
      showFetchedSchemas.value = true;
      topMenuBar.showDialog.value = false;
      openClearDataEditorDialog();
    } catch (error) {
      errorService.onError(error);
    }
  }
});

function showUrlDialog() {
  showUrlInputDialog.value = true;
}
function hideUrlDialog() {
  showUrlInputDialog.value = false;
}
async function fetchSchemaFromSelectedUrl() {
  await fetchSchemaFromUrl(schemaUrl.value!);
  hideUrlDialog();
}

function getMenuItems(settings: SettingsInterfaceRoot): MenuItem[] {
  switch (props.currentMode) {
    case SessionMode.DataEditor:
      return topMenuBar.getDataEditorMenuItems(settings);
    case SessionMode.SchemaEditor:
      return topMenuBar.getSchemaEditorMenuItems(settings);
    case SessionMode.Settings:
      return topMenuBar.getSettingsMenuItems(settings);
    default:
      return [];
  }
}

// computed property function to get menu items to allow for updating of the menu items
const menuItems = computed(() => getMenuItems(useSettings()));

const toggle = event => {
  menu.value.toggle(event);
};

const itemMenuRefs = ref(new Map<string, Menu>());

function setItemMenuRef(item: MenuItem, menu: Menu) {
  itemMenuRefs.value.set(getLabelOfItem(item), menu);
}
function handleItemButtonClick(item: MenuItem, event: Event) {
  if (item.items) {
    const label = getLabelOfItem(item);
    if (label !== undefined) {
      const menu = itemMenuRefs.value.get(label);
      menu.toggle(event);
    }
  } else if (item.command) {
    item.command({item, originalEvent: event});
  }
}
function getLabelOfItem(item: MenuItem): string | undefined {
  if (!item.label) {
    return undefined;
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
function isHighlighted(item: MenuItem) {
  if (!item.highlighted) {
    return false;
  }
  if (typeof item.highlighted === 'boolean') {
    return item.highlighted;
  }
  return item.highlighted();
}

const searchTerm: Ref<string> = ref('');

const initialSchemaSelectionDialog = ref();
// Function to show the category selection dialog
const showInitialSchemaDialog = () => {
  initialSchemaSelectionDialog.value?.show();
};

defineExpose({
  showInitialSchemaDialog,
});

useMagicKeys({
  passive: false,
  onEventFired(event) {
    if (event.key === 'f' && event.ctrlKey) {
      event.preventDefault();
      focus('searchBar');
    }
  },
});
const searchResultMenu = ref();
const searchResultItems = ref<MenuItem[]>([]);

watchDebounced(
  [searchTerm],
  () => {
    let mode = useSessionStore().currentMode;
    let session = getSessionForMode(mode);

    if (!searchTerm.value) {
      session.currentSearchResults.value = [];
      searchResultItems.value = [];
      return;
    }
    searchInDataAndSchema(searchTerm.value)
      .then(searchResults => {
        if (searchResults.length > 0) {
          session.currentSelectedElement.value = searchResults[0].path;
        }
        session.currentSearchResults.value = searchResults;
        searchResultItems.value = searchResults
          .map(res => searchResultToMenuItem(res))
          .slice(0, GuiConstants.MAX_SEARCH_RESULTS);
      })
      .catch(error => {
        errorService.onError(error);
      });
  },
  {debounce: 500}
);

const showSearchResultsMenu = event => {
  searchResultMenu.value?.show(event, event.target);
  focus('searchBar');
};
</script>

<template>
  <InitialSchemaSelectionDialog
    ref="initialSchemaSelectionDialog"
    @user_selected_option="option => handleUserSelection(option)" />

  <!-- Dialog to select a schema from JSON Schema Store, TODO: move to separate component -->
  <Dialog v-model:visible="topMenuBar.showDialog.value" header="Select a Schema">
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

  <!-- Toolbar -->
  <Toolbar class="h-10 no-padding">
    <!-- Page switch menu  -->
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

      <!-- menu items -->
      <div v-for="item in menuItems" :key="item.label">
        <span v-if="item.separator" class="text-lg p-2 text-gray-300">|</span>
        <Button
          v-else
          circular
          text
          :class="{'toolbar-button': true, 'highlighted-icon': isHighlighted(item)}"
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
      <span class="p-input-icon-left ml-5" style="width: 20rem">
        <i class="pi pi-search" style="font-size: 0.9rem" />
        <InputText
          show-clear
          class="h-7 w-full"
          placeholder="Search for data or properties..."
          v-model="searchTerm"
          @focus="showSearchResultsMenu"
          @blur="() => searchResultMenu.value?.hide()"
          id="searchBar" />
      </span>
      <!-- search results menu -->
      <Menu :popup="true" ref="searchResultMenu" :model="searchResultItems">
        <template #item="slotProps">
          <div class="px-3 py-2">
            <div class="font-bold">{{ slotProps.item.label }}</div>
            <div class="text-xs">{{ slotProps.item.data }}</div>
          </div>
        </template>
      </Menu>
      <Button class="toolbar-button" text :disabled="!searchTerm" @click="() => (searchTerm = '')">
        <i class="pi pi-times" />
      </Button>
    </template>

    <template #end>
      <div class="flex space-x-5 mr-3">
        <div class="flex space-x-2">
          <span class="pi pi-sitemap" style="font-size: 1.7rem" />
          <p class="font-semibold text-lg">{{ useSettings().toolbarTitle }}</p>
        </div>

        <!-- button to open the about dialog -->
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

.highlighted-icon {
  color: var(--primary-color);
}
</style>
