<!--
Main component of the application.
Combines the code editor and the gui editor.
-->
<script lang="ts" setup>
import {computed, onMounted, onUnmounted, type Ref, ref, watch} from 'vue';
import 'primeicons/primeicons.css';
import SplitterPanel from 'primevue/splitterpanel';
import Splitter from 'primevue/splitter';
import Toolbar from '@/components/toolbar/Toolbar.vue';
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
import {modeToRoute, SessionMode} from '@/store/sessionMode';
import {useSessionStore} from '@/store/sessionStore';
import type {SettingsInterfacePanels, SettingsInterfaceRoot} from '@/settings/settingsTypes';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';
import {updateSettingsWithDefaults} from '@/settings/settingsUpdater';
import {panelTypeRegistry} from '@/components/panels/panelTypeRegistry';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const settings = useSettings();
let panelsDefinition: SettingsInterfacePanels = settings.value.panels;

// update panelsDefinition only when underlying data changes. Otherwise, all panels will be rebuilt every time
// any setting is changed, which is not necessary and leads to Ace Editor becoming blank if settings were modified via
// Ace Editor
watchImmediate(
  () => settings,
  (settings: Ref<SettingsInterfaceRoot>) => {
    let panels = settings.value.panels;
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
      component: panelTypeRegistry.getPanelTypeDefinition(panel.panelType).getComponent(),
      sessionMode: panel.mode,
      size: panel.size,
    };
  });
});

let {width} = useWindowSize();

function updateMode(newMode: SessionMode) {
  const router = useAppRouter();
  const route = modeToRoute(newMode);
  router.push(route);
}

const toolbarRef = ref();
const mainPanel = ref();

onMounted(() => {
  if (!useSessionStore().hasShownInitialDialog) {
    toolbarRef.value?.showInitialSchemaDialog();
    useSessionStore().hasShownInitialDialog = true;

    // update user settings by adding default value for missing fields
    // also performs settings migration in case of outdated settings
    const userSettings = getDataForMode(SessionMode.Settings).data.value;
    const defaultSettings: any = structuredClone(SETTINGS_DATA_DEFAULT);
    updateSettingsWithDefaults(userSettings, defaultSettings);
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

function undo() {
  getDataForMode(props.sessionMode).undoManager.undo();
}

function redo() {
  getDataForMode(props.sessionMode).undoManager.redo();
}

function isMacOS() {
  if ('userAgentData' in navigator) {
    return (navigator.userAgentData as {platform: string}).platform === 'macOS';
  } else {
    return /Mac/i.test(navigator.userAgent);
  }
}

// Function to handle keydown events
function handleKeydown(event: KeyboardEvent) {
  const isMac = isMacOS();
  const undoKeys = isMac ? event.metaKey && event.key === 'z' : event.ctrlKey && event.key === 'z';
  const redoKeys = isMac
    ? event.metaKey && event.shiftKey && event.key === 'z'
    : event.ctrlKey && event.key === 'y';

  if (undoKeys && !redoKeys) {
    event.preventDefault();
    undo();
  } else if (redoKeys) {
    event.preventDefault();
    redo();
  }
}

// Attach and remove event listeners
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Toast position="bottom-left" />
  <ConfirmDialog />

  <div class="w-full h-full flex" style="max-height: 100%">
    <main class="flex flex-col w-full h-full">
      <!-- toolbar -->
      <Toolbar ref="toolbarRef" :current-mode="props.sessionMode" @mode-selected="updateMode" />
      <div class="flex-grow overflow-hidden" ref="mainPanel" id="mainpanel">
        <Splitter
          class="h-full"
          style="min-width: 0"
          :layout="width < 600 ? 'vertical' : 'horizontal'"
          :key="panels">
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
