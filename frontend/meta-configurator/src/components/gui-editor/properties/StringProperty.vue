<script setup lang="ts">

import {JsonSchema} from "@/schema/JsonSchema";
import InputText from 'primevue/inputtext';
import {computed} from "vue";
import {dataStore} from "@/stores/dataStore";

const dataStoreInstance = dataStore();

const props = defineProps<{
    propertyName: string;
    propertyData: string;
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

    <InputText type="text" v-model="valueProperty"></InputText>

</template>


<style scoped>

</style>