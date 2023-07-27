<script setup lang="ts">
import {computed, ref} from 'vue';
import type {TopLevelJsonSchema} from '@/helpers/schema/TopLevelJsonSchema';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';

const props = defineProps<{
  schema: ref<TopLevelJsonSchema>;
}>();

const schemaInformation = computed(() => {
  return [
    {
      title: 'Title',
      value: props.schema.title,
    },
    {
      title: 'Source',
      value: props.schema.$id,
    },
    {
      title: 'Description',
      value: props.schema.description,
    },
  ];
});
</script>

<template>
  <Accordion :activeIndex="1">
    <AccordionTab :header="'Schema: ' + (schema.title ?? 'Untitled schema')">
      <p v-for="info in schemaInformation" :key="info.title">
        <span class="font-semibold">{{ info.title }}: </span>
        {{ info.value }}
      </p>
    </AccordionTab>
  </Accordion>
</template>
