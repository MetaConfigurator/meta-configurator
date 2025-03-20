<!-- Dialog to import CSV data -->
<script setup lang="ts">
import {ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import {quicktypeJSONSchema} from '@/utility/codeGenerationUtils';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import Select from 'primevue/select';
import Button from 'primevue/button';

const showDialog = ref(false);

const programmingLanguageChoices = ref([
  'python',
  'java',
  'typescript',
  'swift',
  'kotlin',
  'rust',
  'dart',
  'go',
  'csharp',
  'c++',
]);

const selectedProgrammingLanguage = ref('');

const generatedCode = ref('');

// true: schema mode, false: data mode
const schemaMode = ref(true);

// watch the selected programming language and generate code accordingly
watch(selectedProgrammingLanguage, newValue => {
  let document: any;
  let documentTitle: string;
  if (schemaMode.value) {
    document = getDataForMode(SessionMode.SchemaEditor).data.value;
    documentTitle = document.title || 'Schema';
  } else {
    document = getDataForMode(SessionMode.DataEditor).data.value;
    documentTitle = 'Data';
  }
  quicktypeJSONSchema(newValue, documentTitle, JSON.stringify(document)).then(code => {
    generatedCode.value = code.lines.join('\n');
  });
});

function openDialog() {
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

function copyToClipboard() {
  navigator.clipboard.writeText(generatedCode.value).then(() => {
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

      <div class="code-container" v-if="generatedCode.length > 0">
        <pre><code>{{ generatedCode }}</code></pre>
      </div>

      <Button @click="copyToClipboard()" v-if="generatedCode.length > 0">Copy to clipboard</Button>
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
  max-height: 350px;
  max-width: 90%;
  overflow: auto;
  background: var(--p-primary-background); /* Dark background */
  color: var(--p-primary-color);
  padding: 10px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
}
</style>
