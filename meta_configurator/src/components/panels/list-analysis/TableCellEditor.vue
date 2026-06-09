<script setup lang="ts">
import type {ConfigTreeNodeData} from '@/components/panels/gui-editor/configDataTreeNode';
import {resolveCorrespondingComponent} from '@/components/panels/gui-editor/resolveCorrespondingComponent';
import {getDataForMode, getValidationForMode} from '@/data/useDataLink';
import type {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import type {Path} from '@/utility/path';
import type {SessionMode} from '@/store/sessionMode';
import type {ValidationResult} from '@/schema/validationUtils';
import {computed} from 'vue';

const props = defineProps<{
  value: any;
  schema: JsonSchemaWrapper;
  absolutePath: Path;
  sessionMode: SessionMode;
}>();

const data = getDataForMode(props.sessionMode);

const nodeData = computed<ConfigTreeNodeData>(() => ({
  name: props.absolutePath[props.absolutePath.length - 1] ?? '',
  schema: props.schema,
  absolutePath: props.absolutePath,
  relativePath: props.absolutePath,
  depth: props.absolutePath.length,
}));

const validationResults = computed<ValidationResult>(() => {
  return getValidationForMode(props.sessionMode).currentValidationResult.value.filterForPath(
    props.absolutePath
  );
});

function normalizeValueForSchema(schema: JsonSchemaWrapper, value: any): any {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  if (schema.hasType('number') || schema.hasType('integer')) {
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? value : numericValue;
  }

  return value;
}

function updateStore(newValue: any) {
  const normalizedValue = normalizeValueForSchema(props.schema, newValue);
  data.setDataAt(props.absolutePath, normalizedValue);
}
</script>

<template>
  <div class="table-cell-editor">
    <Component
      :is="resolveCorrespondingComponent(nodeData, props.sessionMode)"
      :sessionMode="props.sessionMode"
      :propertyName="nodeData.name"
      :propertyData="props.value"
      :propertySchema="props.schema"
      :validationResults="validationResults"
      @update:propertyData="updateStore" />
  </div>
</template>

<style scoped>
.table-cell-editor {
  width: 100%;
}
</style>
