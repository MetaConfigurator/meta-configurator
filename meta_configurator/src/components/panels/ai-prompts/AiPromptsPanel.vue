<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import AiPromptsSchema from '@/components/panels/ai-prompts/AiPromptsSchema.vue';
import AiPromptsData from '@/components/panels/ai-prompts/AiPromptsData.vue';
import AiPromptsSettings from '@/components/panels/ai-prompts/AiPromptsSettings.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>

<template>
  <PanelSettings panel-name="AI Prompts View" :panel-settings-path="['aiIntegration']">
    <p>
      This panel allows you to manage AI prompts for the current document. You can define prompts
      for schema generation, data manipulation, and other AI-related tasks.
    </p>
    <br />
    <ApiKey />
  </PanelSettings>
  <AiPromptsSchema
    :session-mode="props.sessionMode"
    v-if="props.sessionMode == SessionMode.SchemaEditor" />
  <AiPromptsData
    :session-mode="props.sessionMode"
    v-else-if="props.sessionMode == SessionMode.DataEditor" />
  <AiPromptsSettings
    :session-mode="props.sessionMode"
    v-else-if="props.sessionMode == SessionMode.Settings" />
</template>

<style scoped></style>
