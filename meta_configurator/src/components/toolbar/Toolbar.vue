<script setup lang="ts">
import {ref, type Ref} from 'vue';
import TopToolbar from '@/components/toolbar/TopToolbar.vue';
import {SessionMode} from '@/store/sessionMode';
import {fetchSchemasFromJSONSchemaStore} from '@/components/toolbar/fetchSchemasFromJsonSchemaStore';
import {openUploadSchemaDialog} from '@/components/toolbar/uploadFile';
import InitialSchemaSelectionDialog from '@/components/toolbar/dialogs/InitialSchemaSelectionDialog.vue';
import AboutDialog from '@/components/toolbar/dialogs/AboutDialog.vue';
import DataMappingDialog from '@/components/toolbar/dialogs/data-mapping/DataMappingDialog.vue';
import DataImportAiDialog from '@/components/toolbar/dialogs/data-import-ai/DataImportAiDialog.vue';
import ImportCsvDialog from '@/components/toolbar/dialogs/csvimport/ImportCsvDialog.vue';
import ImportTurtleDialog from '@/components/toolbar/dialogs/turtle-import/ImportTurtleDialog.vue';
import ImportXmlDialog from '@/components/toolbar/dialogs/xml-import/ImportXmlDialog.vue';
import XmlExportDialog from '@/components/toolbar/dialogs/xml-export/XmlExportDialog.vue';
import SaveSnapshotDialog from '@/components/toolbar/dialogs/snapshot/SaveSnapshotDialog.vue';
import CodeGenerationDialog from '@/components/toolbar/dialogs/code-generation/CodeGenerationDialog.vue';
import FetchedSchemasSelectionDialog from '@/components/toolbar/dialogs/FetchedSchemasSelectionDialog.vue';
import UrlInputDialog from '@/components/toolbar/dialogs/UrlInputDialog.vue';
import NewsDialog from '@/components/toolbar/dialogs/NewsDialog.vue';
import {useSettings} from '@/settings/useSettings';
import {hasCurrentNewsChanged, setCurrentNewsHash} from '@/components/toolbar/currentNews';
import DataExportDialog from '@/components/toolbar/dialogs/data-export/DataExportDialog.vue';
import RefineSchemaDialog from '@/components/toolbar/dialogs/refine-schema/RefineSchemaDialog.vue';
import {useErrorService} from '@/utility/errorServiceInstance';
import type {MenuItemDialogActions} from '@/components/toolbar/menuItems';
import {fetchExternalContent} from '@/utility/fetchExternalContent';
import RmlMappingDialog from '@/components/toolbar/dialogs/rml-mapping/RmlMappingDialog.vue';
import ImportSchemaDialog from '@/components/toolbar/dialogs/schema-conversion/ImportSchemaDialog.vue';
import ExportSchemaDialog from '@/components/toolbar/dialogs/schema-conversion/ExportSchemaDialog.vue';
import InferSchemaDialog from '@/components/toolbar/dialogs/schema-infer/InferSchemaDialog.vue';
import type {SchemaOption} from '@/packaged-schemas/schemaOption';
import {getDataForMode} from '@/data/useDataLink';

defineOptions({name: 'MainToolbar'});

const props = defineProps<{
  currentMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'mode-selected', newMode: SessionMode): void;
}>();

const showAboutDialog = ref(false);
const showNewsDialog = ref(false);

interface ShowableDialogController {
  show: () => void;
}

interface ModeAwareDialogController extends ShowableDialogController {
  activateSchemaMode: () => void;
  activateDataMode: () => void;
}

interface FetchedSchemasDialogController extends ShowableDialogController {
  setSchemas: (schemas: SchemaOption[]) => void;
}

const initialSchemaSelectionDialog = ref<ShowableDialogController | null>(null);
const csvImportDialog = ref<ShowableDialogController | null>(null);
const snapshotDialog = ref<ShowableDialogController | null>(null);
const codeGenerationDialog = ref<ModeAwareDialogController | null>(null);
const dataExportDialog = ref<ModeAwareDialogController | null>(null);
const fetchedSchemasSelectionDialog = ref<FetchedSchemasDialogController | null>(null);
const urlInputDialog = ref<ShowableDialogController | null>(null);
const dataMappingDialog = ref<ShowableDialogController | null>(null);
const dataImportAiDialog = ref<ShowableDialogController | null>(null);
const rmlMappingDialog = ref<ShowableDialogController | null>(null);
const turtleImportDialog = ref<ShowableDialogController | null>(null);
const xmlImportDialog = ref<ShowableDialogController | null>(null);
const xmlExportDialog = ref<ShowableDialogController | null>(null);
const importSchemaDialog = ref<ShowableDialogController | null>(null);
const exportSchemaDialog = ref<ShowableDialogController | null>(null);
const inferSchemaDialog = ref<ShowableDialogController | null>(null);
const refineSchemaDialog = ref<ShowableDialogController | null>(null);

function showDialog(dialog: Ref<ShowableDialogController | null>): void {
  dialog.value?.show();
}

function showModeAwareDialog(
  dialog: Ref<ModeAwareDialogController | null>,
  useSchemaMode: boolean
): void {
  if (useSchemaMode) {
    dialog.value?.activateSchemaMode();
  } else {
    dialog.value?.activateDataMode();
  }
  dialog.value?.show();
}

