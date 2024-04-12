<!--
This component is used to display the schema description in a popup.
It exposes the following functions:
- showPanel(schema: JsonSchema, propertyName: string, parentSchema: JsonSchema, event: Event): void
  - Shows the panel with the given schema description
- closePanel(): void
  - Closes the panel
It emits the following events:
- hide: void
  - Emitted when the panel is closed
-->
<script setup lang="ts">
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import OverlayPanel from 'primevue/overlaypanel';
import {computed, Ref, ref} from 'vue';
import {describeSchema} from '@/schema/schemaDescriptor';
import type {ErrorObject} from 'ajv';
import {useCurrentSchema} from '@/data/useDataLink';

const schemaRef: Ref<JsonSchemaWrapper | undefined> = ref();
const propertyNameRef: Ref<String> = ref('');
const parentSchemaRef: Ref<JsonSchemaWrapper | undefined> = ref();
const validationErrorsRef: Ref<ErrorObject[]> = ref([]);

const schemaDescription = computed(() =>
  describeSchema(
    schemaRef.value ??
      new JsonSchemaWrapper(true, useCurrentSchema().schemaPreprocessed.value, false),
    propertyNameRef.value,
    parentSchemaRef.value,
    true,
    0,
    validationErrorsRef.value
  )
);

const panelRef = ref();
/**
 * Whether the panel should stay open, because the mouse is over it
 * This can be useful if the user wants to copy something from the panel
 * or if we put clickable links in the panel
 */
const keepOpen = ref(false);

const showPanel = (
  schema: JsonSchemaWrapper,
  propertyName: string,
  parentSchema: JsonSchemaWrapper,
  validationErrors: ErrorObject[],
  event
) => {
  schemaRef.value = schema;
  propertyNameRef.value = propertyName;
  parentSchemaRef.value = parentSchema;
  validationErrorsRef.value = validationErrors;
  panelRef.value.show(event, event.target);
};

const closePanel = () => {
  if (!keepOpen.value) {
    panelRef.value.hide();
  }
};

defineExpose({showPanel: showPanel, closePanel: closePanel});

defineEmits<{hide: void}>();
</script>

<template>
  <OverlayPanel
    ref="panelRef"
    style="max-height: 30vmax"
    class="w-1/3 leading-normal"
    :showCloseIcon="true"
    @keydown.esc="closePanel"
    @mouseenter="keepOpen = true"
    @hide="$emit('hide')"
    @mouseleave="
      keepOpen = false;
      closePanel();
    ">
    <div
      v-html="schemaDescription"
      class="overflow-y-auto whitespace-pre-line"
      style="max-height: 28vmax"></div>
  </OverlayPanel>
</template>

<style scoped></style>
