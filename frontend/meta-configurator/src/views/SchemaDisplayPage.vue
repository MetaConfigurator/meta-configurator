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

    <div class="container">
     <h2>This is Schema page</h2>


    </div>
  </div>
</template>



<style scoped>
.container {
  padding: 20px;
}

pre {
  background-color: #f9f9f9;
  padding: 10px;
  overflow-x: auto;
  font-size: 12px;
}
</style>
