<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->
<template>
  <AceEditor data-format="json" v-if="settingsStore.settingsData.dataFormat === 'json'" />
  <AceEditor data-format="yaml" v-else-if="settingsStore.settingsData.dataFormat === 'yaml'" />
</template>

<script setup>
import {useSettingsStore} from '@/store/settingsStore';
import AceEditor from '@/components/code-editor/AceEditor.vue';

const settingsStore = useSettingsStore();
</script>
