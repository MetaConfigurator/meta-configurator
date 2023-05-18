<script lang='ts' setup>
import type { SideMenuController } from '@/components/side-menu/SideMenu';

defineProps<{
  menu: SideMenuController;
}>();
</script>

<template>
  <div :class="{'w-16': !menu.open, 'w-96': menu.open}"
       class='rounded-r bg-slate-100 flex items-start h-full transition-all duration-300'>
    <div class='flex flex-col items-start w-full h-full'>
      <!-- header of sidebar -->
      <div
        class='flex flex-row justify-start items-center space-x-3 cursor-pointer bg-slate-500 text-white w-full h-16'
        @click='menu.toggle()'>
        <div class='w-16 flex justify-center'>
          <!-- three horizontal lines icon -->
          <svg class='w-10 h-10 hover:scale-110 ' fill='currentColor' viewBox='0 0 24 24'
               xmlns='http://www.w3.org/2000/svg'>
            <path clip-rule='evenodd'
                  d='M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z'
                  fill-rule='evenodd' />
          </svg>
        </div>

        <h3 v-if='menu.open' class='text-2xl font-bold truncate'>Meta Configurator</h3>
      </div>

      <!-- menu items -->
      <div v-for='(item, index) in menu.menuItems' v-bind:key='item.name'
           :class='{"underline decoration-purple-400 underline-offset-4 font-bold": menu.isSelectedItem(index)}'
           class='flex flex-col items-start justify-start w-full text-gray-500 cursor-pointer h-12'
           @click='menu.selectItem(index)'>

        <div class='flex flex-row items-center space-x-3 py-4 hover:scale-105 hover:text-gray-900'>
          <!-- the menu item, selected item is highlighted -->
          <div class='w-16 flex justify-center'>
              <span :class='{"bg-slate-400 text-white": menu.isSelectedItem(index)}'
                    class='p-2 rounded-xl'
                    v-html='item.icon'></span>
          </div>
          <h2 v-if='menu.open'> {{ item.name }}</h2>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>

</style>
