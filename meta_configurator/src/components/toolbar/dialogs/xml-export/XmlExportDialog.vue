<!-- Dialog to configure and export data as XML -->
<script setup lang="ts">
import {reactive, ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import ToggleSwitch from 'primevue/toggleswitch';
import {
  DEFAULT_XML_EXPORT_OPTIONS,
  exportXmlData,
  type XmlExportOptions,
} from '@/components/toolbar/dialogs/xml-export/exportXmlData';
import {useSettings} from '@/settings/useSettings';
import {toastService} from '@/utility/toastService';

const showDialog = ref(false);
const settings = useSettings();
const exportOptions = reactive<XmlExportOptions>({...DEFAULT_XML_EXPORT_OPTIONS});

function openDialog() {
  Object.assign(exportOptions, {
    ...DEFAULT_XML_EXPORT_OPTIONS,
    attributeNamePrefix:
      settings.value.textEditor.xml.attributeNamePrefix ||
      DEFAULT_XML_EXPORT_OPTIONS.attributeNamePrefix,
  });
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function performExport() {
  try {
    exportXmlData({...exportOptions});
    hideDialog();
  } catch (error) {
    toastService.add({
      severity: 'error',
      summary: 'Error',
      detail: error,
      life: 10000,
    });
  }
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Export XML"
    :style="{maxWidth: '90%', minWidth: '40%', margin: 'auto'}">
    <div class="bigger-dialog-content">
      <div class="setting-row">
        <label for="xml-attribute-prefix">Attribute prefix</label>
        <InputText id="xml-attribute-prefix" v-model="exportOptions.attributeNamePrefix" />
      </div>

      <div class="setting-row">
        <label for="xml-text-node-name">Text node name</label>
        <InputText id="xml-text-node-name" v-model="exportOptions.textNodeName" />
      </div>

      <div class="setting-row">
        <label for="xml-cdata-name">CDATA property name</label>
        <InputText id="xml-cdata-name" v-model="exportOptions.cdataPropName" />
      </div>

      <div class="setting-row">
        <label for="xml-comment-name">Comment property name</label>
        <InputText id="xml-comment-name" v-model="exportOptions.commentPropName" />
      </div>

      <div class="setting-row">
        <label for="xml-format-output">Pretty print</label>
        <ToggleSwitch id="xml-format-output" v-model="exportOptions.format" />
      </div>

      <div class="setting-row">
        <label for="xml-indentation-spaces">Indentation spaces</label>
        <InputNumber
          id="xml-indentation-spaces"
          v-model="exportOptions.indentationSpaces"
          :min="0"
          :max="8"
          showButtons
          :disabled="!exportOptions.format" />
      </div>

      <div class="setting-row">
        <label for="xml-suppress-empty-node">Use self-closing empty nodes</label>
        <ToggleSwitch id="xml-suppress-empty-node" v-model="exportOptions.suppressEmptyNode" />
      </div>

      <div class="setting-row">
        <label for="xml-suppress-boolean-attributes">Suppress boolean attribute values</label>
        <ToggleSwitch
          id="xml-suppress-boolean-attributes"
          v-model="exportOptions.suppressBooleanAttributes" />
      </div>

      <div class="setting-row">
        <label for="xml-one-list-group">Group repeated array items</label>
        <ToggleSwitch id="xml-one-list-group" v-model="exportOptions.oneListGroup" />
      </div>

      <Button label="Export" icon="pi pi-download" @click="performExport" />
    </div>
  </Dialog>
</template>

<style scoped>
.bigger-dialog-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
