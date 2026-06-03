<!--
  Infer a JSON Schema from one or more data instances selected from the file
  system. Used when the Data Editor is empty (so there is no in-app data to
  infer from). The generated schema is built to satisfy *all* selected
  instances and is applied as the current MetaConfigurator schema.
-->
<script setup lang="ts">
import {ref} from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';

import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {readFileContent} from '@/utility/readFileContent';
import {createLazyMultiFileDialog} from '@/utility/fileDialogUtils';
import {formatRegistry} from '@/dataformats/formatRegistry';
import {inferJsonSchemaFromMultiple} from '@/schema/inferJsonSchema';
import {toastService} from '@/utility/toastService';

const showDialog = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

const fileDialog = createLazyMultiFileDialog('.json,.yaml,.yml');

function openDialog() {
  errorMessage.value = '';
  isLoading.value = false;
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function parseInstanceText(fileName: string, text: string): any {
  const lower = fileName.toLowerCase();
  const yamlConverter = formatRegistry.getFormat('yaml').dataConverter;
  const jsonConverter = formatRegistry.getFormat('json').dataConverter;

  // Only parse strictly as JSON when the file is explicitly .json. For .yaml,
  // .yml or any other/unknown extension we parse as YAML, which is a superset
  // of JSON and therefore also handles JSON content. (This avoids running
  // JSON.parse on YAML, which fails with errors like
  // 'Unexpected identifier "dataFormat"'.)
  if (lower.endsWith('.json')) {
    return jsonConverter.parse(text);
  }
  try {
    return yamlConverter.parse(text);
  } catch (yamlError) {
    return jsonConverter.parse(text);
  }
}

async function parseInstance(file: File): Promise<any> {
  return parseInstanceText(file.name, await readFileContent(file));
}

function selectInstancesAndInfer() {
  fileDialog.openForSelection(async files => {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      const fileList = Array.from(files);
      const instances = await Promise.all(fileList.map(parseInstance));
      const schema = inferJsonSchemaFromMultiple(instances);
      getDataForMode(SessionMode.SchemaEditor).setData(schema);
      toastService.add({
        severity: 'success',
        summary: 'Schema inferred',
        detail: `Generated a JSON Schema satisfying ${instances.length} ${
          instances.length === 1 ? 'instance' : 'instances'
        }.`,
        life: 3000,
      });
      hideDialog();
    } catch (error) {
      errorMessage.value =
        'Could not infer a schema from the selected files. ' +
        'Make sure they are valid JSON or YAML data instances. ' +
        `(${error instanceof Error ? error.message : String(error)})`;
    } finally {
      isLoading.value = false;
    }
  });
}

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Infer Schema from data instances"
    :style="{maxWidth: '90%', minWidth: 'min(32rem, 80vw)', margin: 'auto'}">
    <div class="dialog-content" :style="{cursor: isLoading ? 'wait' : 'default'}">
      <Message severity="info" :closable="false">
        The Data Editor is currently empty. Select one or more data instances (JSON or YAML) from
        your file system, and a JSON Schema will be generated that <strong>satisfies all</strong> of
        them. The more representative instances you provide, the more accurate the inferred schema.
      </Message>

      <div class="actions">
        <Button :disabled="isLoading" :loading="isLoading" @click="selectInstancesAndInfer">
          <FontAwesomeIcon icon="fa-regular fa-folder-open" class="mr-2" />
          Select instance file(s)
        </Button>
      </div>

      <div v-if="isLoading" class="text-sm text-gray-500">Inferring schema, please wait…</div>

      <Message v-if="errorMessage" severity="error" :closable="false">
        {{ errorMessage }}
      </Message>
    </div>
  </Dialog>
</template>

<style scoped>
.dialog-content {
  padding: 0.5rem 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: min(30rem, 80vw);
}

.actions {
  display: flex;
  justify-content: center;
}
</style>
