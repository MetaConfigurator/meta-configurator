<script setup lang="ts">
import type {Ref} from 'vue';
import {ref, watch} from 'vue';
import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';
import Button from 'primevue/button';

import {JsonSchema} from '@/helpers/schema/JsonSchema';
import PropertyData from '@/components/gui-editor/PropertyData.vue';
import PropertyMetadata from '@/components/gui-editor/PropertyMetadata.vue';
import {ConfigTreeNodeResolver} from '@/components/gui-editor/ConfigTreeNodeResolver';
import type {Path} from '@/model/path';
import {GuiConstants} from '@/constants';
import {
  ConfigDataTreeNode,
  ConfigTreeNodeData,
  GuiEditorTreeNode,
  TreeNodeType,
} from '@/model/ConfigDataTreeNode';
import {storeToRefs} from 'pinia';
import {useSessionStore} from '@/store/sessionStore';
import {dataAt, pathToJsonPointer, pathToString} from '@/helpers/pathHelper';
import SchemaInfoOverlay from '@/components/gui-editor/SchemaInfoOverlay.vue';
import {refDebounced, useDebounceFn} from '@vueuse/core';
import type {TreeNode} from 'primevue/tree';
import {focus, focusOnPath, selectContents} from '@/helpers/focusUtils';

const props = defineProps<{
  currentSchema: JsonSchema;
  currentData: any;
  currentPath: Path;
}>();

const emit = defineEmits<{
  (e: 'update_current_path', new_path: Path): void;
  (e: 'zoom_into_path', path_to_add: Path): void;
  (e: 'select_path', path: Path): void;
  (e: 'update_data', path: Path, newValue: any): void;
  (e: 'remove_property', path: Path): void;
}>();

const treeNodeResolver = new ConfigTreeNodeResolver();

const loading = ref(false);
const loadingDebounced = refDebounced(loading, 100);

const treeTableFilters = ref<Record<string, string>>({});
const {currentExpandedElements} = storeToRefs(useSessionStore());

const currentTree = ref({});

function computeTree() {
  currentTree.value = treeNodeResolver.createTreeNodeOfProperty(
    props.currentSchema,
    undefined,
    props.currentPath
  );
  currentTree.value.children = treeNodeResolver.createChildNodesOfNode(currentTree.value);

  expandPreviouslyExpandedElements(currentTree.value.children as Array<GuiEditorTreeNode>);

  return currentTree.value;
}

/**
 * Calculate the children of all nodes that are expanded.
 * @param nodes initial nodes
 */
function expandPreviouslyExpandedElements(nodes: Array<GuiEditorTreeNode>) {
  for (const node of nodes) {
    const expanded = currentExpandedElements.value[pathToString(node.data.absolutePath)] ?? false;
    if (expanded) {
      node.children = treeNodeResolver.createChildNodesOfNode(node);
      if (node.children && node.children.length > 0) {
        expandPreviouslyExpandedElements(node.children as Array<GuiEditorTreeNode>);
      }
    }
  }
}

function updateTree() {
  loading.value = true;
  window.setTimeout(() => {
    nodesToDisplay.value = computeTree().children;
    loading.value = false;
  }, 0);
}

const nodesToDisplay: Ref<TreeNode[]> = ref(computeTree().children);

watch(storeToRefs(useSessionStore()).fileSchema, () => {
  currentExpandedElements.value = {};
  updateTree();
});

// recalculate the tree when the data structure changes, but not
// single values (e.g. when a property is changed)
watch(storeToRefs(useSessionStore()).fileData, (value, oldValue) => {
  /*if (!isObjectStructureEqual(value, oldValue)) { */ // currently not working as expected
  updateTree();
  /*}*/
});

function updateData(subPath: Path, newValue: any) {
  const completePath = props.currentPath.concat(subPath);
  emit('update_data', completePath, newValue);
}
function clickedPropertyData(nodeData: ConfigTreeNodeData) {
  const path = nodeData.absolutePath;
  if (useSessionStore().dataAtPath(path) != undefined) {
    emit('select_path', path);
  }
}

function removeProperty(subPath: Path) {
  const completePath = props.currentPath.concat(subPath);
  const parentPath = completePath.slice(0, -1);
  const propertyName = completePath.slice(completePath.length - 1);
  const dataAtParentPath = dataAt(parentPath, props.currentData) ?? {};
  delete dataAtParentPath[propertyName];
  updateData(parentPath, dataAtParentPath);

  emit('remove_property', completePath);
  updateTree();
}

function replacePropertyName(parentPath: Path, oldName: string, newName: string, oldData) {
  const dataAtParentPath = dataAt(parentPath, props.currentData) ?? {};

  if (oldData === undefined) {
    oldData = initializeNewProperty(parentPath, newName);
  } else {
    delete dataAtParentPath[oldName];
  }

  dataAtParentPath[newName] = oldData;

  updateData(parentPath, dataAtParentPath);
}

function initializeNewProperty(parentPath: Path, name: string): any {
  const schema = props.currentSchema.subSchemaAt(parentPath.concat([name]));
  return schema?.initialValue();
}

