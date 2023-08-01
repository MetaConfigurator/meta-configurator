<script setup lang="ts">
import CombinedEditorComponent from '@/components/CombinedEditorComponent.vue';
import {SessionMode} from '@/store/sessionStore';
</script>

<template>
  <p>SchemaEditorView</p>
  <CombinedEditorComponent :editor-mode="SessionMode.SchemaEditor" />
</template>

<style scoped></style>
