<!-- left side of the table, showing the metadata of a property -->

<script setup lang="ts">
import type {
  ConfigDataTreeNodeType,
  GuiEditorTreeNode,
} from '@/components/gui-editor/configDataTreeNode';
import {TreeNodeType} from '@/components/gui-editor/configDataTreeNode';
import type {Path, PathElement} from '@/utility/path';
import {NUMBER_OF_PROPERTY_TYPES} from '@/schema/jsonSchemaType';
import {ref} from 'vue';
import {pathToString} from '@/utility/pathUtils';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import 'primeicons/primeicons.css';
import {focus, makeEditableAndSelectContents} from '@/utility/focusUtils';
import {useSettings} from '@/settings/useSettings';
import type {SessionMode} from '@/store/sessionMode';
import {getSessionForMode, getUserSelectionForMode} from '@/data/useDataLink';
import type {ValidationResult} from '@/schema/validationService';
import {
  getDisplayNameOfNode,
  getTypeDescription,
  isAdditionalProperty,
  isDeprecated,
  isPatternProperty,
  isPropertyNameEditable,
  isRequiredProperty,
  isUseItalicFont,
} from './configTreeNodeReadingUtils';

const props = defineProps<{
  node: GuiEditorTreeNode;
  type: ConfigDataTreeNodeType;
  highlighted: boolean;
  validationResults: ValidationResult;
  sessionMode: SessionMode;
}>();

const emit = defineEmits<{
  (e: 'zoom_into_path', path_to_add: Path): void;
  (e: 'update_property_name', old_name: string, new_name: string): void;
  (e: 'start_editing_property_name'): void;
  (e: 'stop_editing_property_name'): void;
}>();

const isEditingPropertyName = ref(false);
const showPencil = ref(true);

/**
 * Determines whether the user can zoom into the property.
 * This is the case if the property is an object or array,
 * or if the property is a oneOf or anyOf property and the user has selected one of the options.
 */
function canZoomIn(): boolean {
  if (isEditingPropertyName.value) {
    return false;
  }
  const schema = props.node.data.schema;

  const dependsOnUserSelection = schema.anyOf.length > 0 || schema.oneOf.length > 0;
  if (dependsOnUserSelection) {
    const path = pathToString(props.node.data.absolutePath);
    const hasUserSelectionOneOf = getUserSelectionForMode(
      props.sessionMode
    ).currentSelectedOneOfOptions.value.has(path);
    const hasUserSelectionAnyOf = getUserSelectionForMode(
      props.sessionMode
    ).currentSelectedAnyOfOptions.value.has(path);
    return hasUserSelectionOneOf || hasUserSelectionAnyOf;
  }

  return schema.hasType('object') || schema.hasType('array');
}

/**
 * Either toggles the expansion state of the node or zooms into the node,
 * depending on if the maximum depth has been reached or not.
 */
function onPressEnter() {
  if (props.node.data.depth === useSettings().guiEditor.maximumDepth) {
    zoomIntoPath();
    return;
  }

  const session = getSessionForMode(props.sessionMode);
  if (session.isExpanded(props.node.data.absolutePath)) {
    session.collapse(props.node.data.absolutePath);
  } else {
    session.expand(props.node.data.absolutePath);
  }
}

function zoomIntoPath() {
  if (canZoomIn()) {
    emit('zoom_into_path', props.node.data.relativePath);
  }
}

function updatePropertyName(event) {
  const target = event.target as HTMLElement;
  let text = target.innerText;

  // remove newlines from both sides
  text = text.trim();

  if (isPropertyNameEditable(props.type)) {
    emit('update_property_name', props.node.data.name as string, text);
  } else {
    event.target.innerText = props.node.data.name;
  }

  isEditingPropertyName.value = false;
  emit('stop_editing_property_name');
  event.target.contenteditable = false;
  showPencil.value = true;
}

function getId(): string {
  return '_label_' + props.node.key;
}

function focusEditingLabel(): void {
  if (isPropertyNameEditable(props.type) && isEditingPropertyName.value) {
    emit('start_editing_property_name');
  }
}

function isInvalid(): boolean {
  return !props.validationResults.valid;
}

/**
 * Focuses the property label and makes it editable.
 */
function focusOnPropertyLabel(): void {
  isEditingPropertyName.value = true;
  const id: string = getId();
  const element: HTMLElement | null = document.getElementById(id);

  if (!element) return;

  showPencil.value = false;
  focus(id);
  makeEditableAndSelectContents(id);
}
</script>

<template>
  <span class="flex flex-row w-full items-center">
    <span
      class="mr-2"
      :class="{'hover:underline cursor-pointer': canZoomIn(), 'bg-yellow-100': highlighted}"
      :tabindex="canZoomIn() ? 0 : -1"
      @keyup.enter="onPressEnter()"
      @click="zoomIntoPath()">
      <span
        :contenteditable="isPropertyNameEditable(props.type) && isEditingPropertyName"
        :id="getId()"
        @focus="focusEditingLabel()"
        @keydown.stop
        @blur="updatePropertyName"
        @keyup.enter="updatePropertyName"
        class="scroll-my-60 snap-start"
        :class="{
          'text-indigo-700': canZoomIn(),
          'underline decoration-wavy decoration-red-600': isInvalid(),
          'line-through': isDeprecated(props.node.data.schema),
          italic: isUseItalicFont(props.type),
        }">
        {{ getDisplayNameOfNode(props.node) }}
      </span>
      <!--Show red star after text if property is required -->
      <span class="text-red-600">{{ isRequiredProperty(node.data) ? '*' : '' }}</span>
    </span>

    <span class="text-xs text-gray-400">:&nbsp;{{ getTypeDescription(node.data) }}</span>
    <span
      class="pi pi-pencil ml-3 text-indigo-700"
      v-if="isPropertyNameEditable(props.type) && showPencil"
      @click="focusOnPropertyLabel()"></span>
    <span class="text-red-600 ml-3" v-if="isInvalid()">
      <FontAwesomeIcon icon="triangle-exclamation" />
    </span>
  </span>
</template>

<style scoped></style>