function handleUserSchemaDialogSelectionDefault(
  selectedSource: 'JsonStore' | 'File' | 'URL'
): void {
  switch (selectedSource) {
    case 'JsonStore':
      showSchemaStoreDialog();
      break;
    case 'File':
      openUploadSchemaDialog();
      break;
    case 'URL':
      showDialog(urlInputDialog);
      break;
  }
}

async function handleUserSchemaDialogSelectionCustom(label: string) {
  const configuredSchemas = useSettings().value.schemaSelectionLists.find(
    list => list.label === label
  )?.schemas;
  if (!configuredSchemas) {
    useErrorService().onError(
      new Error(`Could not find schema selection list with label: ${label}`)
    );
    return;
  }
  // schemas is either an URL to a JSON document that specifies the schemas, or directly an array of schemas
  // if it is an URL, first resolve it and then proceed
  let schemaList: SchemaOption[] = [];
  if (typeof configuredSchemas === 'string') {
    try {
      const fetchedContent = await fetchExternalContent(configuredSchemas);
      schemaList = await fetchedContent.json();
    } catch {
      useErrorService().onError(
        new Error(`Could not fetch schema selection list from URL: ${configuredSchemas}`)
      );
      return;
    }
  } else if (Array.isArray(configuredSchemas)) {
    schemaList = configuredSchemas;
  } else {
    useErrorService().onError(
      new Error(`Invalid schema selection list format for label: ${label}`)
    );
    return;
  }
  fetchedSchemasSelectionDialog.value?.setSchemas(schemaList);
  fetchedSchemasSelectionDialog.value?.show();
}

async function showSchemaStoreDialog(): Promise<void> {
  try {
    fetchedSchemasSelectionDialog.value?.setSchemas(await fetchSchemasFromJSONSchemaStore());
    fetchedSchemasSelectionDialog.value?.show();
  } catch (error) {
    useErrorService().onError(error);
  }
}

const showSchemaSelectionDialog = () => {
  showDialog(initialSchemaSelectionDialog);
};

const showInitialSchemaDialog = () => {
  const settings = useSettings().value;
  if (hasCurrentNewsChanged(settings.latestNewsHash)) {
    showNewsDialog.value = true;
  } else {
    showSchemaSelectionDialog();
  }
};

/** The dialog-opening callbacks the toolbar menus trigger, passed down as one prop. */
const dialogActions: MenuItemDialogActions = {
  showSchemaSelectionDialog,
  showImportCsvDialog: () => showDialog(csvImportDialog),
  showSnapshotDialog: () => showDialog(snapshotDialog),
  showCodeGenerationDialog: useSchemaMode =>
    showModeAwareDialog(codeGenerationDialog, useSchemaMode),
  showDataExportDialog: useSchemaMode => showModeAwareDialog(dataExportDialog, useSchemaMode),
  showDataMappingDialog: () => showDialog(dataMappingDialog),
  showDataImportAiDialog: () => showDialog(dataImportAiDialog),
  showInferSchemaDialog: () => showDialog(inferSchemaDialog),
  showRmlMappingDialog: () => showDialog(rmlMappingDialog),
  showImportTurtleDialog: () => showDialog(turtleImportDialog),
  showImportXmlDialog: () => showDialog(xmlImportDialog),
  showXmlExportDialog: () => showDialog(xmlExportDialog),
  showImportSchemaDialog: () => showDialog(importSchemaDialog),
  showExportSchemaDialog: () => showDialog(exportSchemaDialog),
  showRefineSchemaDialog: () => showDialog(refineSchemaDialog),
};

defineExpose({
  showInitialSchemaDialog,
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
            setCurrentNewsHash(getDataForMode(SessionMode.Settings));
          }
        }
      }
    " />

  <InitialSchemaSelectionDialog
    ref="initialSchemaSelectionDialog"
    @user_selected_default_option="option => handleUserSchemaDialogSelectionDefault(option)"
    @user_selected_custom_option="label => handleUserSchemaDialogSelectionCustom(label)" />

  <ImportCsvDialog ref="csvImportDialog" />

  <ImportTurtleDialog ref="turtleImportDialog" />

  <ImportXmlDialog ref="xmlImportDialog" />

  <XmlExportDialog ref="xmlExportDialog" />

  <SaveSnapshotDialog ref="snapshotDialog" />

  <CodeGenerationDialog ref="codeGenerationDialog" />

  <DataExportDialog ref="dataExportDialog" />

  <FetchedSchemasSelectionDialog ref="fetchedSchemasSelectionDialog" />

  <UrlInputDialog ref="urlInputDialog" />

  <DataMappingDialog ref="dataMappingDialog" />

  <DataImportAiDialog ref="dataImportAiDialog" />

  <RmlMappingDialog ref="rmlMappingDialog" />

  <ImportSchemaDialog ref="importSchemaDialog" />

  <ExportSchemaDialog ref="exportSchemaDialog" />

  <InferSchemaDialog ref="inferSchemaDialog" />
  <RefineSchemaDialog ref="refineSchemaDialog" />

  <AboutDialog
    :visible="showAboutDialog"
    @update:visible="newValue => (showAboutDialog = newValue)" />

  <TopToolbar
    :current-mode="props.currentMode"
    @show-about-dialog="() => (showAboutDialog = true)"
    :dialog-actions="dialogActions"
    @mode-selected="newMode => emit('mode-selected', newMode)" />
</template>
