<!-- only a prototype -->

<script setup lang="ts">
import { computed, ref } from "vue";
import IconExpand from "@/components/icons/IconExpand.vue";
import ChevronRight from "@/components/icons/ChevronRight.vue";
import type { JsonSchema } from "@/schema/JsonSchema";

const props = defineProps<{
  currentSchema: JsonSchema;
  currentData: any;
}>();

defineEmits<{
  (e: 'expand:path', pathToAdd: string | number): void;
}>();

const expandedKeys = ref<string[]>([]);

const propertiesToDisplay = computed(() => {
  // TODO: consider properties of data, i.e., additionalProperties, patternProperties, etc.
  return props.currentSchema.properties;
});

function isExpandable(key: string): boolean {
  return props.currentSchema.subSchema(key)?.hasType("object")
    || props.currentSchema.subSchema(key)?.hasType("array") || false;
}

function isExpanded(key: string) {
  return expandedKeys.value.includes(key);
}

function toggleExpansion(key: string) {
  if (isExpanded(key)) {
    expandedKeys.value.splice(expandedKeys.value.indexOf(key), 1);
    return;
  }
  expandedKeys.value.push(key);
}
</script>

<template>
  <table class="w-full table-fixed p-1">
    <thead>
      <tr class="">
        <th class="w-1/3 text-left p-2 bg-slate-400">Property</th>
        <th class="text-left p-2 bg-slate-400">Value</th>
      </tr>
    </thead>
    <tbody v-for='(schemaDef, key) in propertiesToDisplay' :key='key'>
    <tr>
      <td class='p-2 bg-slate-200 border-b border-r border-slate-300 flex flex-row items-center'>
        <ChevronRight
          v-if='isExpandable(key as string)'
          class='w-4 h-4 cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all duration-200'
          :class='{"transform rotate-90": isExpanded(key as string)}'
          @click='toggleExpansion(key as string)' />
        {{ key }}
        <span v-if='currentSchema.isRequired(key as string)' class='text-red-500'>*</span>
        <span class='ml-2 text-xs text-gray-400'>{{ schemaDef.type.join(", ") }}</span>
        <IconExpand
          class='w-3.5 h-3.5 scale-125 justify-end ml-auto cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-white'
          v-if='isExpandable(key as string)'
          @click="$emit('expand:path', key)" />
      </td>
        <td class="p-2 border-b border-slate-300 truncate">{{ currentData[key] }}</td>
      </tr>
      <tr
        v-show='isExpanded(key as string)'
        v-for='(subSchemaDef, subKey) in propertiesToDisplay[key].properties'
        :key='subKey'>
        <!-- in the future there will be a better, generic solution -->
        <td class="p-2 bg-slate-50 border-b border-r border-slate-300 flex flex-row items-center">
          <span class="w-4 ml-2"></span>
          {{ subKey }}
          <span class="ml-2 text-xs text-gray-400">{{ subSchemaDef.type }}</span>
        </td>
        <td class="p-2 border-b border-slate-300 truncate">{{ currentData[key][subKey] }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped></style>
