<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import SideMenu from '@/components/side-menu/SideMenu.vue';
import {SideMenuController} from '@/components/side-menu/SideMenu';

const currentFile = ref('config.yaml');

const sideMenuController = reactive(new SideMenuController());
const currentTitle = computed(
    () => sideMenuController.selectedItem.name + ' - ' + currentFile.value
);
</script>
<template>
  <div class="w-screen h-screen flex">

    <SideMenu :menu="sideMenuController"></SideMenu>
    <h1>Welcome in a setting page</h1>

  </div>
</template>
<style scoped>

</style>
