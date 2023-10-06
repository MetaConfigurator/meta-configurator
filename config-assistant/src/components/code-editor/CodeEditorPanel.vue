<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->
<template>
  <CodeEditorPanelForDifferentFormats
    v-if="useSessionStore().currentMode === SessionMode.FileEditor" />
  <CodeEditorPanelForDifferentFormats
    v-else-if="useSessionStore().currentMode === SessionMode.SchemaEditor" />
  <CodeEditorPanelForDifferentFormats
    v-else-if="useSessionStore().currentMode === SessionMode.Settings" />
</template>

<script setup>
import {useSessionStore, SessionMode} from '@/store/sessionStore';
import CodeEditorPanelForDifferentFormats from '@/components/code-editor/CodeEditorPanelForDifferentFormats.vue';
</script>
