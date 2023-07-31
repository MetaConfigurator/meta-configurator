<script setup lang="ts">
import ChevronRight from '@/components/icons/ChevronRight.vue';
import type {Path} from '@/model/path';

const props = defineProps<{
  path: Path;
  rootName: string;
}>();

const emit = defineEmits<{
  (e: 'update:path', newPath: Path): void;
}>();

function isNotLast(index: number) {
  return index != props.path.length - 1;
}

function jumpToLevel(index: number) {
  if (index == 0) {
    emit('update:path', [props.path[0]]);
  } else if (isNotLast(index)) {
    emit('update:path', props.path.slice(0, index + 1));
  }
}
</script>

<template>
  <nav class="flex h-8" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-1 h-full">
      <li
        v-for="(pathItem, index) in path"
        :key="pathItem"
        class="inline-flex items-center space-x-3">
        <div
          class="inline-flex items-center text-sm font-medium text-gray-700"
          :class="{
            'hover:underline underline-offset-2 hover:text-slate-800 cursor-pointer':
              isNotLast(index),
          }"
          @click="jumpToLevel(index)">
          {{ pathItem }}
        </div>
        <ChevronRight v-if="isNotLast(index)" class="text-gray-600" />
      </li>
    </ol>
  </nav>
</template>

<style scoped></style>
