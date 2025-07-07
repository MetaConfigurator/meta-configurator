<script setup lang="ts">
import {ref} from 'vue';
import {errorService} from '@/main';
import InitialSchemaSelectionDialog from '@/components/dialogs/InitialSchemaSelectionDialog.vue';

import AboutDialog from '@/components/dialogs/AboutDialog.vue';
import {fetchSchemasFromJSONSchemaStore} from '@/components/toolbar/fetchSchemasFromJsonSchemaStore';

import {openUploadSchemaDialog} from '@/components/toolbar/uploadFile';
import {SessionMode} from '@/store/sessionMode';
import {schemaCollection} from '@/packaged-schemas/schemaCollection';
import ImportCsvDialog from '@/components/dialogs/csvimport/ImportCsvDialog.vue';
import SaveSnapshotDialog from '@/components/dialogs/snapshot/SaveSnapshotDialog.vue';
import CodeGenerationDialog from '@/components/dialogs/code-generation/CodeGenerationDialog.vue';
import FetchedSchemasSelectionDialog from '@/components/dialogs/FetchedSchemasSelectionDialog.vue';
import UrlInputDialog from '@/components/dialogs/UrlInputDialog.vue';
import TopToolbar from '@/components/toolbar/TopToolbar.vue';
import DataMappingDialog from '@/components/dialogs/data-mapping/DataMappingDialog.vue';

const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
}>();

const showAboutDialog = ref(false);

function handleUserSchemaDialogSelection(option: 'Example' | 'JsonStore' | 'File' | 'URL') {
  switch (option) {
    case 'Example':
      showExampleSchemasDialog();
      break;
    case 'JsonStore':
      showSchemaStoreDialog();
      break;
    case 'File':
      openUploadSchemaDialog();
      break;
    case 'URL':
      showUrlDialog();
      break;
  }
}

function showCodeGenerationDialog(schemaMode: boolean) {
  if (schemaMode) {
    codeGenerationDialog.value?.activateSchemaMode();
  } else {
    codeGenerationDialog.value?.activateDataMode();
  }
  codeGenerationDialog.value?.show();
}

function showCsvImportDialog() {
  csvImportDialog.value?.show();
}

function showSnapshotDialog() {
  snapshotDialog.value?.show();
}

function showDataMappingDialog() {
  dataMappingDialog.value?.show();
}

async function showSchemaStoreDialog(): Promise<void> {
  try {
    // Wait for the fetch to complete
    fetchedSchemasSelectionDialog.value.setSchemas(await fetchSchemasFromJSONSchemaStore());
    fetchedSchemasSelectionDialog.value.show();
  } catch (error) {
    errorService.onError(error);
  }
}
function showExampleSchemasDialog() {
  fetchedSchemasSelectionDialog.value.setSchemas(schemaCollection);
  fetchedSchemasSelectionDialog.value.show();
}

function showUrlDialog() {
  urlInputDialog.value?.show();
}

const initialSchemaSelectionDialog = ref();

// Function to show the category selection dialog
const showInitialSchemaDialog = () => {
  initialSchemaSelectionDialog.value?.show();
};

const csvImportDialog = ref();
const snapshotDialog = ref();
const codeGenerationDialog = ref();
const fetchedSchemasSelectionDialog = ref();
const urlInputDialog = ref();
const dataMappingDialog = ref();

defineExpose({
  showInitialSchemaDialog,
});
</script>

<template>
  <InitialSchemaSelectionDialog
    ref="initialSchemaSelectionDialog"
    @user_selected_option="option => handleUserSchemaDialogSelection(option)" />

  <ImportCsvDialog ref="csvImportDialog" />

  <SaveSnapshotDialog ref="snapshotDialog" />

  <CodeGenerationDialog ref="codeGenerationDialog" />

  <FetchedSchemasSelectionDialog ref="fetchedSchemasSelectionDialog" />

  <UrlInputDialog ref="urlInputDialog" />

  <DataMappingDialog ref="dataMappingDialog" />

  <AboutDialog
    :visible="showAboutDialog"
    @update:visible="newValue => (showAboutDialog = newValue)" />

  <TopToolbar
    :current-mode="props.currentMode"
    @show-url-dialog="() => showUrlDialog()"
    @show-about-dialog="() => (showAboutDialog = true)"
    @show-example-schemas-dialog="() => showExampleSchemasDialog()"
    @show-codegen-dialog="schemaMode => showCodeGenerationDialog(schemaMode)"
    @show-schemastore-dialog="() => showSchemaStoreDialog()"
    @show-import-csv-dialog="() => showCsvImportDialog()"
    @show-snapshot-dialog="() => showSnapshotDialog()"
    @show-data-mapping-dialog="() => showDataMappingDialog()"
    @mode-selected="newMode => emit('mode-selected', newMode)" />
</template>

<style scoped></style>
