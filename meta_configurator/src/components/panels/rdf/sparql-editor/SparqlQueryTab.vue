<template>
  <div class="query-panel">
    <ScrollPanel
      class="query-scrollpanel"
      style="width: 100%; height: 100%"
      :dt="{
        bar: {
          background: '{primary.color}',
        },
      }">
      <div class="space-y-4 mb-2">
        <Accordion :value="activeAccordion" @update:value="emit('update:activeAccordion', $event)">
          <AccordionPanel value="aiPanel">
            <AccordionHeader>Use AI assistance to generate SPARQL queries</AccordionHeader>
            <AccordionContent>
              <PanelSettings
                panel-name="API Key and AI Settings"
                settings-header="AI Settings"
                panel-display-name="AI Settings"
                :panel-settings-path="['aiIntegration']"
                :sessionMode="SessionMode.DataEditor">
                <ApiKey />
              </PanelSettings>
              <ApiKeyWarning />
              <Textarea
                id="userComments"
                :modelValue="userComments"
                @update:modelValue="emit('update:userComments', $event)"
                @click.stop
                @keydown.stop
                class="w-full mt-2"
                :placeholder="userCommentsPlaceholder" />
              <Message severity="warn" class="mb-2">
                <span>Generated SPARQL queries may require manual review.</span>
              </Message>
              <Button
                label="Suggest SPARQL Query"
                icon="pi pi-wand"
                @click="emit('suggest')"
                class="w-full"
                :loading="isSuggesting" />
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </div>
      <div class="editor-container mb-2">
        <SparqlQueryEditor
          :modelValue="sparqlQuery"
          @update:modelValue="emit('update:sparqlQuery', $event)"
          :errorLine="errorLineNumber"
          :errorMessage="errorMessage" />
      </div>
      <div class="editor-footer flex items-center w-full mb-2">
        <div class="flex items-center gap-2">
          <ToggleSwitch
            :modelValue="enableVisualization"
            @update:modelValue="emit('update:enableVisualization', $event)">
            <template #handle="{checked}">
              <i :class="['!text-xs pi', {'pi-eye': checked, 'pi-eye-slash': !checked}]" />
            </template>
          </ToggleSwitch>
          <span class="text-sm font-medium">
            {{ enableVisualization ? 'Visualization On' : 'Visualization Off' }}
          </span>
        </div>
        <Button
          v-if="enableVisualization"
          icon="pi pi-question-circle"
          variant="text"
          severity="warning"
          @click="emit('open-visualization-help')" />
        <div class="flex items-center gap-2 ml-auto">
          <Button label="Run Query" icon="pi pi-play" @click="emit('run-query')" />
        </div>
      </div>
    </ScrollPanel>
    <VisualizationHelpDialog
      :visible="visualizationHelpDialog"
      @update:visible="emit('update:visualizationHelpDialog', $event)" />
  </div>
</template>

<script setup lang="ts">
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import {SessionMode} from '@/store/sessionMode';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import Button from 'primevue/button';
import {ScrollPanel} from 'primevue';
import ToggleSwitch from 'primevue/toggleswitch';
import SparqlQueryEditor from '@/components/panels/rdf/sparql-editor/SparqlQueryEditor.vue';
import VisualizationHelpDialog from '@/components/panels/rdf/sparql-editor/VisualizationHelpDialog.vue';

defineProps<{
  activeAccordion: string | null;
  userComments: string;
  userCommentsPlaceholder: string;
  isSuggesting: boolean;
  sparqlQuery: string;
  errorLineNumber: number | null;
  errorMessage: string | null;
  enableVisualization: boolean;
  visualizationHelpDialog: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeAccordion', value: string | null): void;
  (e: 'update:userComments', value: string): void;
  (e: 'update:sparqlQuery', value: string): void;
  (e: 'update:enableVisualization', value: boolean): void;
  (e: 'update:visualizationHelpDialog', value: boolean): void;
  (e: 'suggest'): void;
  (e: 'run-query'): void;
  (e: 'open-visualization-help'): void;
}>();
</script>

<style scoped>
.query-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
}

.editor-container {
  flex: 1;
  min-height: 0;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

:deep(.query-scrollpanel) {
  flex: 1;
  min-height: 0;
}

:deep(.query-scrollpanel .p-scrollpanel-content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.query-scrollpanel .p-scrollpanel-content > .space-y-4) {
  flex-shrink: 0;
}
</style>
