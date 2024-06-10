<script setup lang="ts">
import {computed} from 'vue';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import {useSessionStore} from '@/store/sessionStore';
import type {SessionMode} from '@/store/sessionMode';
import {getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {isSchemaEmpty} from '@/schema/schemaReadingUtils';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const schemaInformation = computed(() => {
  const schema = getSchemaForMode(props.sessionMode);
  const schemaWrapper = schema.schemaWrapper.value;
  // for title, use schemaWrapper because it resolved references, etc.
  let title = schemaWrapper.title ?? 'Untitled schema';
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
  <Accordion :activeIndex="1">
    <AccordionTab :header="'GUI Schema: ' + schemaInformation[0].value">
      <p v-for="info in schemaInformation" :key="info.title">
        <span class="font-semibold">{{ info.title }}: </span>
        {{ info.value }}
      </p>
      <p
        v-if="getSessionForMode(props.sessionMode).schemaErrorMessage.value != null"
        class="text-red-700">
        Schema Error: {{ getSessionForMode(props.sessionMode).schemaErrorMessage.value }}
      </p>
    </AccordionTab>
  </Accordion>
</template>
