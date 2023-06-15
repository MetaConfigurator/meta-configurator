<script setup lang="ts">

import {JsonSchema} from "@/schema/JsonSchema";
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import {computed, ref} from "vue";
import {dataStore} from "@/stores/dataStore";

const dataStoreInstance = dataStore()

const props = defineProps<{
    propertyPath: Array<string | number>,
}>();

const valueProperty = computed({
    get() {
        return dataStoreInstance.dataAtPath(props.propertyPath)
    },
    set(newValue) {
        dataStoreInstance.updateDataAtPath(props.propertyPath, newValue)
    }
});

</script>


<template>

    <Checkbox v-model="valueProperty" :binary=true value="propertyName"/>



</template>


<style scoped>

</style>