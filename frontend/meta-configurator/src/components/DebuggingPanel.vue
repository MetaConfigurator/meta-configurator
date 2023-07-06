<script setup lang="ts">
import {computed} from "vue";
import {useSessionStore} from "@/store/sessionStore";
import {useDataStore} from "@/store/dataStore";


const store = useSessionStore();


const textContent = computed (() => getConfigText());
const schemaContent = computed (() => getSchema());
const schemaContentDataStore = computed (() => getSchemaDataStore());
const dataAtCurrentPathContent = computed (() => getDataAtCurrentPath());



function getConfigText() {
    return JSON.stringify(store.fileData);
}


function getSchema() {
    return JSON.stringify(store.fileSchema);
}
function getSchemaDataStore() {
    return JSON.stringify(useDataStore().schemaData);
}
function getDataAtCurrentPath() {
    return JSON.stringify(store.dataAtCurrentPath);
}




</script>


<template>



    <textarea class=" bg-amber-300" v-model="store.currentMode"/>
    <textarea class=" bg-amber-300" v-model="textContent"/>
    <textarea class=" bg-amber-300" v-model="schemaContent"/>
    <textarea class=" bg-amber-300" v-model="dataAtCurrentPathContent"/>
    <textarea class=" bg-amber-300" v-model="schemaContentDataStore"/>



</template>

<style scoped>

</style>