<!--
This is the heart of the GUI editor.
It contains the tree table that displays the properties of the current path.
It also contains the logic for adding, removing and renaming properties.

TODO: This component is too big. Some of the logic should be moved to other files.
-->
<script setup lang="ts">
import type {Ref} from 'vue';
import {ref, watch} from 'vue';
import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';
import Button from 'primevue/button';

import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import PropertyData from '@/components/gui-editor/PropertyData.vue';
import PropertyMetadata from '@/components/gui-editor/PropertyMetadata.vue';
import {ConfigTreeNodeResolver} from '@/components/gui-editor/configTreeNodeResolver';
import type {Path} from '@/utility/path';
import {GuiConstants} from '@/constants';
import type {
  ConfigTreeNodeData,
  GuiEditorTreeNode,
} from '@/components/gui-editor/configDataTreeNode';
import {TreeNodeType} from '@/components/gui-editor/configDataTreeNode';
import {pathToString} from '@/utility/pathUtils';
import SchemaInfoOverlay from '@/components/gui-editor/SchemaInfoOverlay.vue';
import {refDebounced, useDebounceFn} from '@vueuse/core';
import type {TreeNode} from 'primevue/tree';
import {focus, focusOnPath, makeEditableAndSelectContents} from '@/utility/focusUtils';
import {
  getDataForMode,
  getSchemaForMode,
  getSessionForMode,
  getValidationForMode,
} from '@/data/useDataLink';
import {dataAt} from '@/utility/resolveDataAtPath';
import type {SessionMode} from '@/store/sessionMode';

