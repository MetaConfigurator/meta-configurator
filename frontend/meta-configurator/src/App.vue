<script lang="ts" setup>
import {computed, ref} from 'vue';
import 'primeicons/primeicons.css';

import SplitterPanel from 'primevue/splitterpanel';
import AceEditor from '@/components/code-editor/AceEditor.vue';
import JsonSchemaGuiEditorPanel from '@/components/gui-editor/JsonSchemaGuiEditorPanel.vue';
import Splitter from 'primevue/splitter';
import TopToolbar from '@/components/toolbar/TopToolbar.vue';

const selectedPage = ref('file');

function updatePage(newPage: string) {
  selectedPage.value = newPage;
}

const panelOrder = ref<'code' | 'gui'>('code');

function toggleOrder() {
  if (panelOrder.value === 'code') {
    panelOrder.value = 'gui';
  } else {
    panelOrder.value = 'code';
  }
}

const panels = computed(() => {
  let result = [AceEditor, JsonSchemaGuiEditorPanel];
  if (panelOrder.value === 'gui') {
    result = result.reverse();
  }
  return result;
});

// reactive window width
let windowWidth = ref(window.innerWidth);
window.onresize = () => {
  windowWidth.value = window.innerWidth;
};
</script>

<template>
  <div class="w-screen h-full flex">
    <main class="h-full flex flex-col">
      <!-- toolbar -->
      <TopToolbar
        class="h-12 flex-none"
        :selectedPage="selectedPage"
        @page-changed="updatePage"
        @toggle-order="toggleOrder" />
      <Splitter class="h-full" :layout="windowWidth < 600 ? 'vertical' : 'horizontal'">
        <SplitterPanel
          v-for="(panel, index) in panels"
          :key="index"
          :min-size="20"
          :resizable="true">
          <component :is="panel" />
        </SplitterPanel>
      </Splitter>
    </main>
  </div>
</template>

<style scoped></style>
