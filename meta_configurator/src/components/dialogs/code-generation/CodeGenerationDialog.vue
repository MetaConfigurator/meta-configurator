<!-- Dialog to import CSV data -->
<script setup lang="ts">
import {ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import {
  generateValidationCode,
  quicktypeJSONSchema,
  SUPPORTED_LANGUAGES,
} from '@/utility/codeGenerationUtils';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import Select from 'primevue/select';
import Button from 'primevue/button';
import {useDataSource} from '@/data/dataSource';
import {generateFileName} from '@/components/toolbar/downloadFile';

const showDialog = ref(false);

const programmingLanguageChoices = ref(SUPPORTED_LANGUAGES);

const selectedProgrammingLanguage = ref('');

const generatedCodeDataStructure = ref('');
const generatedCodeValidation = ref('');

// true: schema mode, false: data mode
const schemaMode = ref(true);

// watch the selected programming language and generate code accordingly
watch(selectedProgrammingLanguage, newLanguage => {
  if (SUPPORTED_LANGUAGES.indexOf(newLanguage) === -1) {
    generatedCodeDataStructure.value = '';
    generatedCodeValidation.value = '';
    return;
  }

  let document: any;
  let documentTitle: string;
  if (schemaMode.value) {
    document = getDataForMode(SessionMode.SchemaEditor).data.value;
    documentTitle = document.title || 'Schema';
  } else {
    document = getDataForMode(SessionMode.DataEditor).data.value;
    documentTitle = 'Data';
  }
  quicktypeJSONSchema(newLanguage, documentTitle, JSON.stringify(document)).then(code => {
    generatedCodeDataStructure.value = code.lines.join('\n');
  });

  const fileNamePrefix = useDataSource().userSchemaData.value.title ?? 'untitled';
  const schemaFileName = generateFileName(fileNamePrefix, true);
  const dataFileName = generateFileName(fileNamePrefix, false);
  generateValidationCode(newLanguage, schemaFileName, dataFileName).then(code => {
    if (!code) {
      generatedCodeValidation.value = '';
      return;
    }
    generatedCodeValidation.value = code;
  });
});

function openDialog() {
  generatedCodeDataStructure.value = '';
  selectedProgrammingLanguage.value = '';
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function activateSchemaMode() {
  schemaMode.value = true;
}

function activateDataMode() {
  schemaMode.value = false;
}

function copyToClipboardDataStructure() {
  navigator.clipboard.writeText(generatedCodeDataStructure.value).then(() => {
    alert('Code copied to clipboard');
  });
}
function copyToClipboardValidation() {
  navigator.clipboard.writeText(generatedCodeValidation.value).then(() => {
    alert('Code copied to clipboard');
  });
}

defineExpose({show: openDialog, close: hideDialog, activateSchemaMode, activateDataMode});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Generate Source Code"
    :style="{maxWidth: '90%', minWidth: '60%', margin: 'auto'}">
    <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
      <Select
        v-model="selectedProgrammingLanguage"
        :options="programmingLanguageChoices"
        placeholder="Select a programming language"
        class="w-1/2" />

      <div class="code-container" v-if="generatedCodeValidation.length > 0">
        <pre><code>{{ generatedCodeValidation }}</code></pre>
      </div>

      <Button @click="copyToClipboardValidation()" v-if="generatedCodeValidation.length > 0"
        >Copy validation code to clipboard</Button
      >

      <div class="code-container" v-if="generatedCodeDataStructure.length > 0">
        <pre><code>{{ generatedCodeDataStructure }}</code></pre>
      </div>

      <Button @click="copyToClipboardDataStructure()" v-if="generatedCodeDataStructure.length > 0"
        >Copy data structure code to clipboard</Button
      >
    </div>
  </Dialog>
</template>
<style scoped>
.bigger-dialog-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.code-container {
  max-height: 200px;
  max-width: 90%;
  overflow: auto;
  background: var(--p-primary-background); /* Dark background */
  color: var(--p-primary-color);
  padding: 10px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
}
</style>
