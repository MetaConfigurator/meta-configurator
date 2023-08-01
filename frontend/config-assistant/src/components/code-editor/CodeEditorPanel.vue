<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->
<template>
  <AceEditor
    :data-format="settingsStore.settingsData.dataFormat"
    v-if="useSessionStore().currentMode === SessionMode.FileEditor" />
  <AceEditor
    :data-format="settingsStore.settingsData.dataFormat"
    v-else-if="useSessionStore().currentMode === SessionMode.SchemaEditor" />
  <AceEditor
    :data-format="settingsStore.settingsData.dataFormat"
    v-else-if="useSessionStore().currentMode === SessionMode.Settings" />
</template>

<script setup>
import {useSettingsStore} from '@/store/settingsStore';
import AceEditor from '@/components/code-editor/AceEditor.vue';
import {useSessionStore, SessionMode} from '@/store/sessionStore';

const settingsStore = useSettingsStore();
</script>
