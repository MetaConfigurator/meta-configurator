<script setup lang="ts">

import {JsonSchema} from '@/schema/JsonSchema';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import type {Component, VNode} from 'vue';
import BooleanProperty from '@/components/gui-editor/properties/BooleanProperty.vue';
import {h} from 'vue';
import StringProperty from '@/components/gui-editor/properties/StringProperty.vue';
import IntegerProperty from "@/components/gui-editor/properties/IntegerProperty.vue";
import NumberProperty from "@/components/gui-editor/properties/NumberProperty.vue";


const props = defineProps<{
  propertyName: string;
  propertySchema: JsonSchema;
  propertyData: any;
}>();

const emit = defineEmits<{
  (e: 'update_property_value', propertyName: string, newValue: string): void;
}>();


function resolveCorrespondingComponent() : VNode {
    if (props.propertySchema.hasType("boolean")) {
       return h(BooleanProperty, { propertyName: props.propertyName, propertyData : props.propertyData})
    } else if (props.propertySchema.hasType("string")) {
        const propertyName = props.propertyName
        const propertyData = props.propertyData

        return h(StringProperty, { propertyName: propertyName, propertyData: propertyData});
    } else if (props.propertySchema.hasType("number")) {
        const propertyName = props.propertyName
        const propertyData = props.propertyData
        return h(NumberProperty, { propertyName: propertyName, propertyData : propertyData})
    } else if (props.propertySchema.hasType("integer")) {
        return h(IntegerProperty, { propertyName: props.propertyName, propertyData: props.propertyData})
    }

    return h(StringProperty, {propertyName: propertyName, propertyData: propertyData});
  }


  return h(
    'p',
    `Property ${props.propertyName} with type ${props.propertySchema.type} is not supported`
  );
}

function propagateUpdateEvent(propertyName: string, newValue: any) {
  emit('update_property_value', propertyName, newValue);
}
</script>

<template>
  <div>{{ propertyName }}</div>
  <Component
    :is="resolveCorrespondingComponent()"
    @update_property_value="
      (propertyName, newValue) => propagateUpdateEvent(propertyName, newValue)
    "></Component>
</template>

<style scoped></style>
