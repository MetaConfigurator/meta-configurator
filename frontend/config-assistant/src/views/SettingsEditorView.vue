<script setup lang="ts">
import CombinedEditorComponent from '@/components/CombinedEditorComponent.vue';
import {SessionMode} from '@/store/sessionStore';
</script>

<template>
  <p>SettingsEditorView</p>
  <CombinedEditorComponent :editor-mode="SessionMode.Settings" />
</template>

<style scoped></style>
