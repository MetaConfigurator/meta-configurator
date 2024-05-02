<script setup lang="ts">
import CombinedEditorComponent from '@/components/CombinedEditorComponent.vue';
import {SessionMode} from '@/store/sessionMode';
</script>

<template>
  <CombinedEditorComponent :sessionMode="SessionMode.DataEditor" />
</template>

<style scoped></style>
