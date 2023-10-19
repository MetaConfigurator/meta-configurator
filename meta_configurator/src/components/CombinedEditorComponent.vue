<!--
Main component of the application.
Combines the code editor and the gui editor.
-->
<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue';
import 'primeicons/primeicons.css';
import SplitterPanel from 'primevue/splitterpanel';
import CodeEditorPanel from '@/components/code-editor/CodeEditorPanel.vue';
import GuiEditorPanel from '@/components/gui-editor/GuiEditorPanel.vue';
import Splitter from 'primevue/splitter';
import TopToolbar from '@/components/toolbar/TopToolbar.vue';
import {SessionMode, useSessionStore} from '@/store/sessionStore';
import Toast from 'primevue/toast';
import router from '@/router';
import PanelDataCurrentPath from '@/components/DebuggingPanel.vue';
import {useSettingsStore} from '@/store/settingsStore';
import ConfirmDialog from 'primevue/confirmdialog';
import {useToast} from 'primevue/usetoast';
import {useConfirm} from 'primevue/useconfirm';
import {confirmationService} from '@/utility/confirmationService';
import {toastService} from '@/utility/toastService';

const panels = computed(() => {
  let result = [CodeEditorPanel, GuiEditorPanel];
  if (!useSettingsStore().settingsData.guiEditorOnRightSide) {
    result = result.reverse();
  }
  if (useSettingsStore().settingsData.debuggingActive) {
    result.push(PanelDataCurrentPath);
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

const topToolbarRef = ref();

onMounted(() => {
  topToolbarRef.value?.showInitialSchemaDialog();
});

confirmationService.confirm = useConfirm();
toastService.toast = useToast();
</script>

<template>
  <Toast position="bottom-left" />
  <ConfirmDialog />

  <div class="w-full h-full flex" style="max-height: 100%">
    <main class="flex flex-col">
      <!-- toolbar -->
      <TopToolbar
        ref="topToolbarRef"
        class="h-12 flex-none"
        :current-mode="useSessionStore().currentMode"
        @mode-selected="updateMode" />

      <Splitter
        class="flex-grow overflow-hidden"
        :layout="windowWidth < 600 ? 'vertical' : 'horizontal'">
        <SplitterPanel
          v-for="(panel, index) in panels"
          :key="index"
          :min-size="10"
          :resizable="true">
          <component :is="panel" />
        </SplitterPanel>
      </Splitter>
    </main>
  </div>
</template>

<style scoped></style>
