<script lang="ts" setup>
import {computed, reactive, ref} from 'vue';
import SideMenu from '@/components/side-menu/SideMenu.vue';
import {SideMenuController} from '@/components/side-menu/SideMenu';
import 'primeicons/primeicons.css';
import ResizePanel from "@/components/icons/ResizePanel.vue";

const currentFile = ref('config.yaml');

const sideMenuController = reactive(new SideMenuController());
const currentTitle = computed(
  () => sideMenuController.selectedItem.name + ' - ' + currentFile.value
);
</script>

<template>
  <div class="w-screen h-screen flex">
    <!-- collapsible sidebar -->
    <SideMenu :menu="sideMenuController"></SideMenu>

    <header></header>
    <main class="flex flex-col w-full h-full">
      <!-- toolbar -->
      <div
        class="w-full h-16 bg-slate-100 flex flex-row items-center p-2 px-6 border-b-2 border-gray-600 space-x-6">
        <h2 class="text-3xl text-gray-700" v-html="currentTitle"></h2>

      </div>
      <div class="flex flex-row">
        <ResizePanel></ResizePanel>
      </div>
    </main>
  </div>
</template>

<style scoped></style>
