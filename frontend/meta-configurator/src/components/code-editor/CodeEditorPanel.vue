<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->
<template>
  <AceEditorJson v-if="settingsStore.settingsData.configLanguage === 'json'" ref="editor"/>
  <AceEditorYaml v-else-if="settingsStore.settingsData.configLanguage === 'yaml'" ref="editor"/>
</template>

<script setup>
import {useSettingsStore} from '@/store/settingsStore';
import AceEditorJson from '@/components/code-editor/AceEditorJson.vue';
import AceEditorYaml from '@/components/code-editor/AceEditorYaml.vue';

const settingsStore = useSettingsStore();
</script>
