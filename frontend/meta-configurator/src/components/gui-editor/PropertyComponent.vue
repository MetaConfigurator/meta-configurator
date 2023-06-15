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
}>();


function resolveCorrespondingComponent() : VNode {
    console.log("Type of " + props.propertyName + " is ")
    console.log(props.propertySchema.type)
    if (props.propertySchema.hasType("boolean")) {
        return h(BooleanProperty, {propertyName: props.propertyName, propertyData : props.propertyData})

    } else if (props.propertySchema.hasType("string")) {
        return h(StringProperty, {propertyName: props.propertyName, propertyData : props.propertyData})
    }

    return h(BooleanProperty, {propertyName: "fallback", propertyData: true})
}

</script>


<template>


  <div>{{ propertyName }}</div>
  <Component :is="resolveCorrespondingComponent()"></Component>

</template>


<style scoped>

</style>