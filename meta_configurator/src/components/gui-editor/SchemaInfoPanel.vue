<script setup lang="ts">
import {computed, ref} from 'vue';
import type {TopLevelJsonSchemaWrapper} from '@/schema/topLevelJsonSchemaWrapper';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import {useSessionStore} from '@/store/sessionStore';

const props = defineProps<{
  schema: ref<TopLevelJsonSchemaWrapper>;
}>();

const schemaInformation = computed(() => {
  return [
    {
      title: 'Title',
      value: props.schema?.title ?? 'Untitled schema',
    },
    {
      title: 'Source',
      value: props.schema?.$id,
    },
    {
      title: 'Description',
      value: props.schema?.description,
    },
  ];
});
</script>

<template>
  <Accordion :activeIndex="1">
    <AccordionTab :header="'Schema: ' + (schema?.title ?? 'Untitled schema')">
      <p v-for="info in schemaInformation" :key="info.title">
        <span class="font-semibold">{{ info.title }}: </span>
        {{ info.value }}
      </p>
      <p v-if="useSessionStore().schemaErrorMessage != null" class="text-red-700">
        Schema Error: {{ useSessionStore().schemaErrorMessage }}
      </p>
    </AccordionTab>
  </Accordion>
</template>
