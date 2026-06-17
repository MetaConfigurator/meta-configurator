<script setup lang="ts">
import {ref, watchEffect} from 'vue';
import Button from 'primevue/button';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {useMagicKeys} from '@vueuse/core';
import {focus} from '@/utility/focusUtils';
import {SessionMode} from '@/store/sessionMode';
import {useSettings} from '@/settings/useSettings';
import {DataFormat} from '@/settings/settingsTypes';
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
  (e: 'show-schema-selection-dialog'): void;
  (e: 'show-import-csv-dialog'): void;
  (e: 'show-snapshot-dialog'): void;
  (e: 'show-about-dialog'): void;
  (e: 'show-codegen-dialog', schemaMode: boolean): void;
  (e: 'show-data-export-dialog', schemaMode: boolean): void;
  (e: 'show-data-mapping-dialog'): void;
  (e: 'show-rml-mapping-dialog'): void;
  (e: 'show-import-turtle-dialog'): void;
  (e: 'show-import-xml-dialog'): void;
  (e: 'show-xml-export-dialog'): void;
  (e: 'show-import-schema-dialog'): void;
  (e: 'show-export-schema-dialog'): void;
  (e: 'show-infer-schema-dialog'): void;
}>();

const settings = useSettings();
const dataFormatOptions = formatRegistry.getFormatNames();

watchEffect(() => {
  if (!dataFormatOptions.includes(settings.value.dataFormat)) {
    settings.value.dataFormat = DataFormat.JSON;
  }
});

async function showSchemaSelectionDialog() {
  emit('show-schema-selection-dialog');
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

function showDataExportDialog(schemaMode: boolean) {
  emit('show-data-export-dialog', schemaMode);
}

function showDataMappingDialog() {
  emit('show-data-mapping-dialog');
}

function selectedMode(newMode: SessionMode) {
  emit('mode-selected', newMode);
}

function showRmlMappingDialog() {
  emit('show-rml-mapping-dialog');
}

function showTurtleImportDialog() {
  emit('show-import-turtle-dialog');
}

function showXmlImportDialog() {
  emit('show-import-xml-dialog');
}

function showXmlExportDialog() {
  emit('show-xml-export-dialog');
}

function showImportSchemaDialog() {
  emit('show-import-schema-dialog');
}

function showExportSchemaDialog() {
  emit('show-export-schema-dialog');
}

function showInferSchemaDialog() {
  emit('show-infer-schema-dialog');
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
          @show-data-export-dialog="schemaMode => showDataExportDialog(schemaMode)"
          @show-import-csv-dialog="() => showCsvImportDialog()"
          @show-schema-selection-dialog="() => showSchemaSelectionDialog()"
          @show-snapshot-dialog="() => showSnapshotDialog()"
          @show-data-mapping-dialog="() => showDataMappingDialog()"
          @show-rml-mapping-dialog="() => showRmlMappingDialog()"
          @show-import-turtle-dialog="() => showTurtleImportDialog()"
          @show-import-xml-dialog="() => showXmlImportDialog()"
          @show-xml-export-dialog="() => showXmlExportDialog()"
          @show-import-schema-dialog="() => showImportSchemaDialog()"
          @show-export-schema-dialog="() => showExportSchemaDialog()"
          @show-infer-schema-dialog="() => showInferSchemaDialog()" />

        <Divider layout="vertical" />

        <SearchBar />
      </div>

      <Divider layout="vertical" />

      <div class="right-section">
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

        <div class="flex space-x-2 items-center">
          <img src="/logo.svg" alt="MetaConfigurator logo" style="height: 2.2rem; width: auto" />
          <p
            class="font-semibold text-lg"
            style="font-family: 'Jost', sans-serif"
            data-testid="toolbar-title">
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
          @show-data-export-dialog="schemaMode => showDataExportDialog(schemaMode)"
          @show-import-csv-dialog="() => showCsvImportDialog()"
          @show-schema-selection-dialog="() => showSchemaSelectionDialog()"
          @show-snapshot-dialog="() => showSnapshotDialog()"
          @show-data-mapping-dialog="() => showDataMappingDialog()"
          @show-rml-mapping-dialog="() => showRmlMappingDialog()"
          @show-import-turtle-dialog="() => showTurtleImportDialog()"
          @show-import-xml-dialog="() => showXmlImportDialog()"
          @show-xml-export-dialog="() => showXmlExportDialog()"
          @show-import-schema-dialog="() => showImportSchemaDialog()"
          @show-export-schema-dialog="() => showExportSchemaDialog()"
          @show-infer-schema-dialog="() => showInferSchemaDialog()" />
      </div>

      <!-- RIGHT side: format selector -->
      <div class="format-switch-container" v-if="settings.textEditor.showFormatSelector">
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
  min-width: 0;
}

/* Shared styling for both rows */
.toolbar-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
  padding: 0.3rem 0.75rem;
  gap: 0.5rem;
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
  min-width: 0;
}

/* Sections inside the top row */
.left-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
  flex: 1 1 32rem;
}

.right-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
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

@media (max-width: 960px) {
  .bottom-left {
    flex: 1 1 0;
  }

  .right-section {
    gap: 0.5rem;
  }

  .format-switch-container {
    flex: 0 0 6.25rem;
  }

  .custom-select {
    width: 100%;
  }

  :deep(.p-divider-vertical) {
    display: none;
  }
}

@media (max-width: 860px) {
  .toolbar-row {
    padding: 0.35rem 0.5rem;
  }

  .toolbar-top,
  .toolbar-bottom {
    justify-content: flex-start;
  }

  .left-section,
  .right-section {
    width: 100%;
  }

  .left-section {
    order: 2;
  }

  .right-section {
    order: 1;
    justify-content: flex-start;
  }

  .right-section p {
    font-size: 0.95rem;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .right-section > .flex {
    flex: 1 1 auto;
    min-width: 0;
  }

  .left-section {
    gap: 0.2rem;
  }

  .format-switch-container {
    flex-basis: 5.25rem;
  }
}
</style>
