<!-- Facade for GuiEditorPanelJsonSchema. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->

<script setup lang="ts">
import GuiEditorPanelJsonSchema from '@/components/panels/gui-editor/GuiEditorPanelJsonSchema.vue';
import type {SessionMode} from '@/store/sessionMode';
import {ScrollPanel} from 'primevue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import SchemaInfoPanel from '@/components/panels/gui-editor/SchemaInfoPanel.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>

<template>
  <div class="panel-container">
    <div class="gui-panel">
      <PanelSettings panel-name="GUI View" :panel-settings-path="['guiEditor']">
        <p>
          This panel allows you to view and edit the current document in a GUI format. You can
          navigate through the document tree, view properties, and modify data directly.
        </p>
        <br />
        <p>
          Hint: Click on a object property name to navigate into that object or expand it to view
          its properties.
        </p>
        <br />
        <p>The GUI is generated based on the following schema:</p>
        <SchemaInfoPanel :sessionMode="props.sessionMode" />
      </PanelSettings>

      <div class="panel-content">
        <ScrollPanel
          style="width: 100%; height: 100%"
          :dt="{
            bar: {
              background: '{primary.color}',
            },
          }">
          <GuiEditorPanelJsonSchema :sessionMode="props.sessionMode" />
        </ScrollPanel>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gui-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

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
