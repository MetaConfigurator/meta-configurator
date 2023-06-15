<script setup lang="ts">

import {JsonSchema} from "@/schema/JsonSchema";
import InputText from 'primevue/inputtext';

const props = defineProps<{
    propertyName: string;
    propertyData: string;
}>();



</script>


<template>

    <InputText v-bind="propertyData"/>

</template>


<style scoped>

</style>