<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->
<template>
  <div>
    <div v-if="settingsStore.configLanguage === 'json'">
      <AceEditor></AceEditor>
    </div>
    <div v-else-if="settingsStore.configLanguage === 'yaml'">
      <AceEditorForYaml></AceEditorForYaml>
    </div>
  </div>
</template>

<script setup>
import { useSettingsStore } from '@/store/settingsStore';
import AceEditor from "@/components/code-editor/AceEditor.vue";
import AceEditorForYaml from "@/components/code-editor/AceEditorForYaml.vue";

const settingsStore = useSettingsStore();
</script>