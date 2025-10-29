<!-- Facade for CodeEditorPanel. Higher level code does not need to know about any details
 of this panel. When the panel or underlying editor changes, the changes can be applied here
 and the main view does not need to know about any of that. -->
<template>
  <PanelSettings panel-name="RDF View" :panel-settings-path="['codeEditor']">
    <p>
      This panel enables you to convert data in JSON or JSON-LD format into RDF.
      If your data is in plain JSON, please first convert it to JSON-LD using the Utility Toolbar.
      Using AI, this tool then transforms your JSON-LD data into RDF through the RML Mapping Language.
    </p>
  </PanelSettings>
  <RdfEditorPanel :sessionMode="props.sessionMode" />
</template>

<script setup lang="ts">
import RdfEditorPanel from '@/components/panels/rdf/RdfEditorPanel.vue';
import {SessionMode} from '@/store/sessionMode';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>
