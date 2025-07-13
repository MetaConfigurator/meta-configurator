<script setup lang="ts">
import {ref} from 'vue';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {useMagicKeys} from '@vueuse/core';
import {focus} from '@/utility/focusUtils';
import {SessionMode} from '@/store/sessionMode';
import {useSettings} from '@/settings/useSettings';
import Select from 'primevue/select';
import {formatRegistry} from '@/dataformats/formatRegistry';
import ModeSelector from '@/components/toolbar/ModeSelector.vue';
import TopToolbarMenuButtons from '@/components/toolbar/TopToolbarMenuButtons.vue';
import SearchBar from '@/components/toolbar/SearchBar.vue';

const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
  (e: 'show-url-dialog'): void;
  (e: 'show-example-schemas-dialog'): void;
  (e: 'show-schemastore-dialog'): void;
  (e: 'show-import-csv-dialog'): void;
  (e: 'show-snapshot-dialog'): void;
  (e: 'show-about-dialog'): void;
  (e: 'show-codegen-dialog', schemaMode: boolean): void;
  (e: 'show-data-mapping-dialog'): void;
}>();

const settings = useSettings();
const dataFormatOptions = formatRegistry.getFormatNames();

async function showSchemaStoreDialog() {
  emit('show-schemastore-dialog');
}

function showExampleSchemasDialog() {
  emit('show-example-schemas-dialog');
}

function showUrlDialog() {
  emit('show-url-dialog');
}

function showCsvImportDialog() {
  emit('show-import-csv-dialog');
}

function showSnapshotDialog() {
  emit('show-snapshot-dialog');
}

function showAboutDialog() {
  emit('show-about-dialog');
}

function showCodeGenerationDialog(schemaMode: boolean) {
  emit('show-codegen-dialog', schemaMode);
}

function showDataMappingDialog() {
  emit('show-data-mapping-dialog');
}

function selectedMode(newMode: SessionMode) {
  emit('mode-selected', newMode);
}

const modeSelector = ref();

useMagicKeys({
  passive: false,
  onEventFired(event) {
    if (event.key === 'f' && event.ctrlKey) {
      event.preventDefault();
      focus('searchBar');
    }
  },
});
</script>

<template>
  <Toolbar class="h-10 no-padding">
    <template #start>
      <ModeSelector
        ref="modeSelector"
        :current-mode="props.currentMode"
        @mode-selected="newMode => selectedMode(newMode)" />

      <TopToolbarMenuButtons
        :current-mode="props.currentMode"
        @show-codegen-dialog="schemaMode => showCodeGenerationDialog(schemaMode)"
        @show-url-dialog="() => showUrlDialog()"
        @show-example-schemas-dialog="() => showExampleSchemasDialog()"
        @show-import-csv-dialog="() => showCsvImportDialog()"
        @show-schemastore-dialog="() => showSchemaStoreDialog()"
        @show-snapshot-dialog="() => showSnapshotDialog()"
        @show-data-mapping-dialog="() => showDataMappingDialog()" />

      <div class="format-switch-container" v-if="settings.codeEditor.showFormatSelector">
        <Select
          :options="dataFormatOptions"
          v-model="settings.dataFormat"
          size="small"
          class="custom-select"
          data-testid="format-selector" />
      </div>

      <SearchBar />
    </template>

    <template #end>
      <div class="flex space-x-5 mr-3">
        <div class="flex space-x-2">
          <span class="pi pi-sitemap" style="font-size: 1.7rem" />
          <p class="font-semibold text-lg" data-testid="toolbar-title">
            {{ settings.toolbarTitle || 'MetaConfigurator' }}
          </p>
        </div>

        <!-- button to open the about dialog -->
        <Button
          circular
          text
          class="toolbar-button"
          size="small"
          v-tooltip.bottom="'About'"
          @click="() => showAboutDialog()">
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
.no-padding {
  padding: 0 !important;
}
.toolbar-button {
  font-weight: bold;
  font-size: large;
  color: var(--p-primary-active-color);
  padding: 0.35rem !important;
}

.custom-select {
  height: 1.75rem;
  line-height: 0.7rem;
  padding: 0;
}
</style>
