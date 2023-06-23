<template>
  <div>
    <Splitter>
      <!-- Left panel for the GUI editor -->
      <SplitterPanel>
        <AceEditor />
      </SplitterPanel>

      <!-- Right panel for the text editor -->
      <SplitterPanel class="flex align-items-center justify-content-center" :size="80">
        <GuiEditorPanel />
      </SplitterPanel>

    </Splitter>
  </div>
</template>

<script setup lang="ts">
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import GuiEditorPanel from "@/components/gui-editor/JsonSchemaGuiEditorPanel.vue";
import AceEditor from "@/components/code-editor/AceEditor.vue";


</script>
