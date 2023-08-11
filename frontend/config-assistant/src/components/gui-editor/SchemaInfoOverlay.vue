<script setup lang="ts">
import {JsonSchema} from '@/helpers/schema/JsonSchema';
import OverlayPanel from 'primevue/overlaypanel';
import {computed, Ref, ref} from 'vue';
import {describeSchema} from '@/helpers/schema/schemaDescriptor';

const schemaRef: Ref<JsonSchema | undefined> = ref();
const propertyNameRef: Ref<String> = ref('');
const parentSchemaRef: Ref<JsonSchema | undefined> = ref();

const schemaDescription = computed(() =>
  describeSchema(
    schemaRef.value ?? new JsonSchema(true),
    propertyNameRef.value,
    parentSchemaRef.value,
    true
  )
);

const panelRef = ref();
const keepOpen = ref(false);

const showPanel = (schema: JsonSchema, propertyName: string, parentSchema: JsonSchema, event) => {
  schemaRef.value = schema;
  propertyNameRef.value = propertyName;
  parentSchemaRef.value = parentSchema;
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
    <div v-html="schemaDescription" class="overflow-y-auto" style="max-height: 28vmax"></div>
  </OverlayPanel>
</template>

<style scoped></style>
