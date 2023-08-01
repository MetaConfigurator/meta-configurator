<script setup lang="ts">
import CombinedEditorComponent from '@/components/CombinedEditorComponent.vue';
import {SessionMode, useSessionStore} from '@/store/sessionStore';
</script>

<template>
  <p>FileEditorView</p>
  <CombinedEditorComponent
    :editor-mode="SessionMode.FileEditor"
    v-if="useSessionStore().currentMode == SessionMode.FileEditor" />
  <CombinedEditorComponent
    :editor-mode="SessionMode.FileEditor"
    v-else-if="useSessionStore().currentMode == SessionMode.SchemaEditor" />
  <CombinedEditorComponent :editor-mode="SessionMode.FileEditor" v-else />
</template>

<style scoped></style>
