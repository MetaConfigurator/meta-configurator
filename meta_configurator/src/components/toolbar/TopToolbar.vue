<script setup lang="ts">
import {ref} from 'vue';
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
import Divider from 'primevue/divider';

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
  <div class="toolbar-wrapper">
    <!--  First row -->
    <div class="toolbar-row toolbar-top">
      <!-- LEFT: ModeSelector -->
      <div class="left-section">
        <ModeSelector
          ref="modeSelector"
          :current-mode="props.currentMode"
          @mode-selected="newMode => selectedMode(newMode)"
          data-testid="mode-selector" />

        <Divider layout="vertical" />

        <TopToolbarMenuButtons
          :show-bottom-menu="false"
          :current-mode="props.currentMode"
          @show-codegen-dialog="schemaMode => showCodeGenerationDialog(schemaMode)"
          @show-url-dialog="() => showUrlDialog()"
          @show-example-schemas-dialog="() => showExampleSchemasDialog()"
          @show-import-csv-dialog="() => showCsvImportDialog()"
          @show-schemastore-dialog="() => showSchemaStoreDialog()"
          @show-snapshot-dialog="() => showSnapshotDialog()"
          @show-data-mapping-dialog="() => showDataMappingDialog()" />

        <Divider layout="vertical" />

        <SearchBar />
      </div>

      <!-- CENTER: TopToolbarMenuButtons + SearchBar -->
      <div class="center-section"></div>

      <!-- RIGHT: Logo + title + buttons -->
      <Button
        :class="{
          'toolbar-button': true,
          'highlighted-icon': props.currentMode === SessionMode.Settings,
        }"
        circular
        text
        size="small"
        v-if="!settings.hideSettings"
        v-tooltip.bottom="'Settings'"
        data-testid="mode-settings-button"
        @click="() => selectedMode(SessionMode.Settings)">
        <FontAwesomeIcon icon="fa-solid fa-gear" />
      </Button>

      <Divider layout="vertical" />

      <div class="right-section">
        <div class="flex space-x-2 items-center">
          <span class="pi pi-sitemap" style="font-size: 1.7rem" />
          <p class="font-semibold text-lg" data-testid="toolbar-title">
            {{ settings.toolbarTitle || 'MetaConfigurator' }}
          </p>
        </div>

        <Button
          circular
          text
          class="toolbar-button"
          size="small"
          v-tooltip.bottom="'About'"
          @click="() => showAboutDialog()">
          <FontAwesomeIcon icon="fa-solid fa-circle-info" />
        </Button>

        <a
          href="https://github.com/MetaConfigurator/meta-configurator"
          target="_blank"
          rel="noopener noreferrer"
          class="pi pi-github hover:scale-110 text-gray-600"
          style="font-size: 1.7rem" />
      </div>
    </div>

    <!-- Second row -->
    <div class="toolbar-row toolbar-bottom">
      <!-- LEFT side: menu buttons -->
      <div class="bottom-left">
        <TopToolbarMenuButtons
          :show-bottom-menu="true"
          :current-mode="props.currentMode"
          @show-codegen-dialog="schemaMode => showCodeGenerationDialog(schemaMode)"
          @show-url-dialog="() => showUrlDialog()"
          @show-example-schemas-dialog="() => showExampleSchemasDialog()"
          @show-import-csv-dialog="() => showCsvImportDialog()"
          @show-schemastore-dialog="() => showSchemaStoreDialog()"
          @show-snapshot-dialog="() => showSnapshotDialog()"
          @show-data-mapping-dialog="() => showDataMappingDialog()" />
      </div>

      <!-- RIGHT side: format selector -->
      <div class="format-switch-container" v-if="settings.codeEditor.showFormatSelector">
        <Select
          :options="dataFormatOptions"
          v-model="settings.dataFormat"
          size="small"
          class="custom-select"
          data-testid="format-selector" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Shared styling for both rows */
.toolbar-row {
  display: flex;
  align-items: center;
  padding: 0.3rem 0.75rem;
}

/* Top row should spread items across */
.toolbar-top {
  border-bottom: 1px solid var(--surface-border);
  justify-content: space-between;
}

/* Bottom row: spread left & right */
.toolbar-bottom {
  justify-content: space-between;
  gap: 0.5rem;
}

.highlighted-icon {
  color: var(--p-highlight-color) !important;
}

/* Left section in bottom row */
.bottom-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Sections inside the top row */
.left-section {
  display: flex;
  align-items: center;
}

.center-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1; /* take all available space */
  gap: 0.5rem;
}

.right-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Custom button style */
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
