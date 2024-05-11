<!--
Main component of the application.
Combines the code editor and the gui editor.
-->
<script lang="ts" setup>
import {computed, onMounted, ref, watch} from 'vue';
import 'primeicons/primeicons.css';
import SplitterPanel from 'primevue/splitterpanel';
import Splitter from 'primevue/splitter';
import TopToolbar from '@/components/toolbar/TopToolbar.vue';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import {useToast} from 'primevue/usetoast';
import {useConfirm} from 'primevue/useconfirm';
import {confirmationService} from '@/utility/confirmationService';
import {toastService} from '@/utility/toastService';
import {useAppRouter} from '@/router/router';
import {useDropZone, useWindowSize, watchImmediate} from '@vueuse/core/index';
import {readFileContentToDataLink} from '@/utility/readFileContent';
import {getDataForMode} from '@/data/useDataLink';
import {useSettings} from '@/settings/useSettings';
import {SessionMode} from '@/store/sessionMode';
import {useSessionStore} from '@/store/sessionStore';
import {getComponentByPanelType} from '@/components/panelType';
import type {SettingsInterfacePanels, SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

let panelsDefinition: SettingsInterfacePanels = useSettings().panels;

// update panelsDefinition only when underlying data changes. Otherwise, all panels will be rebuilt every time
// any setting is changed, which is not necessary and leads to Ace Editor becoming blank if settings were modified via
// Ace Editor
watchImmediate(
  () => useSettings(),
  (settings: SettingsInterfaceRoot) => {
    let panels = settings.panels;
    if (JSON.stringify(panels) !== JSON.stringify(panelsDefinition)) {
      panelsDefinition = panels;
    }
    // fix panels if they are not defined
    for (let mode of Object.values(SessionMode)) {
      if (!panels[mode]) {
        panels[mode] = structuredClone(SETTINGS_DATA_DEFAULT.panels[mode]);
      }
    }
  }
);

const panels = computed(() => {
  return panelsDefinition[props.sessionMode].map(panel => {
    return {
      component: getComponentByPanelType(panel.panelType),
      sessionMode: panel.mode,
      size: panel.size,
    };
  });
});

let {width} = useWindowSize();

function updateMode(newMode: SessionMode) {
  const router = useAppRouter();
  switch (newMode) {
    case SessionMode.DataEditor:
      router.push('/data');
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
  if (!useSessionStore().hasShownInitialDialog) {
    topToolbarRef.value?.showInitialSchemaDialog();
    useSessionStore().hasShownInitialDialog = true;
  }
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
  readFileContentToDataLink(files, getDataForMode(props.sessionMode));
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
        :current-mode="props.sessionMode"
        @mode-selected="updateMode" />
      <div class="flex-grow overflow-hidden" ref="mainPanel" id="mainpanel">
        <Splitter class="h-full" :layout="width < 600 ? 'vertical' : 'horizontal'" :key="panels">
          <SplitterPanel
            v-for="(panel, index) in panels"
            :key="index + panel"
            :min-size="10"
            :size="panel.size"
            :resizable="true">
            <component :is="panel.component" :sessionMode="panel.sessionMode" />
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
