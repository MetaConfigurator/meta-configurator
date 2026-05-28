<!-- Dialog to import XML data -->
<script setup lang="ts">
import {reactive, type Ref, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import {
  DEFAULT_XML_IMPORT_OPTIONS,
  requestUploadXmlFileToRef,
  type XmlImportOptions,
  xmlToJsonDataWithOptions,
} from '@/components/toolbar/dialogs/xml-import/importXmlUtils';
import {useCurrentData} from '@/data/useDataLink';
import {toastService} from '@/utility/toastService';
import {useSettings} from '@/settings/useSettings';

const isLoading = ref(false);
const showDialog = ref(false);
const currentUserDataString: Ref<string> = ref('');
const settings = useSettings();
const importOptions = reactive<XmlImportOptions>({...DEFAULT_XML_IMPORT_OPTIONS});

function openDialog() {
  Object.assign(importOptions, {
    ...DEFAULT_XML_IMPORT_OPTIONS,
    attributeNamePrefix:
      settings.value.textEditor.xml.attributeNamePrefix ||
      DEFAULT_XML_IMPORT_OPTIONS.attributeNamePrefix,
  });
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function requestUploadFile() {
  requestUploadXmlFileToRef(currentUserDataString);
}

function importXmlData(xml: string): void {
  isLoading.value = true;
  try {
    useCurrentData().setData(xmlToJsonDataWithOptions(xml, {...importOptions}));
    toastService.add({
      severity: 'info',
      summary: 'Successful',
      detail: 'XML import finished.',
      life: 3000,
    });
  } catch (error) {
    toastService.add({
      severity: 'error',
      summary: 'Error',
      detail: error,
      life: 10000,
    });
  } finally {
    isLoading.value = false;
    hideDialog();
    currentUserDataString.value = '';
  }
}

watch(currentUserDataString, newValue => {
  if (newValue) importXmlData(newValue);
});

defineExpose({show: openDialog, close: hideDialog});
</script>
<template>
  <Dialog v-model:visible="showDialog" header="Import XML">
    <div
      class="flex flex-column gap-3 bigger-dialog-content"
      :style="{cursor: isLoading ? 'wait' : 'default'}">
      <Message severity="warn" :closable="false" icon="pi pi-exclamation-triangle">
        Importing an XML file will overwrite your existing data. <br />
        The schema will remain unchanged.
      </Message>

      <div class="setting-row">
        <label for="xml-import-attribute-prefix">Attribute prefix</label>
        <InputText id="xml-import-attribute-prefix" v-model="importOptions.attributeNamePrefix" />
      </div>

      <div class="setting-row">
        <label for="xml-import-text-node-name">Text node name</label>
        <InputText id="xml-import-text-node-name" v-model="importOptions.textNodeName" />
      </div>

      <div class="setting-row">
        <label for="xml-import-cdata-name">CDATA property name</label>
        <InputText id="xml-import-cdata-name" v-model="importOptions.cdataPropName" />
      </div>

      <div class="setting-row">
        <label for="xml-import-comment-name">Comment property name</label>
        <InputText id="xml-import-comment-name" v-model="importOptions.commentPropName" />
      </div>

      <div class="setting-row">
        <label for="xml-import-trim-values">Trim values</label>
        <ToggleSwitch id="xml-import-trim-values" v-model="importOptions.trimValues" />
      </div>

      <div class="setting-row">
        <label for="xml-import-boolean-attributes">Allow boolean attributes</label>
        <ToggleSwitch
          id="xml-import-boolean-attributes"
          v-model="importOptions.allowBooleanAttributes" />
      </div>

      <div class="setting-row">
        <label for="xml-import-parse-tag-value">Parse tag values</label>
        <ToggleSwitch id="xml-import-parse-tag-value" v-model="importOptions.parseTagValue" />
      </div>

      <div class="setting-row">
        <label for="xml-import-parse-attribute-value">Parse attribute values</label>
        <ToggleSwitch
          id="xml-import-parse-attribute-value"
          v-model="importOptions.parseAttributeValue" />
      </div>

      <div class="setting-row">
        <label for="xml-import-remove-ns-prefix">Remove namespace prefixes</label>
        <ToggleSwitch id="xml-import-remove-ns-prefix" v-model="importOptions.removeNSPrefix" />
      </div>

      <div class="setting-row">
        <label for="xml-import-always-text-node">Always create text nodes</label>
        <ToggleSwitch
          id="xml-import-always-text-node"
          v-model="importOptions.alwaysCreateTextNode" />
      </div>

      <div class="setting-row">
        <label for="xml-import-process-entities">Process entities</label>
        <ToggleSwitch id="xml-import-process-entities" v-model="importOptions.processEntities" />
      </div>

      <div class="flex align-items-center justify-content-center gap-2">
        <Button label="Select File" @click="requestUploadFile" :disabled="isLoading" />
      </div>

      <div v-if="isLoading" class="mt-3 text-sm text-gray-500">Importing, please wait...</div>
    </div>
  </Dialog>
</template>

<style scoped>
.bigger-dialog-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-row label {
  font-weight: 600;
}
</style>
