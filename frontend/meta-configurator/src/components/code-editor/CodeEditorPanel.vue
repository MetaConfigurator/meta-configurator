<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->

<script setup lang="ts">
import AceEditor from '@/components/code-editor/AceEditor.vue';
</script>

<template>
  <AceEditor />
</template>

<style scoped></style>
