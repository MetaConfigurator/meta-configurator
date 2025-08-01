<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->
<template>
  <PanelSettings panel-name="Text View" :panel-settings-path="['codeEditor']">
    <p>
      This panel allows you to view and edit the raw JSON/YAML/XML data of the current document. It
      is useful for advanced users who want to directly manipulate the data structure.
    </p>
  </PanelSettings>
  <AceEditor :sessionMode="props.sessionMode" />
</template>

<script setup lang="ts">
import AceEditor from '@/components/panels/code-editor/AceEditor.vue';
import {SessionMode} from '@/store/sessionMode';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>
