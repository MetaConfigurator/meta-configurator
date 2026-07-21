<!-- left side of the table, showing the metadata of a property -->

<script setup lang="ts">
import type {
  ConfigDataTreeNodeType,
  GuiEditorTreeNode,
} from '@/components/panels/gui-editor/configDataTreeNode';
import type {Path} from '@/utility/path';
import {computed, ref} from 'vue';
import {arePathsEqual, pathToString} from '@/utility/pathUtils';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import 'primeicons/primeicons.css';
import {focus, makeEditableAndSelectContents} from '@/utility/focusUtils';
import {useSettings} from '@/settings/useSettings';
import type {SessionMode} from '@/store/sessionMode';
import {getSessionForMode, getUserSelectionForMode} from '@/data/useDataLink';
import type {ValidationResult} from '@/schema/validationUtils';
import {
  getDisplayNameOfNode,
  isDeprecated,
  isPropertyNameEditable,
  isRequiredProperty,
  isUseItalicFont,
} from './configTreeNodeReadingUtils';
import {getTypeDescription} from '@/schema/schemaReadingUtils';

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
  (e: 'reorder_array', parentRelativePath: Path, fromIndex: number, toIndex: number): void;
  (e: 'hover_metadata', event: MouseEvent): void;
  (e: 'unhover_metadata'): void;
}>();

// An array item is a node whose relative path ends in a numeric index (see PathElement).
const isArrayItem = computed(() => {
  const rp = props.node.data.relativePath as Path;
  return typeof rp[rp.length - 1] === 'number';
});
const arrayIndex = computed(
  () => props.node.data.relativePath[props.node.data.relativePath.length - 1] as number
);
const parentRelativePath = computed(() => props.node.data.relativePath.slice(0, -1));

// where a dragged item would land relative to this row, for the drop indicator
const dropPosition = ref<'' | 'before' | 'after'>('');

function onDragStart(event: DragEvent) {
  if (!isArrayItem.value) return;
  event.dataTransfer?.setData(
    'application/json',
    JSON.stringify({from: arrayIndex.value, parent: parentRelativePath.value})
  );
  event.dataTransfer?.setData('text/plain', ''); // needed for Firefox to start the drag
  event.dataTransfer!.effectAllowed = 'move';

  // The default drag image is only the draggable element (the narrow metadata cell), which omits
  // the value from the separate cell. Use the whole row instead, anchored at the cursor.
  const row = (event.currentTarget as HTMLElement).closest('tr');
  if (row) {
    const rect = row.getBoundingClientRect();
    event.dataTransfer!.setDragImage(row, event.clientX - rect.left, event.clientY - rect.top);
  }
}

function onDragOver(event: DragEvent) {
  if (!isArrayItem.value) return;
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';
  // drop above or below this row depending on which half the cursor is over, so an item can be
  // placed below the last row (dropping on the top half alone can never reach the bottom slot)
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  dropPosition.value = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

function onDragLeave() {
  dropPosition.value = '';
}

function onDrop(event: DragEvent) {
  const position = dropPosition.value;
  dropPosition.value = '';
  if (!isArrayItem.value) return;
  event.preventDefault();
  const payload = event.dataTransfer?.getData('application/json');
  if (!payload) return;
  const {from, parent} = JSON.parse(payload) as {from: number; parent: Path};
  // only reorder within the same parent array
  if (!arePathsEqual(parent, parentRelativePath.value)) return;
  // turn the before/after drop position into a final index, accounting for the slot the dragged
  // item vacates when it sits before the drop point
  const insertionPoint = position === 'after' ? arrayIndex.value + 1 : arrayIndex.value;
  const to = insertionPoint > from ? insertionPoint - 1 : insertionPoint;
  emit('reorder_array', parentRelativePath.value, from, to);
}

const settings = useSettings();
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
  if (props.node.data.depth === settings.value.guiEditor.maximumDepth) {
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

function updatePropertyName(event: KeyboardEvent | FocusEvent) {
  const target = event.target as HTMLElement;
  let text = target.innerText;

  // remove newlines from both sides
  text = text.trim();

  if (isPropertyNameEditable(props.type)) {
    emit('update_property_name', props.node.data.name as string, text);
  } else {
    target.innerText = String(props.node.data.name);
  }

  isEditingPropertyName.value = false;
  emit('stop_editing_property_name');
  target.contentEditable = 'false';
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
  <span
    class="flex flex-row w-full items-center"
    :class="{
      'select-none': isArrayItem,
      'drop-before': dropPosition === 'before',
      'drop-after': dropPosition === 'after',
    }"
    :draggable="isArrayItem"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @dragend="onDragLeave"
    @drop="onDrop">
    <span
      v-if="isArrayItem"
      class="pi pi-bars drag-handle mr-2 text-gray-400 cursor-grab"
      aria-hidden="true"></span>
    <!-- the schema info overlay is triggered only over this content region (its width fits the
         content), not the drag handle or the empty space in the rest of the cell -->
    <span
      class="flex flex-row items-center"
      @mouseenter="event => emit('hover_metadata', event)"
      @mouseleave="emit('unhover_metadata')">
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
          @keydown.enter.prevent="updatePropertyName"
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
        <span class="text-red-600" data-testid="required-star">{{
          isRequiredProperty(node.data) ? '*' : ''
        }}</span>
      </span>

      <span class="text-xs text-gray-400">:&nbsp;{{ getTypeDescription(node.data.schema) }}</span>
      <span
        class="pi pi-pencil ml-3 text-indigo-700"
        v-if="isPropertyNameEditable(props.type) && showPencil"
        @click="focusOnPropertyLabel()"></span>
      <span class="text-red-600 ml-3" v-if="isInvalid()" data-testid="validation-error-icon">
        <FontAwesomeIcon icon="triangle-exclamation" />
      </span>
    </span>
  </span>
</template>

<style scoped>
.drag-handle:active {
  cursor: grabbing;
}
/* insertion feedback while dragging an item over another row */
.drop-before {
  box-shadow: inset 0 2px 0 0 var(--p-primary-color, #4338ca);
}
.drop-after {
  box-shadow: inset 0 -2px 0 0 var(--p-primary-color, #4338ca);
}
</style>
