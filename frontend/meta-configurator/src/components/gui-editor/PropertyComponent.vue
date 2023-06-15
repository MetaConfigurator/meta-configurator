<script setup lang="ts">

import {JsonSchema} from "@/schema/JsonSchema";
import Button from "primevue/button"
import InputText from "primevue/inputtext"
import type {Component, VNode} from "vue";
import BooleanProperty from "@/components/gui-editor/properties/BooleanProperty.vue";
import {h} from "vue";
import StringProperty from "@/components/gui-editor/properties/StringProperty.vue";

const props = defineProps<{
    propertyName: string;
    propertySchema: JsonSchema;
    propertyData: any;
    propertyPath: Array<string | number>
}>();


function resolveCorrespondingComponent() : VNode {
    if (props.propertySchema.hasType("boolean")) {
       return h(BooleanProperty, {propertyPath: props.propertyPath, propertyName: props.propertyName, propertyData : props.propertyData})
    } else if (props.propertySchema.hasType("string")) {
        const propertyName = props.propertyName
        const propertyData = props.propertyData

        return h(StringProperty, { propertyPath: props.propertyPath, propertyName: propertyName, propertyData: propertyData});
    }

    return h("p", `Property ${props.propertyName} with type ${props.propertySchema.type} is not supported`);
}

</script>


<template>


  <div>{{ propertyName }}</div>
  <Component :is="resolveCorrespondingComponent()"></Component>


</template>


<style scoped>

</style>