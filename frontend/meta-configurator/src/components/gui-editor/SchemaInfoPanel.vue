<script setup lang="ts">
import {computed, ref} from 'vue';
import type {TopLevelJsonSchema} from '@/model/TopLevelJsonSchema';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';

const props = defineProps<{
  schema: ref<TopLevelJsonSchema>;
}>();

// const collapsed = ref(false);

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
<!--  <div class="p-2 bg-slate-100 rounded-xl w-full drop-shadow" :class="{'max-h-16': collapsed}">-->
<!--    <div class="flex flex-row items-center mb-1 cursor-pointer" @click="collapsed = !collapsed">-->
<!--      <ChevronRight-->
<!--          class="hover:scale-105 transition-all duration-200"-->
<!--          :class="{'transform rotate-90': !collapsed}" />-->
<!--      <h1 class="text-xl ml-1 font-semibold hover:underline underline-offset-4">-->
<!--        Schema information-->
<!--      </h1>-->
<!--    </div>-->


<!--    <div v-show="!collapsed">-->
<!--      <p v-for="info in schemaInformation" :key="info.title">-->
<!--        <span class="font-semibold">{{ info.title }}: </span>-->
<!--        {{ info.value }}-->
<!--      </p>-->
<!--    </div>-->
<!--  </div>-->

  <Accordion :activeIndex="1">
    <AccordionTab header="Schema Information">
      <p v-for="info in schemaInformation" :key="info.title">
        <span class="font-semibold">{{ info.title }}: </span>
        {{ info.value }}
      </p>
    </AccordionTab>
  </Accordion>
</template>