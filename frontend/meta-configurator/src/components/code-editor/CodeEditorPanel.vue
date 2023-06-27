<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->

<script setup lang="ts">
import AceEditor from '@/components/code-editor/AceEditor.vue';
import AceEditorForYaml from '@/components/code-editor/AceEditorForYaml.vue';
</script>

// Here we should link to the language-choosing-button, // deciding which language would be shown in
code editor. // For now I just comment the editor for JSON and show YAML
<template>
  <!--  <AceEditor />-->
  <AceEditorForYaml />
</template>

<style scoped></style>
