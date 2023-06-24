<script setup lang="ts">
import {computed, ref} from 'vue';
import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';

import type {JsonSchema} from '@/schema/JsonSchema';
import PropertyComponent from '@/components/gui_editor/EditPropertyComponent.vue';
import PropertyMetadata from '@/components/gui_editor/PropertyMetadata.vue';
import {SchemaTreeNodeResolver} from '@/schema/SchemaTreeNodeResolver';
import {GuiConstants} from "@/constants";

const props = defineProps<{
  currentSchema: JsonSchema;
  currentData: any;
  currentPath: Array<string | number>;
}>();

const emit = defineEmits<{
  (e: 'update_current_path', new_path: Array<string | number>): void;
  (e: 'expand_current_path', path_to_add: Array<string | number>): void;
  (e: 'update_data', path: Array<string | number>, newValue: any): void;
}>();

function isArray(): boolean {
  return props.currentSchema.hasType('array') && Array.isArray(props.currentData);
}

const propertiesToDisplay: ref<Record<string | number, JsonSchema>> = computed(() => {
  // TODO this logic should be part of the TreeNodeResolver.
  // TODO: consider properties of data, i.e., additionalProperties, patternProperties.
  if (isArray()) {
    return Object.fromEntries(
      props.currentData.map((_, index: number) => [index, props.currentSchema.items])
    );
  }
  return props.currentSchema.properties;
});

function updateData(subPath: Array<string | number>, newValue: any) {
  const completePath = props.currentPath.concat(subPath);
  emit('update_data', completePath, newValue);
}

const treeNodeResolver = new SchemaTreeNodeResolver(() => props.currentData, GuiConstants.DEPTH_LIMIT);

const nodesToDisplay = computed(() => {
  return Object.entries(propertiesToDisplay.value).map(([key, value]) => {
    if (isArray()) {
      // cast is required because record properties are always interpreted as strings
      return treeNodeResolver.createTreeNodeOfProperty(Number(key), value, props.currentSchema);
    }
    return treeNodeResolver.createTreeNodeOfProperty(key, value, props.currentSchema);
  });
});

const filters = ref<Record<string, string>>({});
</script>

<template>
  <TreeTable
    :value="nodesToDisplay"
    filter-mode="lenient"
    removable-sort
    class="p-treetable-sm overflow-auto"
    resizable-columns
    scrollable
    scroll-direction="vertical"
    row-hover
    :filters="filters">
    <!-- Filter field -->
    <template #header>
      <div class="text-left">
        <div class="p-input-icon-left w-full">
          <i class="pi pi-search" />
          <InputText
            v-model="filters['global']"
            placeholder="Search for properties or data"
            class="h-8 w-80" />
        </div>
      </div>
    </template>
    <Column field="name" header="Property" sortable="true" expander>
      <template #body="slotProps">
        <PropertyMetadata
          :metadata="slotProps.node.data"
          @expand_current_path="path_to_add => $emit('expand_current_path', path_to_add)" />
      </template>
    </Column>
    <Column field="data" header="Data">
      <template #body="slotProps">
        <PropertyComponent :metadata="slotProps.node.data" @update_property_value="updateData" />
      </template>
    </Column>
  </TreeTable>
</template>

<style scoped></style>
