<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import AiPromptsSchema from '@/components/panels/ai-prompts/AiPromptsSchema.vue';
import AiPromptsData from '@/components/panels/ai-prompts/AiPromptsData.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>

<template>
  <AiPromptsSchema v-if="props.sessionMode == SessionMode.SchemaEditor" />
  <AiPromptsData v-else-if="props.sessionMode == SessionMode.DataEditor" />
  <label v-if="props.sessionMode == SessionMode.Settings">TODO</label>
</template>

<style scoped></style>