function updatePropertyName(subPath: Path, oldName, newName: string) {
  const oldData = dataAt(subPath, props.currentData);
  const parentPath = subPath.slice(0, -1);

  replacePropertyName(parentPath, oldName, newName, oldData);
  updateTree();
  const newRelativePath = parentPath.concat([newName]);
  const newAbsolutePath = props.currentPath.concat(newRelativePath);
  focusOnPath(newAbsolutePath);
  const subSchema = props.currentSchema.subSchemaAt(newRelativePath);
  if (subSchema?.hasType('object') || subSchema?.hasType('array')) {
    useSessionStore().expand(newAbsolutePath);

    window.setTimeout(() => {
      focusOnFirstProperty(newRelativePath);
    }, 0);
    return;
  }
}

function addItem(relativePath: Path, newValue: any) {
  updateData(relativePath, newValue);
  updateTree();
  const absolutePath = props.currentPath.concat(relativePath);

  const subSchema = props.currentSchema.subSchemaAt(relativePath);
  if (subSchema?.hasType('object') || subSchema?.hasType('array')) {
    useSessionStore().expand(absolutePath);

    window.setTimeout(() => {
      focusOnFirstProperty(relativePath);
    }, 0);
    return;
  }

  // focus on "add item" element (which id is the path of the array + 1
  // on the last element of the path)
  const pathToAddItem = relativePath.slice(0, -1).concat(relativePath[relativePath.length - 1] + 1);
  focusOnPath(props.currentPath.concat(pathToAddItem));
}

/**
 * Focus on the first property of the current tree or the first property of the given relative path.
 * @param relativePath the relative path to the property to focus on
 */
function focusOnFirstProperty(relativePath?: Path) {
  let pathToFirstProperty = currentTree.value.children[0]?.data?.absolutePath;

  if (relativePath) {
    const node = findNode(relativePath);
    if (node) {
      pathToFirstProperty = node.children[0]?.data?.absolutePath;
    }
  }
  if (pathToFirstProperty) {
    focusOnPath(pathToFirstProperty);
  }
}

/**
 * Find a node in the current tree by its relative path.
 * @param relativePath the relative path of the node to find
 * @param root the root of the tree to search in
 */
function findNode(relativePath, root = currentTree.value) {
  const absolutePath = pathToString(props.currentPath.concat(relativePath));
  if (root.key === absolutePath) {
    return root;
  }

  for (const child of root.children) {
    const foundNode = findNode(relativePath, child);
    if (foundNode) {
      return foundNode;
    }
  }
  return undefined;
}

/**
 * Function for adding an empty value to an array.
 * This function is called when the user clicks on the "add item" button.
 */
function addEmptyArrayEntry(relativePath: Path) {
  const arraySchema = props.currentSchema.subSchemaAt(relativePath.slice(0, -1));

  if (!arraySchema?.items) {
    // TODO: handle this case
    addItem(relativePath, '');
  }
  addItem(relativePath, arraySchema?.items?.initialValue());
}

function addEmptyProperty(relativePath: Path, absolutePath: Path) {
  allowShowOverlay.value = false;
  const objectSchema = props.currentSchema.subSchemaAt(relativePath);

  const dataAtParentPath = dataAt(relativePath.slice(0, -1), props.currentData);
  const name = findNameForNewProperty(objectSchema, dataAtParentPath);

  // insert a new node in the tree
  const objectNode = findNode(relativePath);
  const treeData: ConfigTreeNodeData = {
    absolutePath: absolutePath.concat(name),
    relativePath: relativePath.concat(name),
    schema: new JsonSchema({}),
    parentSchema: objectSchema,
    depth: ((objectNode?.data?.depth as number) ?? 0) + 1,
    name: name,
  };
  const nodeToInsert: GuiEditorTreeNode = {
    type: TreeNodeType.ADDITIONAL_PROPERTY!!,
    key: pathToString(absolutePath.concat(name)),
    data: treeData,
    leaf: true,
    children: [],
  } as GuiEditorTreeNode;

  // insert the new node before the "add property" node
  const indexOfAddPropertyNode = objectNode.children.length - 1;
  objectNode.children.splice(indexOfAddPropertyNode, 0, nodeToInsert);

  if (nodeToInsert.key) {
    const id = '_label_' + nodeToInsert.key;
    focus(id);
    selectContents(id);
  }
}

