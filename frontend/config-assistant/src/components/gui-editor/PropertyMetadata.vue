<!-- left side of the table, showing the metadata of a property -->

<script setup lang="ts">
import type {ConfigDataTreeNodeType, ConfigTreeNodeData} from '@/model/ConfigDataTreeNode';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';
import type {Path} from '@/model/path';
import IconExpand from '@/components/icons/IconExpand.vue';
import {useSettingsStore} from '@/store/settingsStore';
import {generateTooltipText} from '@/helpers/propertyTooltipGenerator';
import {NUMBER_OF_PROPERTY_TYPES} from '@/model/JsonSchemaType';
import {useSessionStore} from '@/store/sessionStore';

const props = defineProps<{
  nodeData: ConfigTreeNodeData;
  type: ConfigDataTreeNodeType;
}>();

const emit = defineEmits<{
  (e: 'zoom_into_path', path_to_add: Path): void;
}>();

function isExpandable(): boolean {
  return props.nodeData.schema.hasType('object') || props.nodeData.schema.hasType('array');
}

function isRequired(): boolean {
  return props.nodeData.parentSchema?.isRequired(props.nodeData.name as string) || false;
}

function isDeprecated(): boolean {
  return props.nodeData.schema.deprecated;
}

function toggleExpand() {
  const settingsStore = useSettingsStore();
  if (props.nodeData.depth === settingsStore.settingsData.guiEditor.maximumDepth) {
    zoomIntoPath();
    return;
  }

  const store = useSessionStore();
  if (store.isExpanded(props.nodeData.absolutePath)) {
    store.collapse(props.nodeData.absolutePath);
  } else {
    store.expand(props.nodeData.absolutePath);
  }
}

function isAdditionalProperty(): boolean {
  return props.type === TreeNodeType.ADDITIONAL_PROPERTY;
}

function isPatternProperty(): boolean {
  return props.type === TreeNodeType.PATTERN_PROPERTY;
}

function zoomIntoPath() {
  if (isExpandable()) {
    emit('zoom_into_path', props.nodeData.relativePath);
  }
}

function getTypeDescription(): string {
  if (props.nodeData.schema.enum) {
    return 'enum';
  }
  if (props.nodeData.schema.oneOf.length > 0) {
    return 'oneOf';
  }

  const type = props.nodeData.schema.type;
  if (Array.isArray(type)) {
    if (type.length === NUMBER_OF_PROPERTY_TYPES) {
      return 'any';
    }
    return type.join(', ');
  }

  return type;
}
</script>

<template>
  <span class="flex flex-row w-full items-center">
    <span
      class="mr-2"
      :class="{'hover:underline': isExpandable()}"
      :tabindex="isExpandable() ? 0 : -1"
      @click="zoomIntoPath()"
      @keyup.enter="toggleExpand()"
      @dblclick="zoomIntoPath()"
      v-tooltip.bottom="generateTooltipText(props.nodeData)">
      <span
        :class="{
          'text-indigo-700': isExpandable(),
          'line-through': isDeprecated(),
          'font-semibold': isRequired(),
          italic: isAdditionalProperty() || isPatternProperty(),
        }">
        {{ nodeData.name }}
      </span>
      <!--Show red star after text if property is required -->
      <span class="text-red-600">{{ isRequired() ? '*' : '' }}</span>
    </span>

    <span class="text-xs text-gray-400">:&nbsp;{{ getTypeDescription() }}</span>
  </span>
</template>

<style scoped></style>
