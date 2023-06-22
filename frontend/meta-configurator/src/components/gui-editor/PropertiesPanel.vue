<script setup lang="ts">
import {computed, ref} from 'vue';
import type {JsonSchema} from '@/schema/JsonSchema';
import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import PropertyComponent from '@/components/gui-editor/EditPropertyComponent.vue';
import PropertyMetadata from '@/components/gui-editor/PropertyMetadata.vue';
import {SchemaTreeNodeResolver} from '@/schema/SchemaTreeNodeResolver';

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

const propertiesToDisplay: ref<Record<string, JsonSchema>> = computed(() => {
  // TODO: consider properties of data, i.e., additionalProperties, patternProperties.
  if (props.currentSchema.hasType('array') && Array.isArray(props.currentData)) {
    return Object.fromEntries(props.currentData.map((_, index) => [index, props.currentSchema.items]));
  }
  return props.currentSchema.properties;
});

function updateData(subPath: Array<string | number>, newValue: any) {
  const completePath = props.currentPath.concat(subPath);
  emit('update_data', completePath, newValue);
}

const DEPTH_LIMIT = 2;

const treeNodeResolver = new SchemaTreeNodeResolver(() => props.currentData, DEPTH_LIMIT);

const nodesToDisplay = computed(() => {
  return Object.entries(propertiesToDisplay.value).map(([key, value]) =>
    treeNodeResolver.createTreeNodeOfProperty(key, value, props.currentSchema)
  );
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
