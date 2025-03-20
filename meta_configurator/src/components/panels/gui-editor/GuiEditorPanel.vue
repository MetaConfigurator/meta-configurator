<!-- Facade for GuiEditorPanelJsonSchema. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->

<script setup lang="ts">
import GuiEditorPanelJsonSchema from '@/components/panels/gui-editor/GuiEditorPanelJsonSchema.vue';
import type {SessionMode} from '@/store/sessionMode';
import {ScrollPanel} from 'primevue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>

<template>
  <ScrollPanel
  style="width:100%; height: 100%"
  :dt="{
        bar: {
            background: '{primary.color}'
        }
    }"
  >
  <GuiEditorPanelJsonSchema class="h-full" :sessionMode="props.sessionMode" />
  </ScrollPanel>
</template>

<style scoped></style>
