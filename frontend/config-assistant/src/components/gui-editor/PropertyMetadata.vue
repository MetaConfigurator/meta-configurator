<!-- left side of the table, showing the metadata of a property -->

<script setup lang="ts">
import type {ConfigDataTreeNodeType, GuiEditorTreeNode} from '@/model/ConfigDataTreeNode';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';
import type {Path} from '@/model/path';
import {useSettingsStore} from '@/store/settingsStore';
import {NUMBER_OF_PROPERTY_TYPES} from '@/model/JsonSchemaType';
import {useSessionStore} from '@/store/sessionStore';
import {ref} from 'vue';
import type {ValidationResults} from '@/helpers/validationService';

const props = defineProps<{
  node: GuiEditorTreeNode;
  type: ConfigDataTreeNodeType;
  validationResults: ValidationResults;
}>();

const emit = defineEmits<{
  (e: 'zoom_into_path', path_to_add: Path): void;
  (e: 'update_property_name', old_name: string, new_name: string): void;
  (e: 'start_editing_property_name'): void;
  (e: 'stop_editing_property_name'): void;
}>();

const isEditingPropertyName = ref(false);

function canZoomIn(): boolean {
  if (isEditingPropertyName.value) {
    return false;
  }
  const schema = props.node.data.schema;

  const dependsOnUserSelection = schema.anyOf.length > 0 || schema.oneOf.length > 0;
  if (dependsOnUserSelection) {
    const hasUserSelection = schema.userSelectionOneOfAnyOf;
    if (!hasUserSelection) {
      return false;
    }
  }

  return schema.hasType('object') || schema.hasType('array');
}

function isRequired(): boolean {
  return props.node.data.parentSchema?.isRequired(props.node.data.name as string) || false;
}

function isDeprecated(): boolean {
  return props.node.data.schema.deprecated;
}

function toggleExpand() {
  const settingsStore = useSettingsStore();
  if (props.node.data.depth === settingsStore.settingsData.guiEditor.maximumDepth) {
    zoomIntoPath();
    return;
  }

  const store = useSessionStore();
  if (store.isExpanded(props.node.data.absolutePath)) {
    store.collapse(props.node.data.absolutePath);
  } else {
    store.expand(props.node.data.absolutePath);
  }
}

function isAdditionalProperty(): boolean {
  return props.type === TreeNodeType.ADDITIONAL_PROPERTY;
}

function isPatternProperty(): boolean {
  return props.type === TreeNodeType.PATTERN_PROPERTY;
}

function zoomIntoPath() {
  if (canZoomIn()) {
    emit('zoom_into_path', props.node.data.relativePath);
  }
}

function isPropertyNameEditable(): boolean {
  if (!props.node.data.parentSchema?.hasType('object')) {
    return false;
  }
  if (!props.node.data.parentSchema?.properties) {
    return true;
  }
  return !Object.keys(props.node.data.parentSchema.properties).includes(
    props.node.data.name as string
  );
}

function updatePropertyName(event) {
  if (isPropertyNameEditable()) {
    emit('update_property_name', props.node.data.name as string, event.target.innerText);
  } else {
    event.target.innerText = props.node.data.name;
  }
  isEditingPropertyName.value = false;
  emit('stop_editing_property_name');
  event.target.contenteditable = false;
}

function getTypeDescription(): string {
  if (props.node.data.schema.enum) {
    return 'enum';
  }
  if (props.node.data.schema.oneOf.length > 0) {
    return 'oneOf';
  }
  if (props.node.data.schema.anyOf.length > 0) {
    return 'anyOf';
  }

  const type = props.node.data.schema.type;
  if (Array.isArray(type)) {
    if (type.length === NUMBER_OF_PROPERTY_TYPES) {
      return 'any';
    }
    return type.join(', ');
  }

  return type;
}

function getId(): string {
  return '_label_' + props.node.key;
}

function focusEditingLabel() {
  if (isPropertyNameEditable()) {
    isEditingPropertyName.value = true;
    emit('start_editing_property_name');
  }
}
</script>

<template>
  <span class="flex flex-row w-full items-center">
    <span
      class="mr-2"
      :class="{'hover:underline': canZoomIn()}"
      :tabindex="canZoomIn() ? 0 : -1"
      @click="
        isPropertyNameEditable()
          ? event => {
              event.target.contenteditable = true;
            }
          : zoomIntoPath()
      "
      @keyup.enter="toggleExpand()"
      @dblclick="zoomIntoPath()">
      <span
        :contenteditable="isPropertyNameEditable()"
        :id="getId()"
        @focus="() => focusEditingLabel()"
        @blur="updatePropertyName"
        @keyup.enter="updatePropertyName"
        :class="{
          'text-indigo-700': canZoomIn(),
          'underline decoration-wavy decoration-red-600': !props.validationResults.valid,
          'line-through': isDeprecated(),
          italic: isAdditionalProperty() || isPatternProperty(),
        }">
        {{ node.data.name }}
      </span>
      <!--Show red star after text if property is required -->
      <span class="text-red-600">{{ isRequired() ? '*' : '' }}</span>
    </span>

    <span class="text-xs text-gray-400">:&nbsp;{{ getTypeDescription() }}</span>
  </span>
</template>

<style scoped></style>
