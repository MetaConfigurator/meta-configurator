<script setup lang="ts">
import {computed} from 'vue';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import {useSessionStore} from '@/store/sessionStore';
import type {SessionMode} from '@/store/sessionMode';
import {getSchemaForMode} from '@/data/useDataLink';

const props = defineProps<{
  mode: SessionMode;
}>();

const schemaInformation = computed(() => {
  let schema = getSchemaForMode(props.mode).schemaWrapper.value;
  return [
    {
      title: 'Title',
      value: schema?.title ?? 'Untitled schema',
    },
    {
      title: 'Source',
      value: schema?.$id,
    },
    {
      title: 'Description',
      value: schema?.description,
    },
  ];
});
</script>

<template>
  <Accordion :activeIndex="1">
    <AccordionTab
      :header="
        'Schema: ' + (getSchemaForMode(props.mode).schemaWrapper.value?.title ?? 'Untitled schema')
      ">
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
