<!-- left side of the table, showing the metadata of a property -->

<script setup lang="ts">
import type {
  ConfigDataTreeNodeType,
  GuiEditorTreeNode,
} from '@/components/gui-editor/configDataTreeNode';
import {TreeNodeType} from '@/components/gui-editor/configDataTreeNode';
import type {Path, PathElement} from '@/utility/path';
import {NUMBER_OF_PROPERTY_TYPES} from '@/schema/jsonSchemaType';
import {useSessionStore} from '@/store/sessionStore';
import {ref} from 'vue';
import type {ValidationResult} from '@/schema/validation/validationService';
import {pathToString} from '@/utility/pathUtils';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import 'primeicons/primeicons.css';
import {focus, makeEditableAndSelectContents} from '@/utility/focusUtils';
import {useSettings} from '@/settings/useSettings';
import {useUserSchemaSelectionStore} from '@/store/userSchemaSelectionStore';

const props = defineProps<{
  node: GuiEditorTreeNode;
  type: ConfigDataTreeNodeType;
  highlighted: boolean;
  validationResults: ValidationResult;
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
    const hasUserSelectionOneOf =
      useUserSchemaSelectionStore().currentSelectedOneOfOptions.has(path);
    const hasUserSelectionAnyOf =
      useUserSchemaSelectionStore().currentSelectedAnyOfOptions.has(path);
    return hasUserSelectionOneOf || hasUserSelectionAnyOf;
  }

  return schema.hasType('object') || schema.hasType('array');
}

function isRequired(): boolean {
  return props.node.data.parentSchema?.isRequired(props.node.data.name as string) || false;
}

function isDeprecated(): boolean {
  return props.node.data.schema.deprecated;
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
  return isAdditionalProperty() || isPatternProperty();
}

function updatePropertyName(event) {
  const target = event.target as HTMLElement;
  let text = target.innerText;

  // remove newlines from both sides
  text = text.trim();

  if (isPropertyNameEditable()) {
    emit('update_property_name', props.node.data.name as string, text);
  } else {
    event.target.innerText = props.node.data.name;
  }

  isEditingPropertyName.value = false;
  emit('stop_editing_property_name');
  event.target.contenteditable = false;
  showPencil.value = true;
}

/**
 * Returns a string representation of the type of the property.
 * This does not necessarily match one of the JSON schema types,
 * e.g, it returns 'enum' if the property has an enum.
 */
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

function focusEditingLabel(): void {
  if (isPropertyNameEditable() && isEditingPropertyName.value) {
    emit('start_editing_property_name');
  }
}

function getDisplayNameOfNode(node: GuiEditorTreeNode): string {
  const name: PathElement = node.data.name;
  if (name === '') {
    return node.data.parentSchema?.title || 'root'; // no name should only happen for the root node
  }
  if (typeof name === 'string') {
    return name;
  }
  // array index
  return (node.data.parentName || node.data.parentSchema?.title || 'element') + '[' + name + ']';
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
        :contenteditable="isPropertyNameEditable() && isEditingPropertyName"
        :id="getId()"
        @focus="focusEditingLabel()"
        @keydown.stop
        @blur="updatePropertyName"
        @keyup.enter="updatePropertyName"
        class="scroll-my-60 snap-start"
        :class="{
          'text-indigo-700': canZoomIn(),
          'underline decoration-wavy decoration-red-600': isInvalid(),
          'line-through': isDeprecated(),
          italic: isAdditionalProperty() || isPatternProperty(),
        }">
        {{ getDisplayNameOfNode(props.node) }}
      </span>
      <!--Show red star after text if property is required -->
      <span class="text-red-600">{{ isRequired() ? '*' : '' }}</span>
    </span>

    <span class="text-xs text-gray-400">:&nbsp;{{ getTypeDescription() }}</span>
    <span
      class="pi pi-pencil ml-3 text-indigo-700"
      v-if="isPropertyNameEditable() && showPencil"
      @click="focusOnPropertyLabel()"></span>
    <span class="text-red-600 ml-3" v-if="isInvalid()">
      <FontAwesomeIcon icon="triangle-exclamation" />
    </span>
  </span>
</template>

<style scoped></style>
