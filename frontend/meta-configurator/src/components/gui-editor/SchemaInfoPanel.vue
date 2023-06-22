<script setup lang="ts">
import {computed, ref} from 'vue';
import ChevronRight from '@/components/icons/ChevronRight.vue';
import type {TopLevelJsonSchema} from '@/schema/TopLevelJsonSchema';
import ChooseSchema from '@/components/gui-editor/ChooseSchema.vue';

const props = defineProps<{
  schema: ref<TopLevelJsonSchema>;
}>();

const collapsed = ref(false);

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
  <div class="p-2 bg-slate-100 rounded-xl w-full drop-shadow" :class="{'max-h-16': collapsed}">
    <div class="flex flex-row items-center mb-1 cursor-pointer" @click="collapsed = !collapsed">
      <ChevronRight
        class="hover:scale-105 transition-all duration-200"
        :class="{'transform rotate-90': !collapsed}" />
      <h1 class="text-xl ml-1 font-semibold hover:underline underline-offset-4">
        Schema information
      </h1>
    </div>

    <div v-show="!collapsed">
      <p v-for="info in schemaInformation" :key="info.title">
        <span class="font-semibold">{{ info.title }}: </span>
        {{ info.value }}
      </p>
      <ChooseSchema></ChooseSchema>
    </div>
  </div>
</template>
