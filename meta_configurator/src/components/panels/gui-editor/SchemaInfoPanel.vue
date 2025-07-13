<script setup lang="ts">
import {computed} from 'vue';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import type {SessionMode} from '@/store/sessionMode';
import {getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {getSchemaTitle, isSchemaEmpty} from '@/schema/schemaReadingUtils';
import Panel from 'primevue/panel';

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
      title: 'Title',
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
  <Panel :header="'GUI Editor Schema: ' + schemaInformation[0].value" toggleable :collapsed="true">
    <p v-for="info in schemaInformation" :key="info.title">
      <span class="font-semibold">{{ info.title }}: </span>
      {{ info.value }}
    </p>
    <p
      v-if="getSessionForMode(props.sessionMode).schemaErrorMessage.value != null"
      class="text-red-700">
      Schema Error: {{ getSessionForMode(props.sessionMode).schemaErrorMessage.value }}
    </p>
  </Panel>
</template>
