<script setup lang="ts">
import type {SessionMode} from '@/store/sessionMode';
import JsonSchemaDiagramPanel from '@/components/panels/schema-diagram/JsonSchemaDiagramPanel.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';

const props = defineProps<{
  sessionMode: SessionMode;
}>();
</script>

<template>
  <PanelSettings panel-name="Diagram View" :panel-settings-path="['schemaDiagram']">
    <p>
      This panel provides a visual representation of the current schema as a diagram. You can
      explore the structure of the schema, view relationships between different elements, and
      understand the overall architecture of the data model.
    </p>
    <p>
      The diagram is interactive, allowing you to zoom in and out, and click on elements to see more
      details.
    </p>
    <p>
      When the edit mode is enabled, you can also modify the schema directly from the diagram.
      Complex schema features (e.g. constraints) are not shown in the diagram. To see or edit them,
      switch to another view. Conditionals and composition are shown in the diagram, but they are
      not editable.
    </p>
  </PanelSettings>

  <JsonSchemaDiagramPanel class="h-full" :sessionMode="props.sessionMode" />
</template>

<style scoped></style>
