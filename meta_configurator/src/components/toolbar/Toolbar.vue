<script setup lang="ts">
import {ref} from 'vue';
import TopToolbar from '@/components/toolbar/TopToolbar.vue';
import {SessionMode} from '@/store/sessionMode';
import {errorService} from '@/main';
import {schemaCollection} from '@/packaged-schemas/schemaCollection';
import {fetchSchemasFromJSONSchemaStore} from '@/components/toolbar/fetchSchemasFromJsonSchemaStore';
import {openUploadSchemaDialog} from '@/components/toolbar/uploadFile';
import InitialSchemaSelectionDialog from '@/components/toolbar/dialogs/InitialSchemaSelectionDialog.vue';
import AboutDialog from '@/components/toolbar/dialogs/AboutDialog.vue';
import DataMappingDialog from '@/components/toolbar/dialogs/data-mapping/DataMappingDialog.vue';
import ImportCsvDialog from '@/components/toolbar/dialogs/csvimport/ImportCsvDialog.vue';
import SaveSnapshotDialog from '@/components/toolbar/dialogs/snapshot/SaveSnapshotDialog.vue';
import CodeGenerationDialog from '@/components/toolbar/dialogs/code-generation/CodeGenerationDialog.vue';
import FetchedSchemasSelectionDialog from '@/components/toolbar/dialogs/FetchedSchemasSelectionDialog.vue';
import UrlInputDialog from '@/components/toolbar/dialogs/UrlInputDialog.vue';
import NewsDialog from '@/components/toolbar/dialogs/NewsDialog.vue';
import {useSettings} from '@/settings/useSettings';
import {hasCurrentNewsChanged, setCurrentNewsHash} from '@/components/toolbar/currentNews';
import DataExportDialog from '@/components/toolbar/dialogs/data-export/DataExportDialog.vue';

const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
}>();

const showAboutDialog = ref(false);
const showNewsDialog = ref(false);

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

function showDataExportDialog(schemaMode: boolean) {
  if (schemaMode) {
    dataExportDialog.value?.activateSchemaMode();
  } else {
    dataExportDialog.value?.activateDataMode();
  }
  dataExportDialog.value?.show();
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
const showSchemaSelectionDialog = () => {
  initialSchemaSelectionDialog.value?.show();
};

const showInitialDialog = () => {
  const settings = useSettings().value;
  if (hasCurrentNewsChanged(settings.latestNewsHash)) {
    showNewsDialog.value = true;
  } else {
    showSchemaSelectionDialog();
  }
};

const csvImportDialog = ref();
const snapshotDialog = ref();
const codeGenerationDialog = ref();
const dataExportDialog = ref();
const fetchedSchemasSelectionDialog = ref();
const urlInputDialog = ref();
const dataMappingDialog = ref();

defineExpose({
  showInitialSchemaDialog: showInitialDialog,
});
</script>

<template>
  <NewsDialog
    :visible="showNewsDialog"
    @update:visible="
      (newValue, dontShowAgain) => {
        showNewsDialog = newValue;

        if (!newValue) {
          showSchemaSelectionDialog();

          if (dontShowAgain) {
            const settings = useSettings().value;
            setCurrentNewsHash(settings);
          }
        }
      }
    " />

  <InitialSchemaSelectionDialog
    ref="initialSchemaSelectionDialog"
    @user_selected_option="option => handleUserSchemaDialogSelection(option)" />

  <ImportCsvDialog ref="csvImportDialog" />

  <SaveSnapshotDialog ref="snapshotDialog" />

  <CodeGenerationDialog ref="codeGenerationDialog" />

  <DataExportDialog ref="dataExportDialog" />

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
    @show-data-export-dialog="schemaMode => showDataExportDialog(schemaMode)"
    @show-schemastore-dialog="() => showSchemaStoreDialog()"
    @show-import-csv-dialog="() => showCsvImportDialog()"
    @show-snapshot-dialog="() => showSnapshotDialog()"
    @show-data-mapping-dialog="() => showDataMappingDialog()"
    @mode-selected="newMode => emit('mode-selected', newMode)" />
</template>

<style scoped></style>
