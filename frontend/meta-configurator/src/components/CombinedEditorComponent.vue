<script lang="ts" setup>
import {computed, ref} from 'vue';
import 'primeicons/primeicons.css';

import SplitterPanel from 'primevue/splitterpanel';
import CodeEditorPanel from '@/components/code-editor/CodeEditorPanel.vue';
import GuiEditorPanel from '@/components/gui-editor/GuiEditorPanel.vue';
import Splitter from 'primevue/splitter';
import TopToolbar from '@/components/toolbar/TopToolbar.vue';
import {SessionMode, useSessionStore} from '@/store/sessionStore';
import router from '@/router';
import PanelDataCurrentPath from '@/components/DebuggingPanel.vue';
import {useSettingsStore} from '@/store/settingsStore';


const panels = computed(() => {
  let result = [CodeEditorPanel, GuiEditorPanel];
  if (!useSettingsStore().settingsData.guiEditorOnRightSide) {
    result = result.reverse();
  }
  return result;
});

// Reactive window width
let windowWidth = ref(window.innerWidth);
window.onresize = () => {
  windowWidth.value = window.innerWidth;
};

function updateMode(newMode: SessionMode) {
  switch (newMode) {
    case SessionMode.FileEditor:
      router.push('/');
      break;
    case SessionMode.SchemaEditor:
      router.push('/schema');
      break;
    case SessionMode.Settings:
      router.push('/settings');
      break;
  }
}

</script>

<template>
  <div class="w-screen h-full flex">
    <main class="h-full flex flex-col">
      <!-- toolbar -->
      <TopToolbar
        class="h-12 flex-none"
        :current-mode="useSessionStore().currentMode"
        @mode-selected="updateMode"/>

      <Splitter class="h-full" :layout="windowWidth < 600 ? 'vertical' : 'horizontal'">
        <SplitterPanel
          v-for="(panel, index) in panels"
          :key="index"
          :min-size="20"
          :resizable="true">
          <component :is="panel" />
        </SplitterPanel>
        <SplitterPanel v-if="useSettingsStore().settingsData.debuggingActive">
          <PanelDataCurrentPath />
        </SplitterPanel>
      </Splitter>
    </main>
  </div>
</template>

<style scoped></style>
