<script setup lang="ts">
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import Divider from 'primevue/divider';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const session = getSessionForMode(props.sessionMode);
const data = getDataForMode(props.sessionMode);
const schema = getSchemaForMode(props.sessionMode);
</script>

<template>
  <div class="flex-grow overflow-y-auto">
    <div>
      <h1>Session Mode: {{ props.sessionMode }}</h1>
      <p>Session currentPath: {{ session.currentPath.value }}</p>
      <p>Session currentSelectedElement: {{ session.currentSelectedElement.value }}</p>
      <Divider />
    </div>
  </div>
</template>

<style scoped></style>
