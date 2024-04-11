<!--
Main component of the application.
Combines the code editor and the gui editor.
-->
<script lang="ts" setup>
import {computed, onMounted, ref, watch} from 'vue';
import 'primeicons/primeicons.css';
import SplitterPanel from 'primevue/splitterpanel';
import CodeEditorPanel from '@/components/code-editor/CodeEditorPanel.vue';
import GuiEditorPanel from '@/components/gui-editor/GuiEditorPanel.vue';
import Splitter from 'primevue/splitter';
import TopToolbar from '@/components/toolbar/TopToolbar.vue';
import {useSessionStore} from '@/store/sessionStore';
import Toast from 'primevue/toast';
import PanelDataCurrentPath from '@/components/DebuggingPanel.vue';
import ConfirmDialog from 'primevue/confirmdialog';
import {useToast} from 'primevue/usetoast';
import {useConfirm} from 'primevue/useconfirm';
import {confirmationService} from '@/utility/confirmationService';
import {toastService} from '@/utility/toastService';
import {useAppRouter} from '@/router';
import {useDropZone, useWindowSize} from '@vueuse/core/index';
import {readFileContentToDataLink} from '@/utility/readFileContent';
import {useCurrentData} from '@/data/useDataLink';
import {useSettings} from '@/settings/useSettings';
import {SessionMode} from '@/model/sessionMode';

const panels = computed(() => {
  let result = [CodeEditorPanel, GuiEditorPanel];
  if (!useSettings().guiEditorOnRightSide) {
    result = result.reverse();
  }
  if (useSettings().debuggingActive) {
    result.push(PanelDataCurrentPath);
  }
  return result;
});

let {width} = useWindowSize();

function updateMode(newMode: SessionMode) {
  const router = useAppRouter();
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
const mainPanel = ref();

onMounted(() => {
  topToolbarRef.value?.showInitialSchemaDialog();
});

const {isOverDropZone} = useDropZone(mainPanel, {
  dataTypes: ['Files'],
  onDrop,
});

watch(isOverDropZone, isOverDropZone => {
  // note that we use manual class manipulation here instead of the vue way because we want to avoid
  // that vue re-renders the whole editor when the class changes, which completely messes up the editor
  if (isOverDropZone) {
    mainPanel.value.classList.add('dragover');
  } else {
    mainPanel.value.classList.remove('dragover');
  }
});

function onDrop(files: File[] | null) {
  readFileContentToDataLink(files, useCurrentData());
}

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
      <div class="flex-grow overflow-hidden" ref="mainPanel" id="mainpanel">
        <Splitter class="h-full" :layout="width < 600 ? 'vertical' : 'horizontal'">
          <SplitterPanel
            v-for="(panel, index) in panels"
            :key="index"
            :min-size="10"
            :resizable="true">
            <component :is="panel" />
          </SplitterPanel>
        </Splitter>
      </div>
    </main>
  </div>
</template>

<!--suppress CssUnusedSymbol -->
<style scoped>
#mainpanel.dragover::before {
  content: 'Drop files anywhere to load them';
  font-size: 24px;
  color: #666;
  display: block;
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 10;
  background: rgba(255, 255, 255, 0.8);
  padding: 30px;
  border-radius: 4px;
  border: 2px solid #111111;
}
</style>
