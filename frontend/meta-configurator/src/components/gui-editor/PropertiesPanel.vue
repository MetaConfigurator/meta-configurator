<script setup lang="ts">
import {computed, ref} from 'vue';
import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import ScrollPanel from 'primevue/scrollpanel';
import Button from 'primevue/button';

import type {JsonSchema} from '@/model/JsonSchema';
import PropertyData from '@/components/gui-editor/PropertyData.vue';
import PropertyMetadata from '@/components/gui-editor/PropertyMetadata.vue';
import {ConfigTreeNodeResolver} from '@/helpers/ConfigTreeNodeResolver';
import {GuiConstants} from '@/constants';
import type {Path} from '@/model/path';
import {TreeNodeType} from '@/model/ConfigDataTreeNode';

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

const treeNodeResolver = new ConfigTreeNodeResolver(
  () => props.currentData,
  GuiConstants.DEPTH_LIMIT
);

const nodesToDisplay = computed(() => {
  return Object.entries(propertiesToDisplay.value).map(([key, value]) => {
    if (isArray()) {
      // Cast is required because record properties are always interpreted as strings
      return treeNodeResolver.createTreeNodeOfProperty(Number(key), value, props.currentSchema);
    }
    return treeNodeResolver.createTreeNodeOfProperty(key, value, props.currentSchema);
  });
});

const treeTableFilters = ref<Record<string, string>>({});

function isArray(): boolean {
  return props.currentSchema.hasType('array') && Array.isArray(props.currentData);
}

const propertiesToDisplay = computed(() => {
  // TODO this logic should be part of the TreeNodeResolver.
  // TODO: consider properties of data, i.e., additionalProperties, patternProperties.
  if (isArray()) {
    return Object.fromEntries(
      props.currentData.map((_, index: number) => [index, props.currentSchema.items])
    );
  }
  return props.currentSchema.properties;
});

function updateData(subPath: Path, newValue: any) {
  const completePath = props.currentPath.concat(subPath);
  emit('update_data', completePath, newValue);
}

function addItem(subPath: Path, newValue: any) {
  updateData(subPath, newValue);
  const pathAsString = props.currentPath.concat(subPath).join('.');
  // focus on the same element (otherwise the focus stays on the "add item" input field)
  window.setTimeout(function () {
    document.getElementById(pathAsString).focus();
  }, 0);
}

/**
 * Function for adding a default value to an array.
 * This function is called when the user clicks on the "add item" button.
 */
function addDefaultValue(subPath: Path) {
  const arraySchema = props.currentSchema.subSchemaAt(subPath.slice(0, -1));

  if (!arraySchema?.items) {
    console.log('addDefaultValue called on array schema without items');
    // TODO: handle this case
    return {};
  }
  if (arraySchema.items.hasType('object')) {
    addItem(subPath, {});
  } else if (arraySchema.items.hasType('array')) {
    addItem(subPath, []);
  } else if (arraySchema.items.hasType('string')) {
    addItem(subPath, '');
  } else if (arraySchema.items.hasType('number')) {
    addItem(subPath, 0);
  } else if (arraySchema.items.hasType('boolean')) {
    addItem(subPath, false);
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
</script>

<template>
  <ScrollPanel class="w-full h-full" style="max-height: 90%">
    <TreeTable
      :value="nodesToDisplay"
      filter-mode="lenient"
      removable-sort
      resizable-columns
      scrollable
      scroll-direction="vertical"
      row-hover
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
            v-if="slotProps.node.type === TreeNodeType.DATA"
            style="width: 50%; min-width: 50%"
            :style="addNegativeMarginForTableStyle(slotProps.node.data.depth)">
            <PropertyMetadata
              :nodeData="slotProps.node.data"
              @zoom_into_path="path_to_add => $emit('zoom_into_path', path_to_add)" />
          </span>

          <span
            v-if="slotProps.node.type === TreeNodeType.DATA"
            style="max-width: 50%"
            class="w-full">
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
              tabindex="-1"
              @click="addDefaultValue(slotProps.node.data.relativePath)">
              <i class="pi pi-plus" />
              <span class="pl-2">Add item...</span>
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
  </ScrollPanel>
</template>

<style scoped>
/* The following lines make the table cells take less space */
:deep(.p-treetable-tbody > tr > td) {
  padding: 0.25rem 0.5rem;
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
