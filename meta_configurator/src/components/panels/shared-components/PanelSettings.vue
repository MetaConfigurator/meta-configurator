<!--
Component for displaying the current path in the GUI editor
and allowing the user to jump to a parent path.
-->
<script setup lang="ts">
import {computed} from 'vue';
import type {Path} from '@/utility/path';
import {SessionMode} from '@/store/sessionMode';
import Panel from 'primevue/panel';
import Button from 'primevue/button';
import PropertiesPanel from '@/components/panels/gui-editor/PropertiesPanel.vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';

const props = defineProps<{
  panelName: string;
  settingsHeader?: string;
  panelSettingsPath: Path;
  sessionMode: SessionMode;
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

const copyToClipboard = async () => {
  if (props.sessionMode === SessionMode.Settings) return;

  try {
    const text = getDataForMode(props.sessionMode).unparsedData.value;
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

const containsText = computed(() => {
  return ['Text View', 'Documentation View'].includes(props.panelName);
});

const settingsName = computed(() => {
  if (props.settingsHeader && props.settingsHeader !== '') {
    return props.settingsHeader;
  }
  if (!props.panelName || props.panelName === '') {
    return 'Settings';
  }
  if (props.panelName.toLowerCase().includes('settings')) {
    return props.panelName;
  }
  return props.panelName + ' Settings';
});
</script>

<template>
  <Panel :header="panelName" toggleable :collapsed="true">
    <template v-if="containsText" #icons>
      <Button icon="pi pi-clone" @click="copyToClipboard" rounded text />
    </template>
    <slot></slot>
    <div class="properties-panel-container">
      <PropertiesPanel
        v-if="currentSchema.jsonSchema"
        :table-header="settingsName"
        :currentSchema="currentSchema"
        :currentPath="props.panelSettingsPath"
        :currentData="data.dataAt(props.panelSettingsPath)"
        :sessionMode="SessionMode.Settings"
        @remove_property="removeProperty"
        @update_data="updateData" />
    </div>
  </Panel>
</template>

<style scoped>
.properties-panel-container {
  padding-top: 1.5rem;
}
</style>
