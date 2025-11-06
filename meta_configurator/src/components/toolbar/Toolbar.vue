<script setup lang="ts">
import {ref} from 'vue';
import TopToolbar from '@/components/toolbar/TopToolbar.vue';
import {SessionMode} from '@/store/sessionMode';
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
import {useErrorService} from '@/utility/errorServiceInstance';
import {fetchExternalContent} from '@/utility/fetchExternalContent';

const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
}>();

const showAboutDialog = ref(false);
const showNewsDialog = ref(false);

function handleUserSchemaDialogSelectionDefault(option: 'JsonStore' | 'File' | 'URL') {
  switch (option) {
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

async function handleUserSchemaDialogSelectionCustom(label: string) {
  const schemas = useSettings().value.schemaSelectionLists.find(
    list => list.label === label
  )?.schemas;
  if (!schemas) {
    useErrorService().onError(
      new Error(`Could not find schema selection list with label: ${label}`)
    );
    return;
  }
  // schemas is either an URL to a JSON document that specifies the schemas, or directly an array of schemas
  // if it is an URL, first resolve it and then proceed
  let schemaList: {label: string; url: string}[] = [];
  if (typeof schemas === 'string') {
    try {
      const fetchedContent = await fetchExternalContent(schemas);
      schemaList = await fetchedContent.json();
    } catch (error) {
      useErrorService().onError(
        new Error(`Could not fetch schema selection list from URL: ${schemas}`)
      );
      return;
    }
  } else if (Array.isArray(schemas)) {
    schemaList = schemas;
  } else {
    useErrorService().onError(
      new Error(`Invalid schema selection list format for label: ${label}`)
    );
    return;
  }
  fetchedSchemasSelectionDialog.value.setSchemas(schemaList);
  fetchedSchemasSelectionDialog.value.show();
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
    useErrorService().onError(error);
  }
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
    @user_selected_default_option="option => handleUserSchemaDialogSelectionDefault(option)"
    @user_selected_custom_option="label => handleUserSchemaDialogSelectionCustom(label)" />

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
    @show-about-dialog="() => (showAboutDialog = true)"
    @show-codegen-dialog="schemaMode => showCodeGenerationDialog(schemaMode)"
    @show-data-export-dialog="schemaMode => showDataExportDialog(schemaMode)"
    @show-schema-selection-dialog="() => showSchemaSelectionDialog()"
    @show-import-csv-dialog="() => showCsvImportDialog()"
    @show-snapshot-dialog="() => showSnapshotDialog()"
    @show-data-mapping-dialog="() => showDataMappingDialog()"
    @mode-selected="newMode => emit('mode-selected', newMode)" />
</template>

<style scoped></style>
