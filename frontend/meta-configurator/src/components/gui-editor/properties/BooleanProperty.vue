<script setup lang="ts">

import {JsonSchema} from "@/schema/JsonSchema";
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import {ref} from "vue";
import {dataStore} from "@/stores/dataStore";

const dataStoreInstance = dataStore()

const props = defineProps<{
    propertyName: string;
    propertyData: boolean;
}>();

const checked = ref(true);

</script>


<template>

    <div>BEGIN OF {{ propertyName }}</div>

    <Checkbox v-model="checked" :binary=true value="propertyName"/>

    <InputText v-bind="propertyData"/>

    <div>END OF {{ propertyName }}</div>



</template>


<style scoped>

</style>