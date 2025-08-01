<!--
Component for displaying the current path in the GUI editor
and allowing the user to jump to a parent path.
-->
<script setup lang="ts">
import {computed} from 'vue';
import type {Path} from '@/utility/path';
import {SessionMode} from '@/store/sessionMode';
import Panel from 'primevue/panel';
import PropertiesPanel from '@/components/panels/gui-editor/PropertiesPanel.vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';

const props = defineProps<{
  panelName: string;
  panelSettingsPath: Path;
}>();

const schema = getSchemaForMode(SessionMode.Settings);
const data = getDataForMode(SessionMode.Settings);

const currentSchema = computed(() => {
  const currSchema = schema.effectiveSchemaAtPath(props.panelSettingsPath).schema;
  if (!currSchema) {
    return new JsonSchemaWrapper({}, SessionMode.Settings, false);
  }
  return currSchema;
});

function updateData(path: Path, newValue: any) {
  data.setDataAt(path, newValue);
}

function removeProperty(path: Path) {
  data.removeDataAt(path);
}

const emit = defineEmits<{
  (e: 'update:path', newPath: Path): void;
}>();
</script>

<template>
  <Panel :header="panelName" toggleable :collapsed="true">
    <slot></slot>

    <div class="properties-panel-container">
      <PropertiesPanel
        v-if="currentSchema.jsonSchema"
        :table-header="panelName + ' Settings'"
        :currentSchema="currentSchema"
        :currentPath="props.panelSettingsPath"
        :currentData="data.dataAt(props.panelSettingsPath)"
        :sessionMode="SessionMode.Settings"
        @remove_property="
          {
            removeProperty;
          }
        "
        @update_data="updateData" />
    </div>
  </Panel>
</template>

<style scoped>
.properties-panel-container {
  padding-top: 1.5rem;
}
</style>
