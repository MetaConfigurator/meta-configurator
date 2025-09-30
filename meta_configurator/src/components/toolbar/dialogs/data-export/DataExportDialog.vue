<!-- Dialog to export JSON/Schema to text via Handlebars template with optional AI assistance -->
<script setup lang="ts">
import {ref, nextTick} from 'vue';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Panel from 'primevue/panel';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {DataExportServiceHandlebars} from '@/utility/data-export/dataExportServiceHandlebars';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';

const showDialog = ref(false);
const templateContent = ref('');
const generatedOutput = ref('');
const schemaMode = ref(true);

const exportService = new DataExportServiceHandlebars();

// AI assistance
const showAISpoiler = ref(false);
const aiDescription = ref('');
const isGeneratingTemplate = ref(false);

function openDialog() {
  generatedOutput.value = '';
  templateContent.value = '';
  aiDescription.value = '';
  showAISpoiler.value = false;
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

function generateText() {
  if (!templateContent.value.trim()) {
    generatedOutput.value = '⚠️ Please enter a template.';
    return;
  }
  const document = schemaMode.value
    ? getDataForMode(SessionMode.SchemaEditor).data.value
    : getDataForMode(SessionMode.DataEditor).data.value;

  exportService
    .performDataMapping(document, templateContent.value)
    .then((result: {resultData: any; success: boolean; message: string}) => {
      if (result.success) {
        generatedOutput.value = result.resultData;
      } else {
        generatedOutput.value = '⚠️ Generation error: ' + result.message;
      }
    })
    .catch(err => {
      generatedOutput.value = '⚠️ Generation error: ' + err;
    });
}

function copyToClipboard() {
  navigator.clipboard.writeText(generatedOutput.value).then(() => {
    alert('Text copied to clipboard');
  });
}

async function generateTemplateWithAI() {
  if (!aiDescription.value.trim()) return;
  isGeneratingTemplate.value = true;
  try {
    const input = schemaMode.value
      ? getDataForMode(SessionMode.SchemaEditor).data.value
      : getDataForMode(SessionMode.DataEditor).data.value;

    const inputSchema = schemaMode.value
      ? getSchemaForMode(SessionMode.SchemaEditor).schemaRaw.value
      : getSchemaForMode(SessionMode.DataEditor).schemaRaw.value;

    const outputDescription = aiDescription.value;

    const response = await exportService.generateMappingSuggestion(
      input,
      inputSchema,
      outputDescription
    );

    if (!response.success) {
      alert('AI generation failed: ' + response.message);
      return;
    } else {
      templateContent.value = response.config;
    }
  } catch (err) {
    alert('AI generation failed: ' + err);
  } finally {
    isGeneratingTemplate.value = false;
    await nextTick();
  }
}

defineExpose({show: openDialog, close: hideDialog, activateSchemaMode, activateDataMode});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Export to other Formats via Template"
    :style="{maxWidth: '90%', minWidth: '60%', margin: 'auto'}">
    <div class="flex flex-column gap-3 bigger-dialog-content">
      <Panel header="Generate a Template with AI Assistance" toggleable :collapsed="true">
        <PanelSettings
          panel-name="API Key and AI Settings"
          settings-header="AI Settings"
          :panel-settings-path="['aiIntegration']">
          <ApiKey />
        </PanelSettings>
        <ApiKeyWarning />

        <Textarea
          v-model="aiDescription"
          rows="4"
          class="w-full mt-4"
          autoResize
          placeholder="Describe the output file you want..." />
        <Button
          label="Generate Template"
          icon="pi pi-robot"
          class="mt-2"
          @click="generateTemplateWithAI"
          :loading="isGeneratingTemplate" />
      </Panel>

      <Textarea
        v-model="templateContent"
        rows="10"
        autoResize
        class="w-full"
        placeholder="Write or paste your Handlebars template here..." />
      <Button label="Generate Text" @click="generateText" />

      <div class="code-container" v-if="generatedOutput.length > 0">
        <pre><code>{{ generatedOutput }}</code></pre>
      </div>

      <Button v-if="generatedOutput.length > 0" @click="copyToClipboard">Copy to clipboard</Button>

      <div class="text-sm text-gray-500">
        <a href="https://handlebarsjs.com/guide/" target="_blank" class="underline"
          >Learn more about Handlebars templates</a
        >
      </div>
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
.code-container {
  max-height: 200px;
  max-width: 100%;
  overflow: auto;
  background: var(--p-primary-background);
  color: var(--p-primary-color);
  padding: 10px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
}
</style>
