<!-- Facade for MarkdownSchemaEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->
<template>
  <MdModelsPanel :sessionMode="props.sessionMode" />
</template>

<script setup lang="ts">
import {SessionMode} from '@/store/sessionMode';
import MdModelsPanel from "@/components/panels/markdown-schema-editor/MdModelsPanel.vue";

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>
