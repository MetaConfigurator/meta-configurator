<script setup lang="ts">
import {computed} from 'vue';
import type {SessionMode} from '@/store/sessionMode';
import {getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {getSchemaTitle, isSchemaEmpty} from '@/schema/schemaReadingUtils';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const schemaInformation = computed(() => {
  const schema = getSchemaForMode(props.sessionMode);
  const schemaWrapper = schema.schemaWrapper.value;
  // for title, use schemaWrapper because it resolved references, etc.
  let title = getSchemaTitle(schemaWrapper);
  // for check of empty schema, use raw schema
  if (isSchemaEmpty(schema.schemaRaw.value)) {
    title = 'No schema loaded';
  }
  return [
    {
      title: 'Schema',
      value: title,
    },
    {
      title: 'Source',
      value: schemaWrapper.$id,
    },
    {
      title: 'Description',
      value: schemaWrapper.description,
    },
  ];
});
</script>

<template>
  <div v-for="info in schemaInformation" :key="info.title">
    <div v-if="info.value">
      <p v-if="info.title == 'Schema'">
        <span class="font-semibold">{{ info.title }}: </span>
        <span data-testid="current-schema">{{ info.value }}</span>
      </p>

      <p v-else>
        <span class="font-semibold">{{ info.title }}: </span>
        {{ info.value }}
      </p>
    </div>
  </div>
  <p
    v-if="getSessionForMode(props.sessionMode).schemaErrorMessage.value != null"
    class="text-red-700">
    Invalid Schema: {{ getSessionForMode(props.sessionMode).schemaErrorMessage.value }}
  </p>
</template>