const props = defineProps<{
  currentSchema: JsonSchemaWrapper;
  sessionMode: SessionMode;
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

const session = getSessionForMode(props.sessionMode);
const data = getDataForMode(props.sessionMode);

// scroll to the current selected element when it changes
watch(
  session.currentSelectedElement,
  () => {
    const absolutePath = session.currentSelectedElement.value;
    const pathToCutOff = session.currentPath.value;
    const relativePath = absolutePath.slice(pathToCutOff.length);
    if (relativePath.length > 0) {
      // cut off last element, because we want to expand until last element, but not expand children of last element
      const relativePathToExpand = relativePath.slice(0, relativePath.length - 1);
      expandElementsByPath(relativePathToExpand);
    }
    scrollToPath(absolutePath);
  },
  {deep: true}
);

// update tree when the file schema changes
watch(getSchemaForMode(props.sessionMode).schemaWrapper, () => {
  updateTree();
});

// update tree when the current path changes
watch(session.currentPath, () => {
  updateTree();
  focusOnFirstProperty();
  allowShowOverlay.value = true; // reset in case the user was editing a property name
});

const treeNodeResolver = new ConfigTreeNodeResolver();

const loading = ref(false);
const loadingDebounced = refDebounced(loading, 100);

const treeTableFilters = ref<Record<string, string>>({});

const currentTree = ref<GuiEditorTreeNode>();

/**
 * Compute the tree that should be displayed and expand all nodes that were expanded before.
 */
function computeTree() {
  currentTree.value = treeNodeResolver.createTreeNodeOfProperty(
    props.sessionMode,
    props.currentSchema,
    undefined,
    props.currentPath
  );
  currentTree.value!.children = treeNodeResolver.createChildNodesOfNode(
    props.sessionMode,
    currentTree.value!
  );

  expandPreviouslyExpandedElements(currentTree.value!.children as Array<GuiEditorTreeNode>);

  return currentTree.value!;
}

/**
 * Calculate the children of all nodes that are expanded.
 * @param nodes initial nodes
 */
function expandPreviouslyExpandedElements(nodes: Array<GuiEditorTreeNode>) {
  for (const node of nodes) {
    const expanded = session.currentExpandedElements.value[node.key] ?? false;
    if (expanded) {
      node.children = treeNodeResolver.createChildNodesOfNode(props.sessionMode, node);
      if (node.children && node.children.length > 0) {
        expandPreviouslyExpandedElements(node.children as Array<GuiEditorTreeNode>);
      }
    }
  }
}

/**
 * Update the tree and the nodes to display.
 */
function updateTree() {
  loading.value = true;
  window.setTimeout(() => {
    nodesToDisplay.value = determineNodesToDisplay(computeTree());
    loading.value = false;
  }, 0);
}

const nodesToDisplay: Ref<TreeNode[]> = ref(determineNodesToDisplay(computeTree()));

/**
 * Determine the nodes that should be displayed in the tree.
 * If the root node has anyOf or oneOf or a type union, the root node is displayed.
 * If the root node is an object or array, the children of the root node are displayed.
 * Otherwise, the root node is displayed.
 * This way, the tree is displayed in a way that makes sense for the user.
 * Displaying the root node for objects and arrays would be redundant.
 */
function determineNodesToDisplay(root: TreeNode): TreeNode[] {
  const rootSchema = root?.data?.schema;
  if (!rootSchema) {
    return [];
  }
  if (rootSchema.anyOf?.length > 0 || rootSchema.oneOf?.length > 0 || rootSchema.type.length > 1) {
    return [root];
  }
  if (rootSchema.hasType('object') || rootSchema.hasType('array')) {
    return root.children ?? [];
  }
  return [root];
}

/**
 * Emits an event to update the data at the given path.
 */
function updateData(subPath: Path, newValue: any) {
  const completePath = props.currentPath.concat(subPath);
  emit('update_data', completePath, newValue);
  updateTree();
}

function clickedPropertyData(nodeData: ConfigTreeNodeData) {
  const path = nodeData.absolutePath;
  if (data.dataAt(path) != undefined) {
    emit('select_path', path);
  }
}

function removeProperty(subPath: Path) {
  const completePath = props.currentPath.concat(subPath);
  emit('remove_property', completePath);
  updateTree();
}

function replacePropertyName(parentPath: Path, oldName: string, newName: string, oldData: any) {
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

function updatePropertyName(subPath: Path, oldName: string, newName: string) {
  const oldData = dataAt(subPath, props.currentData);
  const parentPath = subPath.slice(0, -1);

  replacePropertyName(parentPath, oldName, newName, oldData);
  updateTree();
  const newRelativePath = parentPath.concat([newName]);
  const newAbsolutePath = props.currentPath.concat(newRelativePath);
  focusOnPath(newAbsolutePath);
  const subSchema = props.currentSchema.subSchemaAt(newRelativePath);
  if (subSchema?.hasType('object') || subSchema?.hasType('array')) {
    session.expand(newAbsolutePath);

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
    session.expand(absolutePath);

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
  let pathToFirstProperty = currentTree.value?.children?.[0]?.data?.absolutePath;

  if (relativePath) {
    const node = findNode(relativePath);
    if (node !== undefined) {
      pathToFirstProperty = node?.children?.[0]?.data?.absolutePath;
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
function findNode(
  relativePath: Path,
  root: GuiEditorTreeNode | undefined = currentTree.value
): GuiEditorTreeNode | undefined {
  const absolutePath = pathToString(props.currentPath.concat(relativePath));
  if (root === undefined) {
    return undefined;
  }

  if (root.key === absolutePath) {
    return root;
  }

  if (root.children === undefined) {
    return undefined;
  }
  for (const child of root.children) {
    const foundNode = findNode(relativePath, child as GuiEditorTreeNode);
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
    addItem(relativePath, '');
  }
  addItem(relativePath, arraySchema?.items?.initialValue());
}

/**
 * Adds a new property to the current object.
 */
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
    schema: new JsonSchemaWrapper({}, props.sessionMode, false),
    parentSchema: objectSchema,
    depth: ((objectNode?.data?.depth as number) ?? 0) + 1,
    name: name,
  };
  const nodeToInsert: GuiEditorTreeNode = {
    type: TreeNodeType.ADDITIONAL_PROPERTY,
    key: pathToString(absolutePath.concat(name)),
    data: treeData,
    leaf: true,
    children: [],
  } as GuiEditorTreeNode;

  // insert the new node before the "add property" node
  const indexOfAddPropertyNode = objectNode!.children!.length - 1;
  objectNode!.children!.splice(indexOfAddPropertyNode, 0, nodeToInsert);

  if (nodeToInsert.key) {
    const id = '_label_' + nodeToInsert.key;
    focus(id);
    makeEditableAndSelectContents(id);
  }
}

function findNameForNewProperty(objectSchema: JsonSchemaWrapper | undefined, data: any) {
  if (objectSchema === undefined || data === undefined) {
    return 'yourNewProperty';
  }

  const existingProperties = Object.keys(data);
  let index = 1;
  let name = 'yourNewProperty';
  while (existingProperties.includes(name)) {
    name = `yourNewProperty${index}`;
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

function displayAsRegularProperty(node: any) {
  return (
    node.type === TreeNodeType.PATTERN_PROPERTY ||
    node.type === TreeNodeType.SCHEMA_PROPERTY ||
    node.type === TreeNodeType.ADDITIONAL_PROPERTY
  );
}

function expandElementsByPath(relativePath: Path) {
  if (relativePath.length == 0) {
    return;
  }

  let currentNode = currentTree.value;

  for (
    let relativePathToExpandLength = 1;
    relativePathToExpandLength <= relativePath.length;
    relativePathToExpandLength++
  ) {
    const relativePathToExpand = relativePath.slice(0, relativePathToExpandLength);
    const absolutePathToExpand = pathToString(props.currentPath.concat(relativePathToExpand));

    let childNodeToExpand = undefined;

    // search child node to expand
    for (const child of currentNode!.children) {
      if (child.key === absolutePathToExpand) {
        childNodeToExpand = child;
        break;
      }
    }
    if (childNodeToExpand === undefined) {
      break;
    }

    expandElementChildren(childNodeToExpand);
    session.expand([childNodeToExpand.key]);

    // update current node, so the next iteration which is one level deeper will use this node to search next child
    currentNode = childNodeToExpand;
  }
}

function scrollToPath(absolutePath: Path) {
  window.setTimeout(() => {
    const element = document.getElementById('_label_' + pathToString(absolutePath));
    if (element) {
      element.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    }
  }, 5);
}

function expandElementChildren(node: any) {
  if (node.type === TreeNodeType.ADVANCED_PROPERTY) {
    return;
  }
  node.children = treeNodeResolver.createChildNodesOfNode(props.sessionMode, node);
  expandPreviouslyExpandedElements(node.children as Array<GuiEditorTreeNode>);
}

const schemaInfoOverlay = ref<InstanceType<typeof SchemaInfoOverlay> | undefined>();
const allowShowOverlay = ref(true);
const overlayShowScheduled = ref(false);

const showInfoOverlayPanelInstantly = (nodeData: ConfigTreeNodeData, event: MouseEvent) => {
  const relevantErrors = getValidationResults(nodeData.absolutePath).errors;
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

function getValidationResults(absolutePath: Path) {
  return getValidationForMode(props.sessionMode).currentValidationResult.value.filterForPath(
    absolutePath
  );
}

function zoomIntoPath(path: Path) {
  // prevent the overlay from showing up when zooming into a path
  // because clicking on the property data would trigger the overlay (because of the mouseenter event)
  overlayShowScheduled.value = false;
  emit('zoom_into_path', path);
}
</script>

<template>
  <SchemaInfoOverlay ref="schemaInfoOverlay" @hide="overlayShowScheduled = false" />
  <TreeTable
    :value="nodesToDisplay"
    class="scroll-pt-16"
    filter-mode="lenient"
    removable-sort
    resizable-columns
    scrollable
    scroll-direction="vertical"
    scroll-height="flex"
    :lazy="true"
    :loading="loadingDebounced"
    v-model:expandedKeys="session.currentExpandedElements.value"
    @nodeExpand="expandElementChildren"
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
            :sessionMode="props.sessionMode"
            :validationResults="getValidationResults(slotProps.node.data.absolutePath)"
            :node="slotProps.node"
            :type="slotProps.node.type"
            :highlighted="session.isNodeHighlighted(slotProps.node)"
            @zoom_into_path="zoomIntoPath"
            @update_property_name="
              (oldName, newName) =>
                updatePropertyName(slotProps.node.data.relativePath, oldName, newName)
            "
            @start_editing_property_name="() => (allowShowOverlay = false)"
            @stop_editing_property_name="() => (allowShowOverlay = true)" />
        </span>

        <!-- data nodes, actual edit fields for the data -->
        <span v-if="displayAsRegularProperty(slotProps.node)" style="max-width: 50%" class="w-full">
          <PropertyData
            class="w-full"
            :nodeData="slotProps.node.data"
            :sessionMode="props.sessionMode"
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
          class="cursor-pointer"
          style="width: 100%; min-width: 50%"
          :style="addNegativeMarginForTableStyle(slotProps.node.data.depth)"
          @click="addEmptyArrayEntry(slotProps.node.data.relativePath)"
          @keyup.enter="addEmptyArrayEntry(slotProps.node.data.relativePath)">
          <Button text severity="secondary" class="text-gray-500" style="margin-left: -1.5rem">
            <i class="pi pi-plus" />
            <span class="pl-2">Add item</span>
          </Button>
        </span>

        <span
          v-if="slotProps.node.type === TreeNodeType.ADD_PROPERTY"
          style="width: 100%; min-width: 50%"
          class="cursor-pointer"
          :style="addNegativeMarginForTableStyle(slotProps.node.data.depth)"
          @click="
            addEmptyProperty(slotProps.node.data.relativePath, slotProps.node.data.absolutePath)
          "
          @keyup.enter="
            addEmptyProperty(slotProps.node.data.relativePath, slotProps.node.data.absolutePath)
          ">
          <Button text severity="secondary" class="text-gray-500" style="margin-left: -1.5rem">
            <i class="pi pi-plus" />
            <span class="pl-2">New property</span>
          </Button>
        </span>

        <span
          v-if="slotProps.node.type === TreeNodeType.ADVANCED_PROPERTY"
          class="text-gray-500"
          style="width: 100%; min-width: 100%"
          :style="addNegativeMarginForTableStyle(slotProps.node.data.depth)">
          Advanced
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
