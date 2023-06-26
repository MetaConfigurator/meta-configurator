<script setup lang="ts">
import {computed, ref} from 'vue';
import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';

import type {JsonSchema} from '@/model/JsonSchema';
import PropertyData from '@/components/gui-editor/PropertyData.vue';
import PropertyMetadata from '@/components/gui-editor/PropertyMetadata.vue';
import {ConfigTreeNodeResolver} from '@/helpers/ConfigTreeNodeResolver';
import {GuiConstants} from '@/constants';
import type {Path} from '@/model/path';

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
</script>

<template>
  <TreeTable
    :value="nodesToDisplay"
    filter-mode="lenient"
    removable-sort
    class="overflow-auto"
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
        <PropertyMetadata
          :nodeData="slotProps.node.data"
          @zoom_into_path="path_to_add => $emit('zoom_into_path', path_to_add)" />
      </template>
    </Column>
    <Column field="data" header="Data">
      <template #body="slotProps">
        <PropertyData
          :nodeData="slotProps.node.data"
          @update_property_value="updateData"
          class="w-full"
          bodyClass="w-full" />
      </template>
    </Column>
  </TreeTable>
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
</style>
