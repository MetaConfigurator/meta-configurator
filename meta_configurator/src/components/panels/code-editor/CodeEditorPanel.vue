<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->
<template>
  <AceEditor :sessionMode="props.sessionMode" :dataFormat="props.dataFormat ? props.dataFormat : useSettings().value.dataFormat"/>
</template>

<script setup lang="ts">
import AceEditor from '@/components/panels/code-editor/AceEditor.vue';
import {SessionMode} from '@/store/sessionMode';
import type {DataFormat} from "@/settings/settingsTypes";
import {useSettings} from "@/settings/useSettings";

const props = defineProps<{
  sessionMode: SessionMode;
  dataFormat?: DataFormat;
}>();
</script>
