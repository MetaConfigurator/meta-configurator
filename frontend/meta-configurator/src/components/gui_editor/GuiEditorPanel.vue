<!-- Facade for JsonSchemaGuiEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->

<script setup lang="ts">

import JsonSchemaGuiEditorPanel from '@/components/gui_editor/JsonSchemaGuiEditorPanel.vue';

</script>

<template>

  <JsonSchemaGuiEditorPanel/>

</template>

<style scoped></style>
