<script setup lang="ts">
import {ref, watch} from 'vue';
import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

import type {JsonSchema} from '@/helpers/schema/JsonSchema';
import PropertyData from '@/components/gui-editor/PropertyData.vue';
import PropertyMetadata from '@/components/gui-editor/PropertyMetadata.vue';
import {ConfigTreeNodeResolver} from '@/helpers/ConfigTreeNodeResolver';
import type {Path, PathElement} from '@/model/path';
import {GuiConstants} from '@/constants';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';
import {storeToRefs} from 'pinia';
import {useSessionStore} from '@/store/sessionStore';
import {pathToString} from '@/helpers/pathHelper';
import {refDebounced} from '@vueuse/core';

const props = defineProps<{
  currentSchema: JsonSchema;
  currentData: any;
  currentPath: Path;
}>();

const emit = defineEmits<{
  (e: 'update_current_path', new_path: Path): void;
  (e: 'zoom_into_path', path_to_add: Path): void;
  (e: 'update_data', path: Path, newValue: any): void;
}>();

const treeNodeResolver = new ConfigTreeNodeResolver();

const loading = ref(false);
const loadingDebounced = refDebounced(loading, 100);

function computeTree() {
  const root = treeNodeResolver.createTreeNodeOfProperty(
    props.currentSchema?.title ?? 'root',
    props.currentSchema,
    undefined,
    props.currentPath
  );
  root.children = treeNodeResolver.createChildNodesOfNode(root);
  return root;
}

function updateTree() {
  loadingDebounced.value = true;
  console.log(loading.value);
  window.setTimeout(() => {
    nodesToDisplay.value = computeTree().children;
    loadingDebounced.value = false;
  }, 0);
}

const nodesToDisplay = ref(computeTree().children);

watch(storeToRefs(useSessionStore()).fileSchema, updateTree);

const treeTableFilters = ref<Record<string, string>>({});
const {currentExpandedElements} = storeToRefs(useSessionStore());

function updateData(subPath: Path, newValue: any) {
  const completePath = props.currentPath.concat(subPath);
  emit('update_data', completePath, newValue);
}

function focus(id: string) {
  window.setTimeout(function () {
    const element = document.getElementById(id);
    if (element) {
      element.focus();
    }
  }, 0);
}

function addItem(relativePath: Path, newValue: any) {
  updateData(relativePath, newValue);
  const absolutePath = props.currentPath.concat(relativePath);

  const subSchema = props.currentSchema.subSchemaAt(relativePath);
  if (subSchema?.hasType('object') || subSchema?.hasType('array')) {
    useSessionStore().expand(absolutePath);

    focusOnFirstPropertyOfSchema(absolutePath);
    return;
  }

  // focus on "add item" element (which id is the path of the array + 1
  // on the last element of the path)
  const pathToAddItem = relativePath.slice(0, -1).concat(relativePath[relativePath.length - 1] + 1);
  focus(pathToString(props.currentPath.concat(pathToAddItem)));
}

function focusOnFirstPropertyOfSchema(absolutePath: Path) {
  const dataAtPath = useSessionStore().dataAtPath(absolutePath);
  const subSchema = useSessionStore().schemaAtPath(absolutePath);

  let firstPropertyOfObject: PathElement =
    Object.keys(subSchema?.properties)[0] ?? Object.keys(dataAtPath)[0];
  if (Array.isArray(dataAtPath)) {
    // if the data is an array, the first property is the index of the array
    // (which is a number)
    firstPropertyOfObject = 0;
  }
  const pathToFirstProperty = absolutePath.concat(firstPropertyOfObject);

  focus(pathToString(pathToFirstProperty));
}

/**
 * Function for adding a default value to an array.
 * This function is called when the user clicks on the "add item" button.
 */
function addDefaultValue(relativePath: Path) {
  const arraySchema = props.currentSchema.subSchemaAt(relativePath.slice(0, -1));

  if (!arraySchema?.items) {
    console.log('addDefaultValue called on array schema without items');
    // TODO: handle this case
    return {};
  }
  if (arraySchema.items.hasType('object')) {
    addItem(relativePath, {});
  } else if (arraySchema.items.hasType('array')) {
    addItem(relativePath, []);
  } else if (arraySchema.items.hasType('string')) {
    addItem(relativePath, '');
  } else if (arraySchema.items.hasType('number') || arraySchema.items.hasType('integer')) {
    addItem(relativePath, 0);
  } else if (arraySchema.items.hasType('boolean')) {
    addItem(relativePath, false);
  }
}