function findNameForNewProperty(objectSchema: JsonSchema | undefined, data: any) {
  if (objectSchema === undefined) {
    return 'newProperty';
  }

  const existingProperties = Object.keys(data);
  let index = 1;
  let name = 'newProperty';
  while (existingProperties.includes(name)) {
    name = `newProperty${index}`;
    index++;
  }
  return name;
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

watch(storeToRefs(useSessionStore()).currentPath, () => {
  updateTree();
  focusOnFirstProperty();
});

function displayAsRegularProperty(node: any) {
  return (
    node.type === TreeNodeType.PATTERN_PROPERTY ||
    node.type === TreeNodeType.SCHEMA_PROPERTY ||
    node.type === TreeNodeType.ADDITIONAL_PROPERTY
  );
}

function expandElement(node: any) {
  currentExpandedElements.value[node.key] = true;
  node.children = treeNodeResolver.createChildNodesOfNode(node);
  expandPreviouslyExpandedElements(node.children as Array<GuiEditorTreeNode>);
}

const schemaInfoOverlay = ref<InstanceType<typeof SchemaInfoOverlay> | undefined>();
const allowShowOverlay = ref(true);
const overlayShowScheduled = ref(false);

const showInfoOverlayPanelInstantly = (nodeData: ConfigTreeNodeData, event: MouseEvent) => {
  const relevantErrors = useSessionStore().dataValidationResults.filterForExactPath(
    pathToJsonPointer(nodeData.absolutePath)
  ).errors;
  // @ts-ignore
  schemaInfoOverlay.value?.showPanel(
    nodeData.schema,
    nodeData.name,
    nodeData.parentSchema,
    relevantErrors,
    event
  );
};
const showInfoOverlayPanelDebounced = useDebounceFn((nodeData: ConfigTreeNodeData, event) => {
  if (allowShowOverlay.value && overlayShowScheduled.value) {
    showInfoOverlayPanelInstantly(nodeData, event);
  }
}, 1000);

function showInfoOverlayPanel(nodeData: ConfigTreeNodeData, event) {
  overlayShowScheduled.value = true;
  showInfoOverlayPanelDebounced(nodeData, event);
}

const closeInfoOverlayPanelDebounced = useDebounceFn(() => {
  // @ts-ignore
  schemaInfoOverlay.value?.closePanel();
}, 100);

function closeInfoOverlayPanel() {
  overlayShowScheduled.value = false;
  closeInfoOverlayPanelDebounced();
}

/**
 * Returns true if the node or any of its children is highlighted.
 */
function isHighlighted(node: ConfigDataTreeNode) {
  return useSessionStore()
    .currentSearchResults.map(searchResult => searchResult.path)
    .map(path => pathToString(path))
    .some(path => node.key && path.startsWith(node.key));
}

function getValidationResults(absolutePath: Path) {
  return useSessionStore().dataValidationResults.filterForPath(pathToJsonPointer(absolutePath));
}
</script>

<template>
  <SchemaInfoOverlay ref="schemaInfoOverlay" @hide="overlayShowScheduled = false" />
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
    :loading="loadingDebounced"
    :expandedKeys="currentExpandedElements"
    @nodeExpand="expandElement"
    @nodeCollapse="node => delete currentExpandedElements[node.key]"
    :filters="treeTableFilters">
    <Column field="name" header="Property" :sortable="true" expander>
      <template #body="slotProps">
        <!-- data nodes, note: wrapping in another span breaks the styling completely -->
        <span
          v-if="displayAsRegularProperty(slotProps.node)"
          style="width: 50%; min-width: 50%"
          :style="addNegativeMarginForTableStyle(slotProps.node.data.depth)"
          @mouseenter="event => showInfoOverlayPanel(slotProps.node.data, event)"
          @mouseleave="closeInfoOverlayPanel">
          <PropertyMetadata
            :validationResults="getValidationResults(slotProps.node.data.absolutePath)"
            :node="slotProps.node"
            :type="slotProps.node.type"
            :highlighted="isHighlighted(slotProps.node)"
            @zoom_into_path="path_to_add => $emit('zoom_into_path', path_to_add)"
            @update_property_name="
              (oldName, newName) =>
                updatePropertyName(slotProps.node.data.relativePath, oldName, newName)
            "
            @start_editing_property_name="() => (allowShowOverlay = false)"
            @stop_editing_property_name="() => (allowShowOverlay = true)" />
        </span>

        <span v-if="displayAsRegularProperty(slotProps.node)" style="max-width: 50%" class="w-full">
          <PropertyData
            class="w-full"
            :nodeData="slotProps.node.data"
            @update_property_value="updateData"
            @remove_property="removeProperty"
            @update_tree="updateTree"
            @click="() => clickedPropertyData(slotProps.node.data)"
            bodyClass="w-full"
            @keydown.ctrl.i="event => showInfoOverlayPanelInstantly(slotProps.node.data, event)" />
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
            @click="addEmptyArrayEntry(slotProps.node.data.relativePath)"
            @keyup.enter="addEmptyArrayEntry(slotProps.node.data.relativePath)">
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

        <span
          v-if="slotProps.node.type === TreeNodeType.ADD_PROPERTY"
          style="width: 50%; min-width: 50%"
          :style="addNegativeMarginForTableStyle(slotProps.node.data.depth)">
          <Button
            text
            severity="secondary"
            class="text-gray-500"
            style="margin-left: -1.5rem"
            @click="
              addEmptyProperty(slotProps.node.data.relativePath, slotProps.node.data.absolutePath)
            "
            @keyup.enter="
              addEmptyProperty(slotProps.node.data.relativePath, slotProps.node.data.absolutePath)
            ">
            <i class="pi pi-plus" />
            <span class="pl-2">New property</span>
          </Button>
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
