<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import AiPromptsSchema from '@/components/panels/ai-prompts/AiPromptsSchema.vue';
import AiPromptsData from '@/components/panels/ai-prompts/AiPromptsData.vue';
import AiPromptsSettings from '@/components/panels/ai-prompts/AiPromptsSettings.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>

<template>
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