/**
 * Returns a style object that adds negative margin to the table cells,
 * depending on the depth of the tree node.
 * This is required to make the table look like a table.
 *
 * @param depth depth of the tree node
 */
function addNegativeMarginForTableStyle(depth: number) {
  return {'margin-right': `${-depth * GuiConstants.INDENTATION_STEP}px`};
}

watch(storeToRefs(useSessionStore()).currentPath, (path: Path) => {
  updateTree();
  focusOnFirstPropertyOfSchema(path);
});

function displayAsDefaultProperty(node: any) {
  return (
    node.type === TreeNodeType.PATTERN_PROPERTY ||
    node.type === TreeNodeType.SCHEMA_PROPERTY ||
    node.type === TreeNodeType.ADDITIONAL_PROPERTY
  );
}

function expandElement(node: any) {
  currentExpandedElements[node.key] = true;
  node.children = treeNodeResolver.createChildNodesOfNode(node);
  console.log('expandElement', node);
}
</script>

<template>
  <TreeTable
    :value="nodesToDisplay"
    filter-mode="lenient"
    removable-sort
    resizable-columns
    scrollable
    scroll-direction="vertical"
    scroll-height="flex"
    row-hover
    :lazy="true"
    :loading="loading"
    :expandedKeys="currentExpandedElements"
    @nodeExpand="expandElement"
    @nodeCollapse="node => delete currentExpandedElements[node.key]"
    :filters="treeTableFilters">
    <!-- Filter field -->
    <template #header>
      <div class="text-left">
        <div class="p-input-icon-left w-full">
          <i class="pi pi-search" />
          <InputText
            v-model="treeTableFilters['global']"
            placeholder="Search for properties or data"
            class="h-8 w-80" />
        </div>
      </div>
    </template>
    <Column field="name" header="Property" :sortable="true" expander>
      <template #body="slotProps">
        <!-- data nodes, note: wrapping in another span breaks the styling completely -->
        <span
          v-if="displayAsDefaultProperty(slotProps.node)"
          style="width: 50%; min-width: 50%"
          :style="addNegativeMarginForTableStyle(slotProps.node.data.depth)">
          <PropertyMetadata
            :nodeData="slotProps.node.data"
            :type="slotProps.node.type"
            @zoom_into_path="path_to_add => $emit('zoom_into_path', path_to_add)" />
        </span>

        <span v-if="displayAsDefaultProperty(slotProps.node)" style="max-width: 50%" class="w-full">
          <PropertyData
            class="w-full"
            :nodeData="slotProps.node.data"
            @update_property_value="updateData"
            bodyClass="w-full" />
        </span>

        <!-- special tree nodes -->
        <span
          v-if="slotProps.node.type === TreeNodeType.ADD_ITEM"
          style="width: 50%; min-width: 50%"
          :style="addNegativeMarginForTableStyle(slotProps.node.data.depth)">
          <Button
            text
            severity="secondary"
            class="text-gray-500"
            style="margin-left: -0.75rem"
            @click="addDefaultValue(slotProps.node.data.relativePath)"
            @keyup.enter="addDefaultValue(slotProps.node.data.relativePath)">
            <i class="pi pi-plus" />
            <span class="pl-2">Add item</span>
          </Button>
        </span>

        <span
          v-if="slotProps.node.type === TreeNodeType.ADD_ITEM"
          style="max-width: 50%"
          class="w-full">
          <PropertyData
            class="w-full"
            :nodeData="slotProps.node.data"
            @update_property_value="addItem"
            bodyClass="w-full" />
        </span>
      </template>
    </Column>
  </TreeTable>
</template>

<style scoped>
/* The following lines make the table cells take less space */
:deep(.p-treetable-tbody > tr > td) {
  padding: 0.1rem 0.5rem;
}

:deep(.p-treetable-header) {
  padding: 0.5rem 0.5rem;
}

:deep(.p-treetable-thead > tr > th) {
  padding: 0.5rem 0.5rem;
}

/* Prevent the expander from being cut off */
:deep(.p-treetable-toggler) {
  overflow: visible !important;
}

:deep(.p-button) {
  padding: 0 0.5rem;
}

:deep(.p-button-label) {
  font-weight: 500;
}
</style>
