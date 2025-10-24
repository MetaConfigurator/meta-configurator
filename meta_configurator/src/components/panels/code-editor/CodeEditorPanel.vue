<template>
  <div class="panel-container">
    <PanelSettings panel-name="Text View" :panel-settings-path="['codeEditor']">
      <p>
        This panel allows you to view and edit the raw JSON/YAML/XML data of the current document.
        It is useful for advanced users who want to directly manipulate the data structure.
      </p>
    </PanelSettings>
    <div class="panel-content">
      <AceEditor :sessionMode="props.sessionMode" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AceEditor from '@/components/panels/code-editor/AceEditor.vue';
import {SessionMode} from '@/store/sessionMode';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>

<style scoped>
.panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.panel-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
