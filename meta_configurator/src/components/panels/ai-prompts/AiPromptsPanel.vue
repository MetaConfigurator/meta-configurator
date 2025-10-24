<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import AiPromptsSchema from '@/components/panels/ai-prompts/AiPromptsSchema.vue';
import AiPromptsData from '@/components/panels/ai-prompts/AiPromptsData.vue';
import AiPromptsSettings from '@/components/panels/ai-prompts/AiPromptsSettings.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import {ScrollPanel} from 'primevue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>

<template>
  <div class="panel-container">
    <PanelSettings panel-name="AI Prompts View" :panel-settings-path="['aiIntegration']">
      <p>
        This panel allows you to manage AI prompts for the current document. You can define prompts
        for schema generation, data manipulation, and other AI-related tasks.
      </p>
      <br />
      <ApiKey />
    </PanelSettings>
    <ApiKeyWarning />
    <div class="panel-content">
      <ScrollPanel
        style="width: 100%; height: 100%"
        :dt="{
          bar: {
            background: '{primary.color}',
          },
        }">
        <AiPromptsSchema
          :session-mode="props.sessionMode"
          v-if="props.sessionMode == SessionMode.SchemaEditor" />
        <AiPromptsData
          :session-mode="props.sessionMode"
          v-else-if="props.sessionMode == SessionMode.DataEditor" />
        <AiPromptsSettings
          :session-mode="props.sessionMode"
          v-else-if="props.sessionMode == SessionMode.Settings" />
      </ScrollPanel>
    </div>
  </div>
</template>

<style scoped>
.panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.panel-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
