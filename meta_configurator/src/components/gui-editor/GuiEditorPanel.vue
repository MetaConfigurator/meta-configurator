<!-- Facade for GuiEditorPanelJsonSchema. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->

<script setup lang="ts">
import GuiEditorPanelJsonSchema from '@/components/gui-editor/GuiEditorPanelJsonSchema.vue';
import type {SessionMode} from '@/store/sessionMode';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>

<template>
  <GuiEditorPanelJsonSchema class="h-full" :sessionMode="props.sessionMode" />
</template>

<style scoped></style>
