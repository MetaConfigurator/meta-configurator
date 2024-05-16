<script setup lang="ts">
import {computed} from 'vue';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import {useSessionStore} from '@/store/sessionStore';
import type {SessionMode} from '@/store/sessionMode';
import {getSchemaForMode, getSessionForMode} from '@/data/useDataLink';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const schemaInformation = computed(() => {
  let schema = getSchemaForMode(props.sessionMode).schemaWrapper.value;
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
        'GUI Schema: ' +
        (getSchemaForMode(props.sessionMode).schemaWrapper.value?.title ?? 'Untitled schema')
      ">
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
