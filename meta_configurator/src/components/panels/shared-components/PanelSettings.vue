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
import {useSettings} from '@/settings/useSettings.ts';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';

const props = defineProps<{
  panelDisplayName: string;
  panelType: string;
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
  return props.panelType == "textEditor";
});

const settingsName = computed(() => {
  if (props.settingsHeader && props.settingsHeader !== '') {
    return props.settingsHeader;
  }
  if (!props.panelDisplayName || props.panelDisplayName === '') {
    return 'Settings';
  }
  if (props.panelDisplayName.toLowerCase().includes('settings')) {
    return props.panelDisplayName;
  }
  return props.panelDisplayName + ' Settings';
});

function hideView() {
  const mode = props.sessionMode;
  const settings = useSettings().value;
  settings.panels[mode] = settings.panels[mode].filter(panel => panel.panelType !== props.panelType);
}

</script>

<template>
  <Panel :header="panelDisplayName" toggleable :collapsed="true" class="panel-settings-scroll">
    <template #icons>

      <Button
        v-if="containsText"
        text
        severity="secondary"
        v-tooltip.left="'Copy text to clipboard'"
        @click="copyToClipboard()">
        <FontAwesomeIcon icon="fa-regular fa-clone" />
      </Button>

      <Button
        text
        severity="secondary"
        v-tooltip.left="'Hide view'"
        @click="hideView()">
        <FontAwesomeIcon icon="fa-solid fa-eye-slash" />
      </Button>

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
.panel-settings-scroll {
  max-height: 80vh;
  overflow-y: auto;
}
.properties-panel-container {
  padding-top: 1.5rem;
}
</style>
