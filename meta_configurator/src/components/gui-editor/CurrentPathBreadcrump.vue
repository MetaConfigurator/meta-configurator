<!--
Component for displaying the current path in the GUI editor
and allowing the user to jump to a parent path.
-->
<script setup lang="ts">
import ChevronRight from '@/components/icons/ChevronRight.vue';
import {computed} from 'vue';
import type {Path} from '@/utility/path';

const props = defineProps<{
  path: Path;
  rootName: string;
}>();

const emit = defineEmits<{
  (e: 'update:path', newPath: Path): void;
}>();

const pathWithRoot = computed(() => [props.rootName, ...props.path]);

function isNotLast(index: number) {
  return index != pathWithRoot.value.length - 1;
}

function jumpToLevel(index: number) {
  if (index == 0) {
    emit('update:path', []);
  } else if (isNotLast(index)) {
    emit('update:path', props.path.slice(0, index));
  }
}
</script>

<template>
  <nav class="flex h-8" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-1 h-full">
      <li
        v-for="(pathItem, index) in pathWithRoot"
        :key="pathItem"
        class="inline-flex items-center space-x-3">
        <!-- the path element, clickable if it is not the last element -->
        <div
          class="inline-flex items-center text-sm font-medium text-gray-700"
          :class="{
            'hover:underline underline-offset-2 hover:text-slate-800 cursor-pointer':
              isNotLast(index),
          }"
          @click="jumpToLevel(index)">
          {{ pathItem }}
        </div>
        <!-- chevron right if it is not the last element -->
        <ChevronRight v-if="isNotLast(index)" class="text-gray-600" />
      </li>
    </ol>
  </nav>
</template>

<style scoped></style>
