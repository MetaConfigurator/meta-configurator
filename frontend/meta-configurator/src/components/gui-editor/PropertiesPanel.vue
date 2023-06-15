<script setup lang="ts">
import { computed, ref } from "vue";
import IconExpand from "@/components/icons/IconExpand.vue";
import ChevronRight from "@/components/icons/ChevronRight.vue";
import type { JsonSchema } from "@/schema/JsonSchema";
import PropertyComponent from "@/components/gui-editor/PropertyComponent.vue";

const props = defineProps<{
  currentSchema: JsonSchema;
  currentData: any;
  currentPath: Array<string | number>
}>();

const emit = defineEmits<{
  (e: 'update_current_path', new_path: Array<string | number>): void;
    (e: 'update_data', path: Array<string | number>, newValue: any): void;
}>();

const expandedPropertyKeys = ref<string[]>([]);

const propertiesToDisplay = computed(() => {
  // TODO: consider properties of data, i.e., additionalProperties, patternProperties.
  return props.currentSchema.properties;
});

function isExpandable(propertyKey: string): boolean {
  return props.currentSchema.subSchema(propertyKey)?.hasType("object")
    || props.currentSchema.subSchema(propertyKey)?.hasType("array") || false;
}

function isExpanded(propertyKey: string) {
  return expandedPropertyKeys.value.includes(propertyKey);
}

function toggleExpansion(propertyKey: string) {
  if (isExpanded(propertyKey)) {
    expandedPropertyKeys.value.splice(expandedPropertyKeys.value.indexOf(propertyKey), 1);
    return;
  }
  expandedPropertyKeys.value.push(propertyKey);
}

function updateData(propertyKey: string, newValue: any) {
    const completePath = props.currentPath.concat(propertyKey);
    emit('update_data', completePath, newValue);
}

function dataForProperty(propertyKey: string | number) {
    // TODO better logic
    return props.currentData[propertyKey]
}
</script>

<template>
    <TableHeader/>
  <PropertyComponent
          :propertySchema="schema"
          :propertyName="key"
          :propertyPath="currentPath.concat(key)"
          :propertyData="dataForProperty(key)"
          v-for="(schema, key) in propertiesToDisplay"
          @update_property_value="updateData"/>
</template>

<style scoped></style>
